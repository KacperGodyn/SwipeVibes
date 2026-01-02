using Microsoft.Extensions.Configuration;
using Moq;
using SwipeVibesAPI.Utility;
using Xunit;
using System.Security.Claims;

namespace SwipeVibesAPI.Tests.Utility;

public class JwtServiceTests
{
    private readonly JwtService _sut;
    private readonly Mock<IConfiguration> _configMock;

    public JwtServiceTests()
    {
        _configMock = new Mock<IConfiguration>();
        
        _configMock.Setup(x => x["Jwt:Key"]).Returns("ThisIsASecretKeyForTestingOnly123456!");
        _configMock.Setup(x => x["Jwt:Issuer"]).Returns("SwipeVibesTest");
        _configMock.Setup(x => x["Jwt:Audience"]).Returns("SwipeVibesTestAudience");
        
        _sut = new JwtService(_configMock.Object);
    }

    [Fact]
    public void GenerateAccess_ShouldReturnToken_WhenInputsAreValid()
    {
        var username = "testuser";
        var role = "Admin";

        var token = _sut.GenerateAccess(username, role);
        Assert.False(string.IsNullOrWhiteSpace(token));
        Assert.Equal(3, token.Split('.').Length);
    }

    [Fact]
    public void ValidateAccess_ShouldReturnPrincipal_WhenTokenIsValid()
    {
        var username = "testuser";
        var role = "User";
        var token = _sut.GenerateAccess(username, role);
        var principal = _sut.ValidateAccess(token);

        Assert.NotNull(principal);
        Assert.Equal(username, principal.Identity?.Name);
        Assert.True(principal.IsInRole(role));
    }

    [Fact]
    public void ValidateRefresh_ShouldReturNull_WhenTokenIsAccessToken()
    {
        var token = _sut.GenerateAccess("user", "role");
        var result = _sut.ValidateRefresh(token);
        Assert.Null(result);
    }

    [Fact]
    public void ValidateRefresh_ShouldReturnPrincipal_WhenTokenIsRefreshToken()
    {
        var username = "refreshUser";
        var token = _sut.GenerateRefresh(username);
        var principal = _sut.ValidateRefresh(token);

        Assert.NotNull(principal);
        Assert.Equal(username, principal.Identity?.Name);
    }
}
