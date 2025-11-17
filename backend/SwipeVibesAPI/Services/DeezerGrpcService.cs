using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using Google.Protobuf.WellKnownTypes;
using Grpc.Core;
using Microsoft.Extensions.Logging;
using SwipeVibesAPI.Services;

namespace SwipeVibesAPI.Grpc
{
    internal class FakeServerCallContext : ServerCallContext
    {
        private readonly CancellationToken _cancellationToken;
        protected override CancellationToken CancellationTokenCore => _cancellationToken;

        public FakeServerCallContext(CancellationToken ct)
        {
            _cancellationToken = ct;
        }

        #region not implemented
        protected override Task WriteResponseHeadersAsyncCore(Metadata responseHeaders) => throw new NotImplementedException();
        protected override ContextPropagationToken CreatePropagationTokenCore(ContextPropagationOptions options) => throw new NotImplementedException();
        protected override string MethodCore => "";
        protected override string HostCore => "";
        protected override string PeerCore => "";
        protected override DateTime DeadlineCore => DateTime.MaxValue;
        protected override Metadata RequestHeadersCore => new Metadata();
        protected override Metadata ResponseTrailersCore => new Metadata();
        protected override Status StatusCore { get => Status.DefaultSuccess; set => throw new NotImplementedException(); }
        protected override WriteOptions WriteOptionsCore { get => null; set => throw new NotImplementedException(); }
        protected override AuthContext AuthContextCore => null;
        #endregion
    }

    public class DeezerGrpcService : DeezerService.DeezerServiceBase
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<DeezerGrpcService> _logger;
        private readonly Random _rng = new();

        private readonly UserGrpcService _userSvc;
        private readonly GeminiGrpcService _geminiSvc;

        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNameCaseInsensitive = true,
            NumberHandling = JsonNumberHandling.AllowReadingFromString
        };

        public DeezerGrpcService(
            IHttpClientFactory httpClientFactory,
            ILogger<DeezerGrpcService> logger,
            UserGrpcService userSvc,
            GeminiGrpcService geminiSvc)
        {
            _httpClientFactory = httpClientFactory;
            _logger = logger;
            _userSvc = userSvc;
            _geminiSvc = geminiSvc;
        }

        public override async Task<GetTrackResponse> GetTrack(GetTrackRequest request, ServerCallContext context)
        {
            var api = Client;
            var url = $"track/{request.Id}";

            var dto = await GetAsync<TrackDto>(api, url, context.CancellationToken, treat404AsNull: true);
            if (dto == null)
            {
                throw new RpcException(new Status(StatusCode.NotFound, $"Track {request.Id} not found"));
            }

            return new GetTrackResponse { Track = MapTrack(dto) };
        }

        public async Task<Track> GetAiRecommendedTrackAsync(string userId, CancellationToken ct = default)
        {
            var fakeContext = new FakeServerCallContext(ct);

            var interactionsRequest = new UserInteractionsRequest { UserId = userId };
            var interactionsResponse = await _userSvc.GetUserInteractions(interactionsRequest, fakeContext);

            var recentTrackIds = interactionsResponse.Interactions
                .Select(i => i.DeezerTrackId)
                .ToHashSet();

            if (interactionsResponse.Interactions.Count == 0)
            {
                var trackDto = await GetAsync<TrackDto>(Client, "track/913160312", ct); // Fallback: Blinding Lights
                if (trackDto == null)
                    throw new RpcException(new Status(StatusCode.NotFound, "Fallback track not found."));

                _logger.LogInformation("Użytkownik {UserId} nie ma interakcji, zwrócono utwór domyślny.", userId);
                return MapTrack(trackDto);
            }

            var geminiRequest = new GetGeminiTrackRecommendationRequest();
            geminiRequest.Interactions.AddRange(interactionsResponse.Interactions);
            var geminiResponse = await _geminiSvc.GetGeminiTrackRecommendation(geminiRequest, fakeContext);

            if (!geminiResponse.RecommendedArtistNames.Any())
            {
                throw new RpcException(new Status(StatusCode.Internal, "Gemini nie polecił żadnych artystów."));
            }

            foreach (var recommendedArtistName in geminiResponse.RecommendedArtistNames)
            {
                if (string.IsNullOrWhiteSpace(recommendedArtistName)) continue;

                _logger.LogInformation("Próba znalezienia artysty: {ArtistName}", recommendedArtistName);

                var searchUrl = $"/search/artist?q={Uri.EscapeDataString(recommendedArtistName)}";
                var artistPayload = await GetAsync<ApiList<ArtistDto>>(Client, searchUrl, ct, treat404AsNull: true);

                var artistId = artistPayload?.Data?.FirstOrDefault()?.Id;

                if (artistId == null || artistId == 0)
                {
                    _logger.LogWarning("Rekomendacja Gemini ({ArtistName}) nie zwróciła wyników w Deezer. Próba następnego.", recommendedArtistName);
                    continue;
                }

                var topTracksUrl = $"/artist/{artistId}/top?limit=10";
                var tracksPayload = await GetAsync<ApiList<TrackDto>>(Client, topTracksUrl, ct, treat404AsNull: true);

                if (tracksPayload?.Data == null || !tracksPayload.Data.Any())
                {
                    _logger.LogWarning("Artysta {ArtistName} (ID: {ArtistId}) nie ma top tracków.", recommendedArtistName, artistId);
                    continue;
                }

                var validTracks = tracksPayload.Data
                    .Where(t => !string.IsNullOrWhiteSpace(t.Preview) && !recentTrackIds.Contains(t.Id))
                    .ToList();

                if (!validTracks.Any())
                {
                    _logger.LogWarning("Artysta {ArtistName} (ID: {ArtistId}) nie ma nowych utworów z podglądem. Próba następnego artysty.", recommendedArtistName, artistId);
                    continue;
                }

                var pickedTrackDto = validTracks[_rng.Next(validTracks.Count)];

                _logger.LogInformation("Pomyślnie pobrano rekomendację dla {UserId} (Artysta: {ArtistName}, Utwór: {TrackTitle}).", userId, recommendedArtistName, pickedTrackDto.Title);

                var fullTrackDto = await GetAsync<TrackDto>(Client, $"track/{pickedTrackDto.Id}", ct, treat404AsNull: true);
                return MapTrack(fullTrackDto ?? pickedTrackDto);
            }

            _logger.LogError("Nie udało się pobrać poprawnej rekomendacji dla {UserId} po sprawdzeniu {Count} poleconych artystów.", userId, geminiResponse.RecommendedArtistNames.Count);
            throw new RpcException(new Status(StatusCode.NotFound, "Żaden z poleconych artystów nie przyniósł pasujących wyników w Deezer."));
        }

        private HttpClient Client => _httpClientFactory.CreateClient("deezer");

        private static async Task<T?> GetAsync<T>(HttpClient client, string relativeUrl, CancellationToken ct, bool treat404AsNull = false)
        {
            using var req = new HttpRequestMessage(HttpMethod.Get, relativeUrl);
            using var res = await client.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, ct);

            if (treat404AsNull && res.StatusCode == HttpStatusCode.NotFound)
                return default;

            if (!res.IsSuccessStatusCode)
            {
                var body = await res.Content.ReadAsStringAsync(ct);
                throw new RpcException(new Status(StatusCode.Unknown, $"Deezer API error {(int)res.StatusCode}: {body}"));
            }

            await using var stream = await res.Content.ReadAsStreamAsync(ct);
            return await JsonSerializer.DeserializeAsync<T>(stream, JsonOptions, ct);
        }

        private static Track MapTrack(TrackDto dto)
        {
            var track = new Track
            {
                Id = dto.Id,
                Title = dto.Title ?? string.Empty,
                TitleShort = dto.TitleShort ?? string.Empty,
                Isrc = dto.ISRC ?? string.Empty,
                Link = dto.Link ?? string.Empty,
                Share = dto.Share ?? string.Empty,
                TrackPosition = (int)dto.TrackPosition,
                DiskNumber = (int)dto.DiskNumber,
                Rank = (int)dto.Rank,
                ExplicitLyrics = dto.ExplicitLyrics,
                ExplicitContentLyrics = MapExplicit(dto.ExplicitContentLyrics),
                ExplicitCover = MapExplicit(dto.ExplicitContentCover),
                Preview = dto.Preview ?? string.Empty,
                Bpm = dto.Bpm ?? 0,
                Gain = dto.Gain ?? 0,
            };

            if (!string.IsNullOrWhiteSpace(dto.ReleaseDate) &&
                DateTime.TryParse(dto.ReleaseDate, out var dt))
            {
                if (dt.Kind == DateTimeKind.Unspecified)
                    dt = DateTime.SpecifyKind(dt, DateTimeKind.Utc);
                else
                    dt = dt.ToUniversalTime();

                track.ReleaseDate = Timestamp.FromDateTime(dt);
            }

            if (dto.AvailableCountries is { Length: > 0 })
            {
                track.CountryCodes.AddRange(dto.AvailableCountries.Where(cc => !string.IsNullOrWhiteSpace(cc)));
            }

            var artists = new List<ArtistDto>();
            if (dto.Artist != null) artists.Add(dto.Artist);
            if (dto.Contributors != null && dto.Contributors.Count > 0) artists.AddRange(dto.Contributors);

            foreach (var a in artists.GroupBy(a => a.Id).Select(g => g.First()))
            {
                track.Artists.Add(new Artist
                {
                    Id = a.Id,
                    Name = a.Name ?? string.Empty,
                    Link = a.Link ?? string.Empty,
                    Picture = a.Picture ?? string.Empty,
                    PictureSmall = a.PictureSmall ?? string.Empty,
                    PictureMedium = a.PictureMedium ?? string.Empty,
                    PictureBig = a.PictureBig ?? string.Empty,
                    PictureXl = a.PictureXl ?? string.Empty,
                    Tracklist = a.Tracklist ?? string.Empty
                });
            }

            if (dto.Album != null)
            {
                track.Album = new Album
                {
                    Id = dto.Album.Id,
                    Title = dto.Album.Title ?? string.Empty,
                    Cover = dto.Album.Cover ?? string.Empty,
                    CoverSmall = dto.Album.CoverSmall ?? string.Empty,
                    CoverMedium = dto.Album.CoverMedium ?? string.Empty,
                    CoverBig = dto.Album.CoverBig ?? string.Empty,
                    CoverXl = dto.Album.CoverXl ?? string.Empty,
                    Tracklist = dto.Album.Tracklist ?? string.Empty
                };
            }
            else
            {
                track.Album = new Album
                {
                    Title = string.Empty,
                    Cover = string.Empty,
                    Tracklist = string.Empty
                };
            }

            return track;
        }

        private static ExplicitLevel MapExplicit(int? value)
        {
            if (value is null) return ExplicitLevel.Unspecified;
            return value == 0 ? ExplicitLevel.Clean : ExplicitLevel.Explicit;
        }
        private sealed class ApiList<T>
        {
            [JsonPropertyName("data")]
            public List<T>? Data { get; set; }
        }

        private sealed class TrackDto
        {
            [JsonPropertyName("id")]
            public long Id { get; set; }

            [JsonPropertyName("title")]
            public string? Title { get; set; }

            [JsonPropertyName("title_short")]
            public string? TitleShort { get; set; }

            [JsonPropertyName("isrc")]
            public string? ISRC { get; set; }

            [JsonPropertyName("link")]
            public string? Link { get; set; }

            [JsonPropertyName("share")]
            public string? Share { get; set; }

            [JsonPropertyName("track_position")]
            public int TrackPosition { get; set; }

            [JsonPropertyName("disk_number")]
            public int DiskNumber { get; set; }

            [JsonPropertyName("rank")]
            public int Rank { get; set; }

            [JsonPropertyName("release_date")]
            public string? ReleaseDate { get; set; }

            [JsonPropertyName("explicit_lyrics")]
            public bool ExplicitLyrics { get; set; }

            [JsonPropertyName("explicit_content_lyrics")]
            public int? ExplicitContentLyrics { get; set; }

            [JsonPropertyName("explicit_content_cover")]
            public int? ExplicitContentCover { get; set; }

            [JsonPropertyName("preview")]
            public string? Preview { get; set; }

            [JsonPropertyName("bpm")]
            public double? Bpm { get; set; }

            [JsonPropertyName("gain")]
            public double? Gain { get; set; }

            [JsonPropertyName("available_countries")]
            public string[]? AvailableCountries { get; set; }

            [JsonPropertyName("artist")]
            public ArtistDto? Artist { get; set; }

            [JsonPropertyName("contributors")]
            public List<ArtistDto>? Contributors { get; set; }

            [JsonPropertyName("album")]
            public AlbumDto? Album { get; set; }
        }

        private sealed class ArtistDto
        {
            [JsonPropertyName("id")]
            public long Id { get; set; }
            [JsonPropertyName("name")]
            public string? Name { get; set; }
            [JsonPropertyName("link")]
            public string? Link { get; set; }
            [JsonPropertyName("picture")]
            public string? Picture { get; set; }
            [JsonPropertyName("picture_small")]
            public string? PictureSmall { get; set; }
            [JsonPropertyName("picture_medium")]
            public string? PictureMedium { get; set; }
            [JsonPropertyName("picture_big")]
            public string? PictureBig { get; set; }
            [JsonPropertyName("picture_xl")]
            public string? PictureXl { get; set; }
            [JsonPropertyName("tracklist")]
            public string? Tracklist { get; set; }
        }

        private sealed class AlbumDto
        {
            [JsonPropertyName("id")]
            public long Id { get; set; }
            [JsonPropertyName("title")]
            public string? Title { get; set; }
            [JsonPropertyName("cover")]
            public string? Cover { get; set; }
            [JsonPropertyName("cover_small")]
            public string? CoverSmall { get; set; }
            [JsonPropertyName("cover_medium")]
            public string? CoverMedium { get; set; }
            [JsonPropertyName("cover_big")]
            public string? CoverBig { get; set; }
            [JsonPropertyName("cover_xl")]
            public string? CoverXl { get; set; }
            [JsonPropertyName("tracklist")]
            public string? Tracklist { get; set; }
        }
    }
}