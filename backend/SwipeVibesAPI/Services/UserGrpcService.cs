using Grpc.Core;
using Microsoft.AspNetCore.Authorization;
using SwipeVibesAPI.Entities;
using SwipeVibesAPI.Grpc;
using BCrypt.Net;
using SwipeVibesAPI.Utility;
using FirebaseAdmin.Auth;

namespace SwipeVibesAPI.Services
{
    public class UserGrpcService : SwipeVibesAPI.Grpc.UserService.UserServiceBase
    {
        private readonly UserService _userService;
        private readonly JwtService _jwtService;
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

        public UserGrpcService(UserService userService, JwtService jwtService)
        {
            _userService = userService;
            _jwtService = jwtService;
        }

        public override async Task<UserReply> CreateUser(CreateUserRequest request, ServerCallContext context)
        {

            var authHeader = context.RequestHeaders
    .FirstOrDefault(h => h.Key == "authorization")?.Value;

            if (authHeader == null || !authHeader.StartsWith("Bearer "))
                throw new RpcException(new Status(StatusCode.Unauthenticated, "Missing token"));

            string token = authHeader.Substring("Bearer ".Length);
            var firebaseToken = await VerifyToken(token);

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

            var authHeader = context.RequestHeaders
    .FirstOrDefault(h => h.Key == "authorization")?.Value;

            if (authHeader == null || !authHeader.StartsWith("Bearer "))
                throw new RpcException(new Status(StatusCode.Unauthenticated, "Missing token"));

            string token = authHeader.Substring("Bearer ".Length);
            var firebaseToken = await VerifyToken(token);

            var user = await _userService.GetUserByIdAsync(request.Id);
            if (user == null)
                throw new RpcException(new Status(StatusCode.NotFound, "User not found"));

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
            var user = await _userService.GetUserByIdAsync(request.Id);
            if (user == null)
                throw new RpcException(new Status(StatusCode.NotFound, "User not found"));

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
            var user = await _userService.GetUserByUsernameAsync(request.Username);
            if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.Password))
                throw new RpcException(new Status(StatusCode.Unauthenticated, "Invalid username or password"));

            string token = _jwtService.GenerateToken(user.Username, user.Role);

            return new LoginReply
            {
                Token = token,
                Username = user.Username,
                Role = user.Role
            };
        }
    }
}