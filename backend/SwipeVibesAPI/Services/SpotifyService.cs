using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Web;

namespace SwipeVibesAPI.Services
{
    public interface ISpotifyService
    {
        string GetAuthorizationUrl(string redirectUri);
        Task<SpotifyTokenResponse?> ExchangeCodeForTokenAsync(string code, string redirectUri);
        Task<SpotifyTokenResponse?> RefreshAccessTokenAsync(string refreshToken);
        Task<string?> GetSpotifyUserIdAsync(string accessToken);
        Task<string?> CreatePlaylistAsync(string spotifyUserId, string name, string accessToken);
        Task<string?> SearchTrackByIsrcAsync(string isrc, string accessToken);
        Task<bool> AddTracksToPlaylistAsync(string playlistId, List<string> trackUris, string accessToken);
        Task<bool> RemoveTrackFromPlaylistAsync(string playlistId, string trackUri, string accessToken);
    }

    public class SpotifyService : ISpotifyService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;

        public SpotifyService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _configuration = configuration;
        }

        public string GetAuthorizationUrl(string redirectUri)
        {
            var clientId = _configuration["SPOTIFY_CLIENT_ID"];

            if (string.IsNullOrEmpty(clientId))
            {
                throw new InvalidOperationException("Spotify Client ID is missing in appsettings.json configuration.");
            }

            var scope = "user-read-private user-read-email playlist-modify-public playlist-modify-private";
            var state = Guid.NewGuid().ToString();

            var query = HttpUtility.ParseQueryString(string.Empty);
            query["response_type"] = "code";
            query["client_id"] = clientId;
            query["scope"] = scope;
            query["redirect_uri"] = redirectUri;
            query["state"] = state;

            return $"https://accounts.spotify.com/authorize?{query}";
        }

        public async Task<SpotifyTokenResponse?> ExchangeCodeForTokenAsync(string code, string redirectUri)
        {
            var clientId = _configuration["SPOTIFY_CLIENT_ID"];
            var clientSecret = _configuration["SPOTIFY_CLIENT_SECRET"];

            if (string.IsNullOrEmpty(clientId) || string.IsNullOrEmpty(clientSecret))
            {
                throw new InvalidOperationException("Spotify credentials are missing in configuration.");
            }

            var request = new HttpRequestMessage(HttpMethod.Post, "https://accounts.spotify.com/api/token");

            var authHeader = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{clientId}:{clientSecret}"));
            request.Headers.Authorization = new AuthenticationHeaderValue("Basic", authHeader);

            var content = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string, string>("grant_type", "authorization_code"),
                new KeyValuePair<string, string>("code", code),
                new KeyValuePair<string, string>("redirect_uri", redirectUri)
            });

            request.Content = content;

            var response = await _httpClient.SendAsync(request);

            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            var json = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<SpotifyTokenResponse>(json);
        }

        public async Task<SpotifyTokenResponse?> RefreshAccessTokenAsync(string refreshToken)
        {
            var clientId = _configuration["SPOTIFY_CLIENT_ID"];
            var clientSecret = _configuration["SPOTIFY_CLIENT_SECRET"];

            var request = new HttpRequestMessage(HttpMethod.Post, "https://accounts.spotify.com/api/token");

            var authHeader = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{clientId}:{clientSecret}"));
            request.Headers.Authorization = new AuthenticationHeaderValue("Basic", authHeader);

            var content = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string, string>("grant_type", "refresh_token"),
                new KeyValuePair<string, string>("refresh_token", refreshToken)
            });

            request.Content = content;

            var response = await _httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            var json = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<SpotifyTokenResponse>(json);
        }

        public async Task<string?> GetSpotifyUserIdAsync(string accessToken)
        {
            var request = new HttpRequestMessage(HttpMethod.Get, "https://api.spotify.com/v1/me");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            var response = await _httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode) return null;

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);

            if (doc.RootElement.TryGetProperty("id", out var idElement))
            {
                return idElement.GetString();
            }
            return null;
        }

        public async Task<string?> CreatePlaylistAsync(string spotifyUserId, string name, string accessToken)
        {
            var request = new HttpRequestMessage(HttpMethod.Post, $"https://api.spotify.com/v1/users/{spotifyUserId}/playlists");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            var body = new { name = name, description = "Created via SwipeVibes", @public = false };
            request.Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            return doc.RootElement.GetProperty("id").GetString();
        }

        public async Task<string?> SearchTrackByIsrcAsync(string isrc, string accessToken)
        {
            var query = HttpUtility.UrlEncode($"isrc:{isrc}");
            var request = new HttpRequestMessage(HttpMethod.Get, $"https://api.spotify.com/v1/search?q={query}&type=track&limit=1");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            var response = await _httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode) return null;

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);

            if (doc.RootElement.TryGetProperty("tracks", out var tracks) &&
                tracks.TryGetProperty("items", out var items) &&
                items.GetArrayLength() > 0)
            {
                return items[0].GetProperty("uri").GetString();
            }

            return null;
        }

        public async Task<bool> AddTracksToPlaylistAsync(string playlistId, List<string> trackUris, string accessToken)
        {
            var request = new HttpRequestMessage(HttpMethod.Post, $"https://api.spotify.com/v1/playlists/{playlistId}/tracks");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            var body = new { uris = trackUris };
            request.Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(request);
            return response.IsSuccessStatusCode;
        }

        public async Task<bool> RemoveTrackFromPlaylistAsync(string playlistId, string trackUri, string accessToken)
        {
            var request = new HttpRequestMessage(HttpMethod.Delete, $"https://api.spotify.com/v1/playlists/{playlistId}/tracks");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            var body = new
            {
                tracks = new[] { new { uri = trackUri } }
            };

            request.Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(request);
            return response.IsSuccessStatusCode;
        }
    }

    public class SpotifyTokenResponse
    {
        [JsonPropertyName("access_token")]
        public string AccessToken { get; set; }

        [JsonPropertyName("token_type")]
        public string TokenType { get; set; }

        [JsonPropertyName("scope")]
        public string Scope { get; set; }

        [JsonPropertyName("expires_in")]
        public int ExpiresIn { get; set; }

        [JsonPropertyName("refresh_token")]
        public string? RefreshToken { get; set; }
    }
}