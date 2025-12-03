using Grpc.Core;
using SwipeVibesAPI.Grpc;
using Google.Cloud.AIPlatform.V1Beta1;
using System;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace SwipeVibesAPI.Services
{
    public class GeminiGrpcService : GeminiService.GeminiServiceBase
    {
        private readonly PredictionServiceClient _predictionServiceClient;
        private readonly string _vertexAiEndpoint;
        private readonly string _modelId = "gemini-2.0-flash-lite-001";

        public GeminiGrpcService(PredictionServiceClient predictionServiceClient, IConfiguration configuration)
        {
            _predictionServiceClient = predictionServiceClient;

            var projectId = configuration["GCP:ProjectId"]
                            ?? configuration["GCP__ProjectId"]
                            ?? Environment.GetEnvironmentVariable("GCLOUD_PROJECT");

            if (string.IsNullOrEmpty(projectId))
            {
                throw new InvalidOperationException("GCP Project ID is missing. Set GCP:ProjectId in config or run in Google Cloud environment.");
            }

            var location = configuration["GCP:Location"] ?? "us-central1";

            _vertexAiEndpoint = $"projects/{projectId}/locations/{location}/publishers/google/models/{_modelId}";
        }

        public override async Task<GetGeminiTrackRecommendationResponse> GetGeminiTrackRecommendation(
            GetGeminiTrackRecommendationRequest request, ServerCallContext context)
        {
            var (systemPrompt, userContent) = BuildGeminiPrompt(request.Interactions);

            var generateRequest = new GenerateContentRequest
            {
                Model = _vertexAiEndpoint,
                SystemInstruction = new Content { Parts = { new Part { Text = systemPrompt } } },
                Contents = { new Content { Role = "user", Parts = { new Part { Text = userContent } } } },
                GenerationConfig = new GenerationConfig
                {
                    Temperature = 0.9f,
                    TopP = 1.0f,
                    MaxOutputTokens = 1024
                }
            };

            try
            {
                GenerateContentResponse geminiResponse = await _predictionServiceClient.GenerateContentAsync(generateRequest);

                string recommendationText = geminiResponse.Candidates.FirstOrDefault()?
                                                .Content.Parts.FirstOrDefault()?
                                                .Text.Trim();

                if (string.IsNullOrEmpty(recommendationText))
                {
                    throw new RpcException(new Status(StatusCode.Internal, "Gemini returned empty response"));
                }

                var artistNames = recommendationText.Split(new[] { '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries)
                                                  .Select(name => name.Trim())
                                                  .Where(name => !string.IsNullOrEmpty(name))
                                                  .ToList();

                if (!artistNames.Any())
                {
                    throw new RpcException(new Status(StatusCode.Internal, "Gemini zwróciło pustą listę artystów."));
                }

                var response = new GetGeminiTrackRecommendationResponse();
                response.RecommendedArtistNames.AddRange(artistNames);
                return response;
            }
            catch (global::Grpc.Core.RpcException ex)
            {
                Console.WriteLine($"Gemini API error:: {ex.Status.Detail}");
                throw new RpcException(new Status(ex.StatusCode, $"Gemini API error: {ex.Status.Detail}"));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Internal Server Exception: {ex.Message}");
                throw new RpcException(new Status(StatusCode.Internal, $"Internal Server Exception: {ex.Message}"));
            }
        }

        private (string SystemPrompt, string UserContent) BuildGeminiPrompt(
            Google.Protobuf.Collections.RepeatedField<InteractionReply> interactions)
        {
            string systemPrompt = @"Jesteś ekspertem od rekomendacji muzycznych w aplikacji SwipeVibes.
Twoim zadaniem jest zarekomendować listę 10 artystów pasujących do gustu użytkownika na podstawie listy utworów, które użytkownik polubił i nie polubił.

Twoja analiza musi być dogłębna:
1.  Przeanalizuj listę [Polubione] i [Niepolubione], aby zidentyfikować wspólne wzorce (gatunek, nastrój, energia, BPM, epoka/rok wydania, instrumentacja, styl wokalny, jakość produkcji).
2.  Lista ta zawiera do 200 ostatnio ocenionych utworów. Staraj się polecać artystów, którzy **nie** pojawiają się na tej liście, aby zapewnić różnorodność.
3.  **Faza Odkrywania (poniżej 20 ocen):** Jeśli lista interakcji jest krótka, traktuj to jako 'fazę odkrywania'. Poleć 10 artystów z 10 **szerokich i różnych** gatunków (np. 'Classic Rock', 'Elektronika', 'Jazz', 'Pop', 'Hip-Hop'), aby pomóc szybko zawęzić gust.
4.  **Klastry 'Dislike' są KLUCZOWE:** Jeśli widzisz, że użytkownik konsekwentnie daje 'dislike' utworom o wspólnej cesze (np. ten sam **gatunek**, **niskie BPM/wolne piosenki**, **stare piosenki**, **mocny wokal rapowany**, **produkcja lo-fi**), **AGRESYWNIE UNIKAJ** polecania artystów, którzy pasują do tego negatywnego wzorca.
5.  **Eksploracja vs. Zawężanie (profile powyżej 20 ocen):** Musisz zadecydować, czy użytkownik jest 'Odkrywcą' czy 'Specjalistą'.
    * Przeanalizuj różnorodność gatunkową listy [Polubione].
    * **Jeśli [Polubione] są zróżnicowane (wiele gatunków):** Użytkownik jest 'Odkrywcą'. Zastosuj strategię 8+2: 8 artystów podobnych do polubionych i 2 'odważne strzały' z nowych, ale potencjalnie powiązanych gatunków.
    * **Jeśli [Polubione] są wąskie (jeden/dwa gatunki):** Użytkownik jest 'Specjalistą'. Zastosuj strategię 9+1: 9 artystów BARDZO podobnych (ale nie identycznych) do polubionych i 1 'bezpieczny strzał' z blisko powiązanego podgatunku.

Zawsze zwracaj odpowiedź jako listę 10 artystów. Każdy artysta musi być w nowej, osobnej linii.
Nie dodawaj numerów, myślników, ani żadnego innego tekstu poza nazwami artystów.

---
Przykład Wejścia (nowy użytkownik):
[Polubione]
- Daft Punk - One More Time
[Niepolubione]
- Taylor Swift - Shake It Off

Przykład Wyjścia (nowy użytkownik, faza odkrywania):
Radiohead
Caribou
Massive Attack
Nina Simone
Miles Davis
Fleetwood Mac
Kraftwerk
Herbie Hancock
Amon Tobin
Bon Iver
---
Przykład Wejścia (Wąski gust 'Specjalista' + Klastry Dislike):
[Polubione]
- Kanye West - Flashing Lights
- Kendrick Lamar - HUMBLE.
- A Tribe Called Quest - Can I Kick It?
[Niepolubione]
- Orville Peck - C'mon Baby, Cry (Dislike na Country)
- Johnny Cash - Hurt (Dislike na Country/Folk)
- Taylor Swift - Shake It Off (Dislike na Pop)
- Miles Davis - So What (Dislike na wolny Jazz)

Przykład Wyjścia (Unika Country, Popu i wolnego Jazzu):
J. Cole
Freddie Gibbs
Run The Jewels
Pusha T
Mos Def
Joey Bada$$
Mac Miller
Snoop Dogg
OutKast
D'Angelo
---";

            var likes = new StringBuilder();
            var dislikes = new StringBuilder();

            if (!interactions.Any())
            {
                likes.AppendLine("Brak");
                dislikes.AppendLine("Brak");
            }
            else
            {
                foreach (var interaction in interactions)
                {
                    var trackInfo = $"- {interaction.Artist} - {interaction.Title}";
                    if (interaction.Decision.Equals("like", StringComparison.OrdinalIgnoreCase))
                    {
                        likes.AppendLine(trackInfo);
                    }
                    else if (interaction.Decision.Equals("dislike", StringComparison.OrdinalIgnoreCase))
                    {
                        dislikes.AppendLine(trackInfo);
                    }
                }
                if (likes.Length == 0) likes.AppendLine("Brak");
                if (dislikes.Length == 0) dislikes.AppendLine("Brak");
            }

            string userContent = $@"== POLUBIONE UTWORY ==
{likes}
== NIEPOLUBIONE UTWORY ==
{dislikes}

== TWOJA REKOMENDACJA 10 ARTYSTÓW ==
";

            return (systemPrompt, userContent);
        }
    }
}