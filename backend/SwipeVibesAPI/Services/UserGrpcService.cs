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

namespace SwipeVibesAPI.Services
{
    public class UserGrpcService : SwipeVibesAPI.Grpc.UserService.UserServiceBase
    {
        private readonly UserService _userService;
        private readonly JwtService _jwtService;
        private readonly IWebHostEnvironment _env;
        private readonly IHttpClientFactory _httpClientFactory;

        public UserGrpcService(UserService userService, JwtService jwtService, IWebHostEnvironment env, IHttpClientFactory httpClientFactory)
        {
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

        public override async Task<LoginReply> Login(LoginRequest request, ServerCallContext context)
        {
            Entities.User user;

            // OAuth providers
            if (!string.IsNullOrWhiteSpace(request.Provider))
            {
                if (IsProvider(request.Provider, "google"))
                {
                    // request.Token must be a Firebase ID token
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
                    // request.Token must be a Spotify access token
                    var (email, spotifyId) = await VerifySpotifyAndGetProfileAsync(request.Token);

                    // Prefer email if available; otherwise fall back to a stable username key
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
                        // Some Spotify accounts may not expose email without scope.
                        // Use a deterministic username, and store a placeholder email
                        var uname = $"spotify:{spotifyId}";
                        user = await _userService.GetUserByUsernameAsync(uname)
                               ?? await _userService.RegisterUserAsync(new User
                               {
                                   Username = uname,
                                   Email = $"user+{spotifyId}@spotify.local", // placeholder to satisfy non-null
                                   Password = string.Empty,
                                   Role = "User"
                               });
                    }
                }
                // Unsupported provider, will add others later
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
                Secure = !_env.IsDevelopment(),
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
    }
}
