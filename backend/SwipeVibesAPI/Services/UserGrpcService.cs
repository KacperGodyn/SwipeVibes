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
using Google.Cloud.Firestore.V1;

namespace SwipeVibesAPI.Services
{
    using FirestoreTimestamp = Google.Cloud.Firestore.Timestamp;
    using ProtoTimestamp = Google.Protobuf.WellKnownTypes.Timestamp;

    public class UserGrpcService : SwipeVibesAPI.Grpc.UserService.UserServiceBase
    {
        private readonly FirestoreDb _firestoreDb;
        private readonly UserService _userService;
        private readonly JwtService _jwtService;
        private readonly IWebHostEnvironment _env;
        private readonly IHttpClientFactory _httpClientFactory;

        public UserGrpcService(FirestoreDb firestoreDb, UserService userService, JwtService jwtService, IWebHostEnvironment env, IHttpClientFactory httpClientFactory)
        {
            _firestoreDb = firestoreDb;
            _userService = userService;
            _jwtService = jwtService;
            _env = env;
            _httpClientFactory = httpClientFactory;
        }

        private async Task<FirebaseToken> VerifyToken(string token)
        {
            try
            {
                var decoded = await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(token);
                return decoded;
            }
            catch
            {
                throw new RpcException(new Status(StatusCode.Unauthenticated, "Invalid token"));
            }
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
            var authHeader = context.RequestHeaders.FirstOrDefault(h => h.Key == "authorization")?.Value;
            if (authHeader == null || !authHeader.StartsWith("Bearer "))
                throw new RpcException(new Status(StatusCode.Unauthenticated, "Missing token"));

            string token = authHeader.Substring("Bearer ".Length);
            _ = await VerifyToken(token);

            string hashedPassword = BCrypt.Net.BCrypt.HashPassword(request.Password);

            var user = new User
            {
                Username = request.Username,
                Email = request.Email,
                Password = hashedPassword,
                Role = "User"
            };

            var created = await _userService.RegisterUserAsync(user);

            return new UserReply
            {
                Id = created.Id,
                Username = created.Username,
                Email = created.Email,
                Role = created.Role
            };
        }

        public override async Task<UserReply> UpdateUser(UpdateUserRequest request, ServerCallContext context)
        {
            var authHeader = context.RequestHeaders.FirstOrDefault(h => h.Key == "authorization")?.Value;
            if (authHeader == null || !authHeader.StartsWith("Bearer "))
                throw new RpcException(new Status(StatusCode.Unauthenticated, "Missing token"));

            string token = authHeader.Substring("Bearer ".Length);
            _ = await VerifyToken(token);

            var user = await _userService.GetUserByIdAsync(request.Id)
                      ?? throw new RpcException(new Status(StatusCode.NotFound, "User not found"));

            user.Username = request.Username;
            user.Email = request.Email;
            if (!string.IsNullOrEmpty(request.Password))
                user.Password = BCrypt.Net.BCrypt.HashPassword(request.Password);

            await _userService.UpdateUserAsync(user.Id, user);

            return new UserReply
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email,
                Role = user.Role
            };
        }

        public override async Task<DeleteReply> DeleteUser(UserRequest request, ServerCallContext context)
        {
            bool success = await _userService.DeleteUserAsync(request.Id);
            return new DeleteReply { Success = success };
        }

        public override async Task<UserReply> GetUser(UserRequest request, ServerCallContext context)
        {
            var user = await _userService.GetUserByIdAsync(request.Id)
                      ?? throw new RpcException(new Status(StatusCode.NotFound, "User not found"));

            return new UserReply
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email,
                Role = user.Role
            };
        }

        public override async Task<UsersReply> GetUsers(Empty request, ServerCallContext context)
        {
            var users = await _userService.GetUsersAsync();
            var reply = new UsersReply();
            reply.Users.AddRange(users.Select(u => new UserReply
            {
                Id = u.Id,
                Username = u.Username,
                Email = u.Email,
                Role = u.Role
            }));
            return reply;
        }
        private string GetCurrentUserId(ServerCallContext context)
        {
            var http = context.GetHttpContext();
            var userId = http?.User?.Identity?.Name;
            if (string.IsNullOrWhiteSpace(userId))
                throw new RpcException(new Status(StatusCode.Unauthenticated, "User not authenticated"));
            return userId;
        }

        public override async Task<LoginReply> Login(LoginRequest request, ServerCallContext context)
        {
            Entities.User user;

            if (!string.IsNullOrWhiteSpace(request.Provider))
            {
                if (IsProvider(request.Provider, "google"))
                {
                    var email = await VerifyGoogleAndGetEmailAsync(request.Token);

                    user = await _userService.GetUserByEmailAsync(email)
                           ?? await _userService.RegisterUserAsync(new User
                           {
                               Username = email.Split('@')[0],
                               Email = email,
                               Password = string.Empty,
                               Role = "User"
                           });
                }
                else if (IsProvider(request.Provider, "spotify"))
                {
                    var (email, spotifyId) = await VerifySpotifyAndGetProfileAsync(request.Token);

                    if (!string.IsNullOrWhiteSpace(email))
                    {
                        user = await _userService.GetUserByEmailAsync(email)
                               ?? await _userService.RegisterUserAsync(new User
                               {
                                   Username = email.Split('@')[0],
                                   Email = email,
                                   Password = string.Empty,
                                   Role = "User"
                               });
                    }
                    else
                    {
                        var uname = $"spotify:{spotifyId}";
                        user = await _userService.GetUserByUsernameAsync(uname)
                               ?? await _userService.RegisterUserAsync(new User
                               {
                                   Username = uname,
                                   Email = $"user+{spotifyId}@spotify.local",
                                   Password = string.Empty,
                                   Role = "User"
                               });
                    }
                }
                else
                {
                    throw new RpcException(new Status(StatusCode.InvalidArgument, $"Unsupported provider '{request.Provider}'"));
                }
            }
            else
            {
                user = await _userService.GetUserByUsernameAsync(request.Username)
                       ?? throw new RpcException(new Status(StatusCode.NotFound, "User not found"));

                if (!BCrypt.Net.BCrypt.Verify(request.Password, user.Password))
                    throw new RpcException(new Status(StatusCode.Unauthenticated, "Invalid password"));
            }

            // Issue tokns
            var access = _jwtService.GenerateAccess(user.Username, user.Role, TimeSpan.FromMinutes(15));
            var refresh = _jwtService.GenerateRefresh(user.Username, TimeSpan.FromDays(14));

            var http = context.GetHttpContext();
            http.Response.Cookies.Append("sv_refresh", refresh, new CookieOptions
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
                Username = user.Username,
                Role = user.Role
            };
        }

        public override Task<RefreshReply> Refresh(RefreshRequest request, ServerCallContext context)
        {
            var http = context.GetHttpContext();

            string? refresh = http.Request.Cookies.TryGetValue("sv_refresh", out var c) ? c : null;
            if (string.IsNullOrWhiteSpace(refresh) && !string.IsNullOrWhiteSpace(request.RefreshToken))
                refresh = request.RefreshToken;

            if (string.IsNullOrWhiteSpace(refresh))
                throw new RpcException(new Status(StatusCode.Unauthenticated, "Missing refresh token"));

            var principal = _jwtService.ValidateRefresh(refresh);
            if (principal is null)
                throw new RpcException(new Status(StatusCode.Unauthenticated, "Invalid refresh token"));

            var username = principal.Identity!.Name!;
            var role = principal.Claims.FirstOrDefault(x => x.Type == "role")?.Value ?? "User";

            var newAccess = _jwtService.GenerateAccess(username, role, TimeSpan.FromMinutes(15));
            return Task.FromResult(new RefreshReply { Token = newAccess });
        }

        public override Task<LogoutReply> Logout(LogoutRequest request, ServerCallContext context)
        {
            var http = context.GetHttpContext();
            http.Response.Cookies.Append("sv_refresh", "", new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.None,
                Path = "/",
                Expires = DateTimeOffset.UnixEpoch
            });
            return Task.FromResult(new LogoutReply { Success = true });
        }
        public override async Task<UserInteractionsReply> GetUserInteractions(UserInteractionsRequest request, ServerCallContext context)
        {
            if (string.IsNullOrWhiteSpace(request.UserId))
            {
                throw new RpcException(new Status(StatusCode.InvalidArgument, "UserId is required"));
            }
            const int InteractionLimit = 200;

            try
            {
                var db = _firestoreDb;

                var collectionRef = db.Collection("interactions");

                var query = collectionRef
                    .WhereEqualTo("UserId", request.UserId)
                    .OrderByDescending("Ts")
                    .Limit(InteractionLimit);

                var snapshot = await query.GetSnapshotAsync();

                var interactionsList = new List<InteractionReply>();

                foreach (var doc in snapshot.Documents)
                {
                    var interaction = new InteractionReply
                    {
                        Id = doc.Id
                    };

                    if (doc.TryGetValue<string>("UserId", out var userId))
                        interaction.UserId = userId;

                    if (doc.TryGetValue<string>("ISRC", out var isrc))
                        interaction.Isrc = isrc;

                    if (doc.TryGetValue<string>("Decision", out var decision))
                        interaction.Decision = decision;

                    if (doc.TryGetValue<long>("DeezerTrackId", out var deezerTrackId))
                        interaction.DeezerTrackId = deezerTrackId;

                    if (doc.TryGetValue<string>("Source", out var source))
                        interaction.Source = source;

                    if (doc.TryGetValue<string>("Artist", out var artist))
                        interaction.Artist = artist;

                    if (doc.TryGetValue<string>("Title", out var title))
                        interaction.Title = title;

                    interactionsList.Add(interaction);
                }

                var reply = new UserInteractionsReply();
                reply.Interactions.AddRange(interactionsList);

                return reply;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"GetUserInteractions error: {ex.Message}");
                throw new RpcException(new Status(StatusCode.Internal, $"GetUserInteractions error: {ex.Message}"));
            }
        }
        public override async Task<PlaylistReply> CreatePlaylist(CreatePlaylistRequest request, ServerCallContext context)
        {
            var userId = GetCurrentUserId(context);

            if (string.IsNullOrWhiteSpace(request.Name))
                throw new RpcException(new Status(StatusCode.InvalidArgument, "Playlist name is required"));

            var doc = await _firestoreDb.Collection("playlists").AddAsync(new PlaylistDoc
            {
                UserId = userId,
                Name = request.Name,
                CreatedAt = Google.Cloud.Firestore.Timestamp.FromDateTime(DateTime.UtcNow)
            });

            return new PlaylistReply
            {
                Id = doc.Id,
                Name = request.Name,
                CreatedAt = ProtoTimestamp.FromDateTime(DateTime.UtcNow)
            };
        }

        public override async Task<PlaylistsListReply> GetMyPlaylists(Empty request, ServerCallContext context)
        {
            var userId = GetCurrentUserId(context);
            // Assuming you added the method to FirestoreService, or accessing DB directly here for brevity:
            // Ideally, use the _firestoreService wrapper. I will use the wrapper I defined above.
            // Note: You need to inject FirestoreService into UserGrpcService if not already there.
            // Based on previous context, you injected FirestoreDb directly, but let's assume you use the wrapper logic.

            // Direct implementation using the _firestoreDb injected in previous snippet:
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
                    CreatedAt = ProtoTimestamp.FromDateTime(DateTime.UtcNow)
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
            if (snap.GetValue<string>("UserId") != userId) throw new RpcException(new Status(StatusCode.PermissionDenied, "Not your playlist"));

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

            await playlistRef.Collection("tracks").Document(request.DeezerTrackId.ToString()).SetAsync(trackDoc);

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
            if (snap.GetValue<string>("UserId") != userId) throw new RpcException(new Status(StatusCode.PermissionDenied, "Not your playlist"));

            await playlistRef.Collection("tracks").Document(request.DeezerTrackId.ToString()).DeleteAsync();

            return new DeleteReply { Success = true };
        }

        public override async Task<PlaylistTracksListReply> GetPlaylistTracks(GetPlaylistTracksRequest request, ServerCallContext context)
        {
            var userId = GetCurrentUserId(context);
            var playlistRef = _firestoreDb.Collection("playlists").Document(request.PlaylistId);
            var snap = await playlistRef.GetSnapshotAsync();

            if (!snap.Exists) throw new RpcException(new Status(StatusCode.NotFound, "Playlist not found"));
            // Check ownership (remove if you want shared playlists)
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
                    AddedAt = ProtoTimestamp.FromDateTime(DateTime.UtcNow)
                });
            }
            return reply;
        }
    }
}
