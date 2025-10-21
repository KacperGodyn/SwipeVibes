//using Grpc.Core;
//using SwipeVibesAPI.Grpc;
//using SwipeVibesAPI.Services;
//using SwipeVibesAPI.Utility;
//using BCrypt.Net;
//using FirebaseAdmin.Auth;
//using System.Threading.Tasks;

//namespace SwipeVibesAPI.Services
//{
//    public class AuthService
//    {
//        private readonly UserService _userService;
//        private readonly JwtService _jwtService;

//        public AuthService(UserService userService, JwtService jwtService)
//        {
//            _userService = userService;
//            _jwtService = jwtService;
//        }

//        public async Task<LoginReply> Login(LoginRequest request)
//        {
//            if (!string.IsNullOrWhiteSpace(request.Provider) &&
//                request.Provider.Equals("google", StringComparison.OrdinalIgnoreCase))
//            {
//                try
//                {
//                    var decodedToken = await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(request.Token);
//                    var email = decodedToken.Claims.TryGetValue("email", out var v) ? v?.ToString() : null;
//                    if (string.IsNullOrWhiteSpace(email))
//                        throw new RpcException(new Status(StatusCode.Unauthenticated, "Google token missing email"));

//                    // find or create user
//                    var user = await _userService.GetUserByEmailAsync(email);
//                    if (user == null)
//                    {
//                        user = await _userService.RegisterUserAsync(new Entities.User
//                        {
//                            Username = email.Split('@')[0],
//                            Email = email,
//                            Password = string.Empty,
//                            Role = "User"
//                        });
//                    }

//                    var jwt = _jwtService.GenerateToken(user.Username, user.Role);

//                    return new LoginReply
//                    {
//                        Token = jwt,
//                        Username = user.Username,
//                        Role = user.Role
//                    };
//                }
//                catch (FirebaseAuthException ex)
//                {
//                    throw new RpcException(new Status(StatusCode.Unauthenticated, $"Invalid Google token: {ex.Message}"));
//                }
//            }

//            var dbUser = await _userService.GetUserByUsernameAsync(request.Username);
//            if (dbUser == null)
//                throw new RpcException(new Status(StatusCode.NotFound, "User not found"));

//            var validPassword = BCrypt.Net.BCrypt.Verify(request.Password, dbUser.Password);
//            if (!validPassword)
//                throw new RpcException(new Status(StatusCode.Unauthenticated, "Invalid password"));

//            var jwtToken = _jwtService.GenerateToken(dbUser.Username, dbUser.Role);

//            return new LoginReply
//            {
//                Token = jwtToken,
//                Username = dbUser.Username,
//                Role = dbUser.Role
//            };
//        }
//    }
//}
