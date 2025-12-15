using System;
using System.Linq;
using System.Threading.Tasks;
using Grpc.Core;
using FirebaseAdmin.Auth;
using SwipeVibesAPI.Entities;
using SwipeVibesAPI.Grpc;
using SwipeVibesAPI.Utility;
using System.Net.Http.Headers;
using System.Net;
using System.Text.Json;
using System.Collections.Generic;
using Google.Cloud.Firestore;
using SwipeVibesAPI.Services;
using Microsoft.Extensions.Configuration;

namespace SwipeVibesAPI.Services
{
    using FirestoreTimestamp = Google.Cloud.Firestore.Timestamp;
    using ProtoTimestamp = Google.Protobuf.WellKnownTypes.Timestamp;

    public class UserGrpcService : SwipeVibesAPI.Grpc.UserService.UserServiceBase
    {
        private readonly FirestoreDb _firestoreDb;
        private readonly JwtService _jwtService;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ISpotifyService _spotifyService;
        private readonly IConfiguration _configuration;

        public UserGrpcService(
            FirestoreDb firestoreDb,
            JwtService jwtService,
            IHttpClientFactory httpClientFactory,
            ISpotifyService spotifyService,
            IConfiguration configuration)
        {
            _firestoreDb = firestoreDb;
            _jwtService = jwtService;
            _httpClientFactory = httpClientFactory;
            _spotifyService = spotifyService;
            _configuration = configuration;
        }

        private async Task<UserDoc?> FindUserByEmail(string email)
        {
            var snapshot = await _firestoreDb.Collection("users")
                .WhereEqualTo("Email", email)
                .Limit(1)
                .GetSnapshotAsync();

            var doc = snapshot.Documents.FirstOrDefault();
            return doc?.ConvertTo<UserDoc>();
        }

        private async Task<UserDoc?> FindUserByUsername(string username)
        {
            var snapshot = await _firestoreDb.Collection("users")
                .WhereEqualTo("Username", username)
                .Limit(1)
                .GetSnapshotAsync();

            var doc = snapshot.Documents.FirstOrDefault();
            return doc?.ConvertTo<UserDoc>();
        }

        private async Task<UserDoc?> GetUserById(string id)
        {
            var docRef = _firestoreDb.Collection("users").Document(id);
            var snapshot = await docRef.GetSnapshotAsync();
            return snapshot.Exists ? snapshot.ConvertTo<UserDoc>() : null;
        }

        private async Task<string?> GetSpotifyAccessTokenForUser(string userId)
        {
            var user = await GetUserById(userId);
            if (user == null || string.IsNullOrEmpty(user.SpotifyRefreshToken)) return null;

            var tokenResponse = await _spotifyService.RefreshAccessTokenAsync(user.SpotifyRefreshToken);
            return tokenResponse?.AccessToken;
        }

        private async Task<FirebaseToken> VerifyToken(string token)
        {
            try { return await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(token); }
            catch { throw new RpcException(new Status(StatusCode.Unauthenticated, "Invalid token")); }
        }

        private static bool IsProvider(string? p, string expected) =>
            !string.IsNullOrWhiteSpace(p) && p.Equals(expected, StringComparison.OrdinalIgnoreCase);

        private static async Task<string> VerifyGoogleAndGetEmailAsync(string firebaseIdToken)
        {
            var decoded = await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(firebaseIdToken);
            if (!decoded.Claims.TryGetValue("email", out var ve) || string.IsNullOrWhiteSpace(ve?.ToString()))
                throw new RpcException(new Status(StatusCode.Unauthenticated, "Google token missing email"));
            return ve!.ToString()!;
        }

        private async Task<(string? Email, string SpotifyId)> VerifySpotifyAndGetProfileAsync(string accessToken)
        {
            var client = _httpClientFactory.CreateClient();
            using var req = new HttpRequestMessage(HttpMethod.Get, "https://api.spotify.com/v1/me");
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            using var res = await client.SendAsync(req);
            if (res.StatusCode == HttpStatusCode.Unauthorized)
                throw new RpcException(new Status(StatusCode.Unauthenticated, "Invalid Spotify access token"));

            res.EnsureSuccessStatusCode();
            var json = await res.Content.ReadAsStringAsync();

            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            var id = root.GetProperty("id").GetString() ?? throw new RpcException(
                new Status(StatusCode.Internal, "Spotify profile missing id"));

            string? email = null;
            if (root.TryGetProperty("email", out var e) && e.ValueKind == JsonValueKind.String)
                email = e.GetString();

            return (email, id);
        }

        public override async Task<UserReply> CreateUser(CreateUserRequest request, ServerCallContext context)
        {
            var existing = await FindUserByUsername(request.Username) ?? await FindUserByEmail(request.Email);
            if (existing != null)
                throw new RpcException(new Status(StatusCode.AlreadyExists, "User already exists"));

            string hashedPassword = BCrypt.Net.BCrypt.HashPassword(request.Password);

            var newUser = new UserDoc
            {
                Username = request.Username,
                Email = request.Email,
                Password = hashedPassword,
                Role = "User"
            };

            var docRef = await _firestoreDb.Collection("users").AddAsync(newUser);
            newUser.Id = docRef.Id;

            return new UserReply
            {
                Id = newUser.Id,
                Username = newUser.Username,
                Email = newUser.Email,
                Role = newUser.Role,
                IsSpotifyConnected = false
            };
        }

        public override async Task<UserReply> UpdateUser(UpdateUserRequest request, ServerCallContext context)
        {
            var currentUserId = GetCurrentUserId(context);
            if (currentUserId != request.Id)
                throw new RpcException(new Status(StatusCode.PermissionDenied, "You can only update your own profile"));

            var docRef = _firestoreDb.Collection("users").Document(request.Id);
            var snapshot = await docRef.GetSnapshotAsync();

            if (!snapshot.Exists)
                throw new RpcException(new Status(StatusCode.NotFound, "User not found"));

            var updates = new Dictionary<string, object>
            {
                { "Username", request.Username },
                { "Email", request.Email }
            };

            if (!string.IsNullOrEmpty(request.Password))
            {
                updates.Add("Password", BCrypt.Net.BCrypt.HashPassword(request.Password));
            }

            await docRef.UpdateAsync(updates);

            var user = snapshot.ConvertTo<UserDoc>();

            return new UserReply
            {
                Id = user.Id,
                Username = request.Username,
                Email = request.Email,
                Role = user.Role,
                IsSpotifyConnected = !string.IsNullOrEmpty(user.SpotifyRefreshToken)
            };
        }

        public override async Task<DeleteReply> DeleteUser(UserRequest request, ServerCallContext context)
        {
            var currentUserId = GetCurrentUserId(context);

            var docRef = _firestoreDb.Collection("users").Document(request.Id);
            await docRef.DeleteAsync();
            return new DeleteReply { Success = true };
        }

        public override async Task<UserReply> GetUser(UserRequest request, ServerCallContext context)
        {
            var user = await GetUserById(request.Id);
            if (user == null) throw new RpcException(new Status(StatusCode.NotFound, "User not found"));

            return new UserReply
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email ?? "",
                Role = user.Role,
                IsSpotifyConnected = !string.IsNullOrEmpty(user.SpotifyRefreshToken)
            };
        }

        public override async Task<UsersReply> GetUsers(Empty request, ServerCallContext context)
        {
            var snapshot = await _firestoreDb.Collection("users").Limit(50).GetSnapshotAsync();
            var reply = new UsersReply();
            foreach (var doc in snapshot.Documents)
            {
                var u = doc.ConvertTo<UserDoc>();
                reply.Users.Add(new UserReply
                {
                    Id = u.Id,
                    Username = u.Username,
                    Email = u.Email ?? "",
                    Role = u.Role,
                    IsSpotifyConnected = !string.IsNullOrEmpty(u.SpotifyRefreshToken)
                });
            }
            return reply;
        }


        public override async Task<UserStatsReply> GetUserStats(UserStatsRequest request, ServerCallContext context)
        {
            var targetUserId = request.UserId;
            if (string.IsNullOrWhiteSpace(targetUserId))
            {
                targetUserId = context.GetHttpContext()?.User?.Identity?.Name;
            }

            if (string.IsNullOrWhiteSpace(targetUserId))
                throw new RpcException(new Status(StatusCode.InvalidArgument, "UserId required"));

            var user = await GetUserById(targetUserId);
            if (user == null)
                throw new RpcException(new Status(StatusCode.NotFound, "User not found"));

            return new UserStatsReply
            {
                FavoriteArtist = user.FavoriteArtist ?? "Unknown",
                AverageBpm = user.AverageBpm ?? 0.0,
                Likes = user.Likes ?? 0,
                Dislikes = user.Dislikes ?? 0
            };
        }

        public override async Task<LoginReply> Login(LoginRequest request, ServerCallContext context)
        {
            UserDoc user = null;

            if (!string.IsNullOrWhiteSpace(request.Provider))
            {
                if (IsProvider(request.Provider, "google"))
                {
                    var email = await VerifyGoogleAndGetEmailAsync(request.Token);
                    user = await FindUserByEmail(email);

                    if (user == null)
                    {
                        user = new UserDoc { Username = email.Split('@')[0], Email = email, Role = "User" };
                        var refDoc = await _firestoreDb.Collection("users").AddAsync(user);
                        user.Id = refDoc.Id;
                    }
                }
                else if (IsProvider(request.Provider, "spotify"))
                {
                    var (email, spotifyId) = await VerifySpotifyAndGetProfileAsync(request.Token);

                    if (!string.IsNullOrWhiteSpace(email))
                    {
                        user = await FindUserByEmail(email);
                        if (user == null)
                        {
                            user = new UserDoc { Username = email.Split('@')[0], Email = email, Role = "User" };
                            var refDoc = await _firestoreDb.Collection("users").AddAsync(user);
                            user.Id = refDoc.Id;
                        }
                    }
                    else
                    {
                        var uname = $"spotify:{spotifyId}";
                        user = await FindUserByUsername(uname);
                        if (user == null)
                        {
                            user = new UserDoc { Username = uname, Email = $"user+{spotifyId}@spotify.local", Role = "User" };
                            var refDoc = await _firestoreDb.Collection("users").AddAsync(user);
                            user.Id = refDoc.Id;
                        }
                    }
                }
                else
                {
                    throw new RpcException(new Status(StatusCode.InvalidArgument, $"Unsupported provider '{request.Provider}'"));
                }
            }
            else
            {
                user = await FindUserByUsername(request.Username);
                if (user == null) throw new RpcException(new Status(StatusCode.NotFound, "User not found"));
                if (!BCrypt.Net.BCrypt.Verify(request.Password, user.Password))
                    throw new RpcException(new Status(StatusCode.Unauthenticated, "Invalid password"));
            }

            var access = _jwtService.GenerateAccess(user.Id, user.Role, TimeSpan.FromMinutes(15));
            var refresh = _jwtService.GenerateRefresh(user.Id, TimeSpan.FromDays(14));

            context.GetHttpContext().Response.Cookies.Append("sv_refresh", refresh, new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.None,
                Path = "/",
                Expires = DateTimeOffset.UtcNow.AddDays(14),
            });

            return new LoginReply
            {
                Token = access,
                RefreshToken = refresh,
                Username = user.Username,
                Role = user.Role,
                Id = user.Id,
                IsSpotifyConnected = !string.IsNullOrEmpty(user.SpotifyRefreshToken)
            };
        }

        public override Task<RefreshReply> Refresh(RefreshRequest request, ServerCallContext context)
        {
            var http = context.GetHttpContext();

            string? refresh = request.RefreshToken;

            if (string.IsNullOrWhiteSpace(refresh))
                refresh = http.Request.Cookies["sv_refresh"];

            if (string.IsNullOrWhiteSpace(refresh))
                throw new RpcException(new Status(StatusCode.Unauthenticated, "Missing refresh token"));

            var principal = _jwtService.ValidateRefresh(refresh);
            if (principal is null)
                throw new RpcException(new Status(StatusCode.Unauthenticated, "Invalid refresh token"));

            var userId = principal.Identity!.Name!;
            var role = principal.Claims.FirstOrDefault(x => x.Type == "role")?.Value ?? "User";
            var newAccess = _jwtService.GenerateAccess(userId, role, TimeSpan.FromMinutes(15));

            return Task.FromResult(new RefreshReply { Token = newAccess });
        }

        public override Task<LogoutReply> Logout(LogoutRequest request, ServerCallContext context)
        {
            context.GetHttpContext().Response.Cookies.Append("sv_refresh", "", new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.None,
                Path = "/",
                Expires = DateTimeOffset.UnixEpoch
            });
            return Task.FromResult(new LogoutReply { Success = true });
        }

        private string GetCurrentUserId(ServerCallContext context)
        {
            var userId = context.GetHttpContext()?.User?.Identity?.Name;
            if (string.IsNullOrWhiteSpace(userId))
                throw new RpcException(new Status(StatusCode.Unauthenticated, "User not authenticated"));
            return userId;
        }

        public override async Task<PlaylistReply> CreatePlaylist(CreatePlaylistRequest request, ServerCallContext context)
        {
            var userId = GetCurrentUserId(context);
            if (string.IsNullOrWhiteSpace(request.Name)) throw new RpcException(new Status(StatusCode.InvalidArgument, "Name required"));

            var playlistDoc = new PlaylistDoc
            {
                UserId = userId,
                Name = request.Name,
                CreatedAt = Google.Cloud.Firestore.Timestamp.FromDateTime(DateTime.UtcNow)
            };

            var docRef = await _firestoreDb.Collection("playlists").AddAsync(playlistDoc);

            try
            {
                var spotifyAccessToken = await GetSpotifyAccessTokenForUser(userId);
                if (!string.IsNullOrEmpty(spotifyAccessToken))
                {
                    var spotifyUserId = await _spotifyService.GetSpotifyUserIdAsync(spotifyAccessToken);
                    if (!string.IsNullOrEmpty(spotifyUserId))
                    {
                        var spotifyPlaylistId = await _spotifyService.CreatePlaylistAsync(spotifyUserId, request.Name, spotifyAccessToken);
                        if (!string.IsNullOrEmpty(spotifyPlaylistId))
                        {
                            await docRef.UpdateAsync("SpotifyPlaylistId", spotifyPlaylistId);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to create Spotify playlist: {ex.Message}");
            }

            return new PlaylistReply { Id = docRef.Id, Name = request.Name, CreatedAt = ProtoTimestamp.FromDateTime(DateTime.UtcNow) };
        }

        public override async Task<PlaylistsListReply> GetMyPlaylists(Empty request, ServerCallContext context)
        {
            var userId = GetCurrentUserId(context);
            var snapshot = await _firestoreDb.Collection("playlists")
                .WhereEqualTo("UserId", userId)
                .OrderByDescending("CreatedAt")
                .GetSnapshotAsync();

            var reply = new PlaylistsListReply();
            foreach (var doc in snapshot.Documents)
            {
                var data = doc.ConvertTo<PlaylistDoc>();
                reply.Playlists.Add(new PlaylistReply
                {
                    Id = doc.Id,
                    Name = data.Name,
                    CreatedAt = ProtoTimestamp.FromDateTime(data.CreatedAt.ToDateTime())
                });
            }
            return reply;
        }

        public override async Task<DeleteReply> DeletePlaylist(DeletePlaylistRequest request, ServerCallContext context)
        {
            var userId = GetCurrentUserId(context);
            var docRef = _firestoreDb.Collection("playlists").Document(request.Id);
            var snap = await docRef.GetSnapshotAsync();

            if (!snap.Exists) throw new RpcException(new Status(StatusCode.NotFound, "Playlist not found"));
            var data = snap.ConvertTo<PlaylistDoc>();
            if (data.UserId != userId) throw new RpcException(new Status(StatusCode.PermissionDenied, "Not your playlist"));

            await docRef.DeleteAsync();
            return new DeleteReply { Success = true };
        }

        public override async Task<PlaylistTrackReply> AddTrackToPlaylist(AddTrackToPlaylistRequest request, ServerCallContext context)
        {
            var userId = GetCurrentUserId(context);
            var playlistRef = _firestoreDb.Collection("playlists").Document(request.PlaylistId);
            var snap = await playlistRef.GetSnapshotAsync();

            if (!snap.Exists) throw new RpcException(new Status(StatusCode.NotFound, "Playlist not found"));

            var playlistData = snap.ConvertTo<PlaylistDoc>();
            if (playlistData.UserId != userId) throw new RpcException(new Status(StatusCode.PermissionDenied, "Not your playlist"));

            var trackDoc = new PlaylistTrackDoc
            {
                DeezerTrackId = request.DeezerTrackId,
                Title = request.Title,
                Isrc = request.Isrc,
                ArtistId = request.ArtistId,
                ArtistName = request.ArtistName,
                AlbumCover = request.AlbumCover,
                AddedAt = Google.Cloud.Firestore.Timestamp.FromDateTime(DateTime.UtcNow)
            };

            var trackRef = playlistRef.Collection("tracks").Document(request.DeezerTrackId.ToString());
            await trackRef.SetAsync(trackDoc);

            if (!string.IsNullOrEmpty(playlistData.SpotifyPlaylistId))
            {
                try
                {
                    var spotifyAccessToken = await GetSpotifyAccessTokenForUser(userId);
                    if (!string.IsNullOrEmpty(spotifyAccessToken))
                    {
                        var trackUri = await _spotifyService.SearchTrackByIsrcAsync(request.Isrc, spotifyAccessToken);
                        if (!string.IsNullOrEmpty(trackUri))
                        {
                            var added = await _spotifyService.AddTracksToPlaylistAsync(playlistData.SpotifyPlaylistId, new List<string> { trackUri }, spotifyAccessToken);
                            if (added)
                            {
                                await trackRef.UpdateAsync("SpotifyUri", trackUri);
                                trackDoc.SpotifyUri = trackUri;
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Failed to add track to Spotify: {ex.Message}");
                }
            }

            return new PlaylistTrackReply
            {
                Success = true,
                Track = new PlaylistTrack
                {
                    DeezerTrackId = trackDoc.DeezerTrackId,
                    Title = trackDoc.Title,
                    Isrc = trackDoc.Isrc,
                    ArtistId = trackDoc.ArtistId,
                    ArtistName = trackDoc.ArtistName,
                    AlbumCover = trackDoc.AlbumCover,
                    AddedAt = ProtoTimestamp.FromDateTime(DateTime.UtcNow)
                }
            };
        }

        public override async Task<DeleteReply> RemoveTrackFromPlaylist(RemoveTrackFromPlaylistRequest request, ServerCallContext context)
        {
            var userId = GetCurrentUserId(context);
            var playlistRef = _firestoreDb.Collection("playlists").Document(request.PlaylistId);
            var snap = await playlistRef.GetSnapshotAsync();

            if (!snap.Exists) throw new RpcException(new Status(StatusCode.NotFound, "Playlist not found"));
            var playlistData = snap.ConvertTo<PlaylistDoc>();

            if (playlistData.UserId != userId) throw new RpcException(new Status(StatusCode.PermissionDenied, "Not your playlist"));

            var trackRef = playlistRef.Collection("tracks").Document(request.DeezerTrackId.ToString());
            var trackSnap = await trackRef.GetSnapshotAsync();

            if (trackSnap.Exists)
            {
                var trackData = trackSnap.ConvertTo<PlaylistTrackDoc>();
                if (!string.IsNullOrEmpty(playlistData.SpotifyPlaylistId) && !string.IsNullOrEmpty(trackData.SpotifyUri))
                {
                    try
                    {
                        var spotifyAccessToken = await GetSpotifyAccessTokenForUser(userId);
                        if (!string.IsNullOrEmpty(spotifyAccessToken))
                        {
                            await _spotifyService.RemoveTrackFromPlaylistAsync(playlistData.SpotifyPlaylistId, trackData.SpotifyUri, spotifyAccessToken);
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Failed to remove track from Spotify: {ex.Message}");
                    }
                }

                await trackRef.DeleteAsync();
            }

            return new DeleteReply { Success = true };
        }

        public override async Task<PlaylistTracksListReply> GetPlaylistTracks(GetPlaylistTracksRequest request, ServerCallContext context)
        {
            var userId = GetCurrentUserId(context);
            var playlistRef = _firestoreDb.Collection("playlists").Document(request.PlaylistId);
            var snap = await playlistRef.GetSnapshotAsync();

            if (!snap.Exists) throw new RpcException(new Status(StatusCode.NotFound, "Playlist not found"));
            if (snap.GetValue<string>("UserId") != userId) throw new RpcException(new Status(StatusCode.PermissionDenied, "Not your playlist"));

            var tracksSnap = await playlistRef.Collection("tracks").OrderByDescending("AddedAt").GetSnapshotAsync();

            var reply = new PlaylistTracksListReply();
            foreach (var doc in tracksSnap.Documents)
            {
                var t = doc.ConvertTo<PlaylistTrackDoc>();
                reply.Tracks.Add(new PlaylistTrack
                {
                    DeezerTrackId = t.DeezerTrackId,
                    Title = t.Title,
                    Isrc = t.Isrc,
                    ArtistId = t.ArtistId,
                    ArtistName = t.ArtistName,
                    AlbumCover = t.AlbumCover,
                    AddedAt = ProtoTimestamp.FromDateTime(t.AddedAt.ToDateTime())
                });
            }
            return reply;
        }

        public override async Task<UserInteractionsReply> GetUserInteractions(UserInteractionsRequest request, ServerCallContext context)
        {
            if (string.IsNullOrWhiteSpace(request.UserId)) throw new RpcException(new Status(StatusCode.InvalidArgument, "UserId required"));

            var query = _firestoreDb.Collection("interactions")
               .WhereEqualTo("UserId", request.UserId)
               .OrderByDescending("Ts")
               .Limit(200);

            var snapshot = await query.GetSnapshotAsync();
            var reply = new UserInteractionsReply();

            foreach (var doc in snapshot.Documents)
            {
                var i = doc.ConvertTo<InteractionDoc>();
                reply.Interactions.Add(new InteractionReply
                {
                    Id = doc.Id,
                    UserId = i.UserId,
                    Isrc = i.Isrc ?? "",
                    Decision = i.Decision ?? "",
                    DeezerTrackId = i.DeezerTrackId ?? 0,
                    Source = i.Source ?? "",
                    Artist = i.Artist ?? "",
                    Title = i.Title ?? ""
                });
            }
            return reply;
        }

        public override Task<SpotifyAuthUrlReply> GetSpotifyAuthUrl(Empty request, ServerCallContext context)
        {
            var redirectUri = _configuration["Spotify:RedirectUri"] ?? "http://127.0.0.1:8081/oauth2redirect/spotify";
            var url = _spotifyService.GetAuthorizationUrl(redirectUri);
            return Task.FromResult(new SpotifyAuthUrlReply { Url = url });
        }

        public override async Task<SpotifyCallbackReply> HandleSpotifyCallback(SpotifyCallbackRequest request, ServerCallContext context)
        {
            var redirectUri = request.RedirectUri;

            if (string.IsNullOrEmpty(redirectUri))
            {
                redirectUri = _configuration["Spotify:RedirectUri"] ?? "http://127.0.0.1:8081/oauth2redirect/spotify";
            }

            var tokenResponse = await _spotifyService.ExchangeCodeForTokenAsync(request.Code, redirectUri);

            if (tokenResponse == null || string.IsNullOrEmpty(tokenResponse.RefreshToken))
            {
                return new SpotifyCallbackReply { Success = false, Message = "Failed to exchange code for token" };
            }

            var userId = request.UserId;

            var docRef = _firestoreDb.Collection("users").Document(userId);
            var snapshot = await docRef.GetSnapshotAsync();

            if (!snapshot.Exists)
            {
                return new SpotifyCallbackReply { Success = false, Message = "User not found" };
            }

            var updates = new Dictionary<string, object>
    {
        { "SpotifyRefreshToken", tokenResponse.RefreshToken }
    };

            await docRef.UpdateAsync(updates);

            return new SpotifyCallbackReply { Success = true, Message = "Spotify connected successfully" };
        }

        public override async Task<ExportPlaylistReply> ExportPlaylist(ExportPlaylistRequest request, ServerCallContext context)
        {
            var userId = GetCurrentUserId(context);

            var playlistRef = _firestoreDb.Collection("playlists").Document(request.PlaylistId);
            var playlistSnap = await playlistRef.GetSnapshotAsync();

            if (!playlistSnap.Exists)
                return new ExportPlaylistReply { Success = false, Message = "Playlist not found" };

            var playlistData = playlistSnap.ConvertTo<PlaylistDoc>();
            if (playlistData.UserId != userId)
                return new ExportPlaylistReply { Success = false, Message = "Unauthorized" };

            var accessToken = await GetSpotifyAccessTokenForUser(userId);
            if (string.IsNullOrEmpty(accessToken))
                return new ExportPlaylistReply { Success = false, Message = "Spotify not connected. Please connect in settings." };

            var spotifyUserId = await _spotifyService.GetSpotifyUserIdAsync(accessToken);

            string spotifyPlaylistId = playlistData.SpotifyPlaylistId;

            if (string.IsNullOrEmpty(spotifyPlaylistId))
            {
                spotifyPlaylistId = await _spotifyService.CreatePlaylistAsync(spotifyUserId, playlistData.Name, accessToken);
                if (string.IsNullOrEmpty(spotifyPlaylistId))
                    return new ExportPlaylistReply { Success = false, Message = "Failed to create Spotify playlist" };

                await playlistRef.UpdateAsync("SpotifyPlaylistId", spotifyPlaylistId);
            }

            var tracksSnap = await playlistRef.Collection("tracks").GetSnapshotAsync();
            var tracks = tracksSnap.Documents.Select(d => d.ConvertTo<PlaylistTrackDoc>()).ToList();

            if (!tracks.Any())
                return new ExportPlaylistReply { Success = true, Message = "Playlist is empty, nothing to export." };

            var spotifyUris = new List<string>();
            var tracksToUpdateInDb = new List<(DocumentReference Ref, string Uri)>();

            foreach (var track in tracks)
            {
                string uri = track.SpotifyUri;

                if (string.IsNullOrEmpty(uri) && !string.IsNullOrEmpty(track.Isrc))
                {
                    uri = await _spotifyService.SearchTrackByIsrcAsync(track.Isrc, accessToken);
                    if (!string.IsNullOrEmpty(uri))
                    {
                        var trackRef = playlistRef.Collection("tracks").Document(track.DeezerTrackId.ToString());
                        tracksToUpdateInDb.Add((trackRef, uri));
                    }
                }

                if (!string.IsNullOrEmpty(uri))
                {
                    spotifyUris.Add(uri);
                }
            }

            if (spotifyUris.Any())
            {
                var success = await _spotifyService.ReplacePlaylistTracksAsync(spotifyPlaylistId, spotifyUris, accessToken);
                if (!success)
                    return new ExportPlaylistReply { Success = false, Message = "Failed to update tracks on Spotify" };

                _ = Task.Run(async () =>
                {
                    foreach (var item in tracksToUpdateInDb)
                    {
                        await item.Ref.UpdateAsync("SpotifyUri", item.Uri);
                    }
                });
            }

            return new ExportPlaylistReply
            {
                Success = true,
                Message = "Playlist exported successfully!",
                SpotifyPlaylistUrl = $"https://open.spotify.com/playlist/{spotifyPlaylistId}"
            };
        }
    }
}