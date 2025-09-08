using Grpc.Core;
using SwipeVibesAPI.Grpc;
using SwipeVibesAPI.Services;
using BCrypt.Net;

namespace SwipeVibesAPI.Services
{
    public class AuthService
    {
        private readonly UserService _userService;

        public AuthService(UserService userService)
        {
            _userService = userService;
        }

        public async Task<UserReply> Login(LoginRequest request)
        {
            var user = await _userService.GetUserByUsernameAsync(request.Username);
            if (user == null)
                throw new RpcException(new Status(StatusCode.NotFound, "User not found"));

            bool validPassword = BCrypt.Net.BCrypt.Verify(request.Password, user.Password);
            if (!validPassword)
                throw new RpcException(new Status(StatusCode.Unauthenticated, "Invalid password"));

            return new UserReply
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email
            };
        }
    }
}
