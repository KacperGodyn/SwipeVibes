using Grpc.Core;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using SwipeVibesAPI.Entities;
using SwipeVibesAPI.Services;
using SwipeVibesAPI.Utility;
using SwipeVibesAPI.Grpc;
using Xunit;
using Google.Cloud.Firestore;

namespace SwipeVibesAPI.Tests.Services;

public class UserGrpcServiceTests
{
    private readonly Mock<FirestoreService> _firestoreServiceMock;
    private readonly Mock<JwtService> _jwtServiceMock;
    private readonly Mock<IHttpClientFactory> _httpClientFactoryMock;
    private readonly Mock<ISpotifyService> _spotifyServiceMock;
    private readonly Mock<IConfiguration> _configurationMock;
    private readonly Mock<ILogger<UserGrpcService>> _loggerMock;
    private readonly Mock<ICookieService> _cookieServiceMock;
    private readonly Mock<IHttpContextAccessor> _httpContextAccessorMock;

    private readonly UserGrpcService _sut; 

    public UserGrpcServiceTests()
    {
        _spotifyServiceMock = new Mock<ISpotifyService>();
        _configurationMock = new Mock<IConfiguration>();
        _httpClientFactoryMock = new Mock<IHttpClientFactory>();
        _loggerMock = new Mock<ILogger<UserGrpcService>>();
        _cookieServiceMock = new Mock<ICookieService>();
        _httpContextAccessorMock = new Mock<IHttpContextAccessor>();
        
        var jwtConfigMock = new Mock<IConfiguration>();
        jwtConfigMock.Setup(x => x["Jwt:Key"]).Returns("TestKeyMustBeLongEnoughForHmacSha256Signature");
        jwtConfigMock.Setup(x => x["Jwt:Issuer"]).Returns("Test");
        jwtConfigMock.Setup(x => x["Jwt:Audience"]).Returns("Test");
        _jwtServiceMock = new Mock<JwtService>(jwtConfigMock.Object);

        _firestoreServiceMock = new Mock<FirestoreService>();

        _sut = new UserGrpcService(
            null!, 
            _jwtServiceMock.Object,
            _httpClientFactoryMock.Object,
            _spotifyServiceMock.Object,
            _configurationMock.Object,
            _firestoreServiceMock.Object,
            _loggerMock.Object,
            _cookieServiceMock.Object,
            _httpContextAccessorMock.Object
        );
    }

    [Fact]
    public async Task CreateUser_ShouldReturnUserReply_WhenUserIsNew()
    {
        var request = new CreateUserRequest
        {
            Username = "newuser",
            Email = "new@example.com",
            Password = "password123"
        };

        _firestoreServiceMock.Setup(x => x.GetUserByUsernameAsync(request.Username)).ReturnsAsync((UserDoc?)null);
        _firestoreServiceMock.Setup(x => x.GetUserByEmailAsync(request.Email)).ReturnsAsync((UserDoc?)null);
        _firestoreServiceMock.Setup(x => x.CreateUserAsync(It.IsAny<UserDoc>()))
            .ReturnsAsync((UserDoc u) => { u.Id = "generated_id"; return u; });

        var result = await _sut.CreateUser(request, TestHelpers.CreateCallContext());

        Assert.NotNull(result);
        Assert.Equal("generated_id", result.Id);
        _firestoreServiceMock.Verify(x => x.CreateUserAsync(It.IsAny<UserDoc>()), Times.Once);
    }

    [Fact]
    public async Task Login_ShouldReturnTokens_WhenCredentialsValid()
    {
        var request = new LoginRequest { Username = "validuser", Password = "password123" };
        var hashedPassword = BCrypt.Net.BCrypt.HashPassword(request.Password);
        var user = new UserDoc { Id = "u1", Username = "validuser", Password = hashedPassword, Role = "User" };

        _firestoreServiceMock.Setup(x => x.GetUserByUsernameAsync(request.Username)).ReturnsAsync(user);

        var result = await _sut.Login(request, TestHelpers.CreateCallContext());

        Assert.NotNull(result.Token);
        _cookieServiceMock.Verify(x => x.Append("sv_access", It.IsAny<string>(), It.IsAny<Microsoft.AspNetCore.Http.CookieOptions>()), Times.Once);
    }

    [Fact]
    public async Task Login_ShouldThrowUnauthenticated_WhenPasswordInvalid()
    {
        var request = new LoginRequest { Username = "validuser", Password = "wrongpassword" };
        var hashedPassword = BCrypt.Net.BCrypt.HashPassword("correctpassword");
        var user = new UserDoc { Id = "u1", Username = "validuser", Password = hashedPassword };

        _firestoreServiceMock.Setup(x => x.GetUserByUsernameAsync(request.Username)).ReturnsAsync(user);

        var ex = await Assert.ThrowsAsync<RpcException>(() => _sut.Login(request, TestHelpers.CreateCallContext()));
        Assert.Equal(StatusCode.Unauthenticated, ex.StatusCode);
    }

    [Fact]
    public async Task GetUser_ShouldReturnUser_WhenFound()
    {
        var request = new UserRequest { Id = "u1" };
        var user = new UserDoc { Id = "u1", Username = "testuser", Email = "test@test.com" };
        _firestoreServiceMock.Setup(x => x.GetUserByIdAsync("u1")).ReturnsAsync(user);

        var result = await _sut.GetUser(request, TestHelpers.CreateCallContext());

        Assert.Equal("testuser", result.Username);
    }

    [Fact]
    public async Task GetUser_ShouldThrowNotFound_WhenUserDoesNotExist()
    {
        var request = new UserRequest { Id = "missing" };
        _firestoreServiceMock.Setup(x => x.GetUserByIdAsync("missing")).ReturnsAsync((UserDoc?)null);

        var ex = await Assert.ThrowsAsync<RpcException>(() => _sut.GetUser(request, TestHelpers.CreateCallContext()));
        Assert.Equal(StatusCode.NotFound, ex.StatusCode);
    }

    [Fact]
    public async Task UpdateUser_ShouldThrowUnauthenticated_WhenContextMissing()
    {
        var request = new UpdateUserRequest { Username = "updated" };
        
        _httpContextAccessorMock.Setup(x => x.HttpContext).Returns((Microsoft.AspNetCore.Http.HttpContext)null!);

        var ex = await Assert.ThrowsAsync<RpcException>(() => _sut.UpdateUser(request, TestHelpers.CreateCallContext()));
        Assert.Equal(StatusCode.Unauthenticated, ex.StatusCode);
    }

    [Fact]
    public async Task UpdateUser_ShouldUpdateProfile_WhenUserIsAuthorized()
    {
        var userId = "u1";
        var request = new UpdateUserRequest { Id = userId, Username = "newname" };
        var user = new UserDoc { Id = userId, Username = "oldname" };

        var claims = new[] { new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Name, userId) };
        var identity = new System.Security.Claims.ClaimsIdentity(claims, "TestAuth");
        var claimsPrincipal = new System.Security.Claims.ClaimsPrincipal(identity);
        
        var mockHttpContext = new Mock<Microsoft.AspNetCore.Http.HttpContext>();
        mockHttpContext.Setup(c => c.User).Returns(claimsPrincipal);
        
        _httpContextAccessorMock.Setup(x => x.HttpContext).Returns(mockHttpContext.Object);

        _firestoreServiceMock.Setup(x => x.GetUserByIdAsync(userId)).ReturnsAsync(user);
        _firestoreServiceMock.Setup(x => x.UpdateUserAsync(It.IsAny<UserDoc>())).Returns(Task.CompletedTask);

        var result = await _sut.UpdateUser(request, TestHelpers.CreateCallContext());

        
        _firestoreServiceMock.Verify(x => x.GetUserByIdAsync(userId), Times.Once);
        _firestoreServiceMock.Verify(x => x.UpdateUserAsync(It.Is<UserDoc>(u => 
            u.Id == userId && 
            u.Username == "newname"
        )), Times.Once);
    }
}

public static class TestHelpers
{
    public static ServerCallContext CreateCallContext()
    {
        return new Mock<ServerCallContext>().Object;
    }
}
