using Grpc.Core;
using SwipeVibesAPI.Grpc;
using Google.Cloud.AIPlatform.V1Beta1;
using System;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Collections.Generic;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace SwipeVibesAPI.Services
{
    public class GeminiGrpcService : GeminiService.GeminiServiceBase
    {
        private readonly PredictionServiceClient _predictionServiceClient;
        private readonly string _vertexAiEndpoint;
        private readonly string _modelId = "gemini-2.0-flash-lite-001";
        private readonly ILogger<GeminiGrpcService> _logger;

        public GeminiGrpcService(
            PredictionServiceClient predictionServiceClient,
            IConfiguration configuration,
            ILogger<GeminiGrpcService> logger)
        {
            _predictionServiceClient = predictionServiceClient;
            _logger = logger;

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
            var genreFilters = request.GenreFilters?.ToList() ?? new List<string>();
            var languageFilters = request.LanguageFilters?.ToList() ?? new List<string>();

            var (systemPrompt, userContent) = BuildGeminiPrompt(request.Interactions, genreFilters, languageFilters);

            _logger.LogInformation("=== GEMINI SYSTEM PROMPT ===\n{SystemPrompt}", systemPrompt);

            var generateRequest = new GenerateContentRequest
            {
                Model = _vertexAiEndpoint,
                SystemInstruction = new Content { Parts = { new Part { Text = systemPrompt } } },
                Contents = { new Content { Role = "user", Parts = { new Part { Text = userContent } } } },
                GenerationConfig = new GenerationConfig
                {
                    Temperature = 0.5f, // Jeszcze niższa temperatura dla lepszego posłuszeństwa
                    TopP = 0.9f,
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
                _logger.LogError(ex, "Gemini API error: {Detail}", ex.Status.Detail);
                throw new RpcException(new Status(ex.StatusCode, $"Gemini API error: {ex.Status.Detail}"));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Internal Server Exception during Gemini request");
                throw new RpcException(new Status(StatusCode.Internal, $"Internal Server Exception: {ex.Message}"));
            }
        }

        private (string SystemPrompt, string UserContent) BuildGeminiPrompt(
            Google.Protobuf.Collections.RepeatedField<InteractionReply> interactions,
            List<string> genreFilters,
            List<string> languageFilters)
        {
            string genreInstruction = genreFilters.Any()
                ? $"* FILTR GATUNKOWY (ABSOLUTNY): {string.Join(", ", genreFilters)}. Ignoruj gatunki z historii, jeśli nie pasują do tego filtra."
                : "* FILTR GATUNKOWY: Brak. Bazuj na guście użytkownika.";

            string languageInstruction = "Brak filtra językowego.";
            string antiBiasInstruction = "";

            if (languageFilters.Any())
            {
                string targetLangs = string.Join(", ", languageFilters);
                languageInstruction = $"* FILTR JĘZYKOWY (KRYTYCZNY): {targetLangs}.";

                antiBiasInstruction = $@"
    !!! UWAGA - PRIORYTET FILTRA !!!
    Użytkownik ustawił ścisły filtr językowy na: {targetLangs}.
    Twoja analiza historii może wykazać, że użytkownik słucha muzyki w innym języku.
    W TAKIM PRZYPADKU MUSISZ CAŁKOWICIE ZIGNOROWAĆ JĘZYK Z HISTORII.
    
    ZASADA KRYTYCZNA:
    Jeśli filtr to '{targetLangs}', to KAŻDY z 10 poleconych artystów MUSI tworzyć w języku '{targetLangs}'.
    Polecenie artysty w innym języku (nawet jeśli pasuje do historii) będzie uznane za błąd.";
            }

            string systemPrompt = $@"Jesteś bezbłędnym DJ-em AI w aplikacji SwipeVibes.
Twoim zadaniem jest wygenerowanie listy 10 artystów muzycznych.

ZASADY FILTROWANIA (Te zasady są nadrzędne wobec analizy gustu):
1.  {genreInstruction}
2.  {languageInstruction}
{antiBiasInstruction}

ANALIZA GUSTU:
1.  Przeanalizuj [Polubione] pod kątem nastroju, BPM i energii.
2.  Dopasuj artystów, którzy mają podobny 'Vibe' co polubione utwory, ALE spełniają powyższe filtry.
3.  **Unikaj powtórzeń:** Nie polecaj artystów, którzy są już na listach [Polubione] lub [Niepolubione].
4.  **Klastry Dislike:** Jeśli użytkownik odrzucił wiele utworów danego typu, nie polecaj tego gatunku.

FORMAT ODPOWIEDZI:
Zwróć TYLKO listę 10 wykonawców.
Jeden wykonawca w jednej linii.
Bez numeracji, bez myślników, bez zbędnych opisów.
Tylko czyste nazwy.

Twoja lista 10 artystów:";

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
                    var trackInfo = $"{interaction.Artist} - {interaction.Title}";
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

            string userContent = $@"== POLUBIONE UTWORY (HISTORY) ==
{likes}
== NIEPOLUBIONE UTWORY (HISTORY) ==
{dislikes}

== WYGENERUJ LISTĘ 10 ARTYSTÓW (FILTR: {(genreFilters.Any() ? string.Join(",", genreFilters) : "Dowolny")}, JĘZYK: {(languageFilters.Any() ? string.Join(",", languageFilters) : "Dowolny")}) ==
";

            return (systemPrompt, userContent);
        }
    }
}