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

namespace SwipeVibesAPI.Grpc
{
    public class DeezerGrpcService : DeezerService.DeezerServiceBase
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<DeezerGrpcService> _logger;
        private readonly Random _rng = new();

        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNameCaseInsensitive = true,
            NumberHandling = JsonNumberHandling.AllowReadingFromString
        };

        public DeezerGrpcService(IHttpClientFactory httpClientFactory, ILogger<DeezerGrpcService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _logger = logger;
        }

        public override async Task<ListRadioStationsResponse> ListRadioStations(ListRadioStationsRequest request, ServerCallContext context)
        {
            var (index, limit) = NormalizePaging(request.Page, request.PageSize);
            var url = $"radio?index={index}&limit={limit}";
            var api = Client;

            var payload = await GetAsync<ApiList<RadioStationDto>>(api, url, context.CancellationToken);

            var resp = new ListRadioStationsResponse();
            if (payload?.Data != null)
            {
                resp.Stations.AddRange(payload.Data.Select(MapStation));
            }

            return resp;
        }

        public override async Task<GetRadioStationResponse> GetRadioStation(GetRadioStationRequest request, ServerCallContext context)
        {
            var api = Client;
            var url = $"radio/{request.Id}";
            var dto = await GetAsync<RadioStationDto>(api, url, context.CancellationToken, treat404AsNull: true);

            if (dto == null)
            {
                throw new RpcException(new Status(StatusCode.NotFound, $"Radio station {request.Id} not found"));
            }

            return new GetRadioStationResponse
            {
                Station = MapStation(dto)
            };
        }

        public override async Task<ListRadioTracksResponse> ListRadioTracks(ListRadioTracksRequest request, ServerCallContext context)
        {
            var api = Client;
            var (index, limit) = NormalizePaging(request.Page, request.PageSize);
            var url = $"radio/{request.StationId}/tracks?index={index}&limit={limit}";

            var payload = await GetAsync<ApiList<TrackDto>>(api, url, context.CancellationToken, treat404AsNull: true);

            if (payload == null)
            {
                throw new RpcException(new Status(StatusCode.NotFound, $"Radio station {request.StationId} not found or has no tracks"));
            }

            var resp = new ListRadioTracksResponse();
            if (payload.Data != null)
            {
                foreach (var t in payload.Data)
                    resp.Tracks.Add(MapTrack(t));
            }

            return resp;
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
        public async Task<Track> GetRandomTrackFromRandomStationAsync(CancellationToken ct = default)
        {
            var stationsPayload = await GetAsync<ApiList<RadioStationDto>>(Client, "radio?index=0&limit=100", ct);
            var stations = stationsPayload?.Data?.ToList() ?? new();
            if (stations.Count == 0)
                throw new RpcException(new Status(StatusCode.NotFound, "No radio stations available"));

            var maxStationTries = Math.Min(10, stations.Count);

            for (int i = 0; i < maxStationTries; i++)
            {
                var station = stations[_rng.Next(stations.Count)];

                var tracksPayload = await GetAsync<ApiList<TrackDto>>(Client, $"radio/{station.Id}/tracks?index=0&limit=100", ct, treat404AsNull: true);
                var tracksAll = tracksPayload?.Data ?? new List<TrackDto>();

                var tracks = tracksAll.Where(t => !string.IsNullOrWhiteSpace(t.Preview)).ToList();
                if (tracks.Count == 0) continue;

                var picked = tracks[_rng.Next(tracks.Count)];

                var full = await GetAsync<TrackDto>(Client, $"track/{picked.Id}", ct, treat404AsNull: true);
                var dto = full ?? picked;

                if (string.IsNullOrWhiteSpace(dto.Preview)) continue;

                return MapTrack(dto);
            }

            throw new RpcException(new Status(StatusCode.NotFound, "No tracks with preview found across random stations"));
        }


        public override async Task<GetTrackResponse> GetRandomTrackFromRandomStation(Google.Protobuf.WellKnownTypes.Empty request, ServerCallContext context)
        {
            var track = await GetRandomTrackFromRandomStationAsync(context.CancellationToken);
            return new GetTrackResponse { Track = track };
        }

        private HttpClient Client => _httpClientFactory.CreateClient("deezer");

        private static (int index, int limit) NormalizePaging(int page, int pageSize)
        {
            var p = page <= 0 ? 1 : page;
            var size = pageSize <= 0 ? 25 : pageSize;
            size = Math.Clamp(size, 1, 100);
            var index = (p - 1) * size;
            return (index, size);
        }

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

        private static RadioStation MapStation(RadioStationDto dto) =>
            new()
            {
                Id = dto.Id,
                Title = dto.Title ?? string.Empty,
                Tracklist = dto.Tracklist ?? string.Empty
            };

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

        // DTO
        private sealed class ApiList<T>
        {
            [JsonPropertyName("data")]
            public List<T>? Data { get; set; }
        }

        private sealed class RadioStationDto
        {
            [JsonPropertyName("id")]
            public long Id { get; set; }

            [JsonPropertyName("title")]
            public string? Title { get; set; }

            [JsonPropertyName("tracklist")]
            public string? Tracklist { get; set; }
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
