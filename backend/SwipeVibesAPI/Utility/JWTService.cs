using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.Configuration;
using System.Text;

namespace SwipeVibesAPI.Utility;

public class JwtService
{
    private const string TypeClaim = "sv_type";
    private const string TypeAccess = "access";
    private const string TypeRefresh = "refresh";

    private readonly IConfiguration _config;
    private readonly JwtSecurityTokenHandler _handler = new();

    public JwtService(IConfiguration config) => _config = config;

    public string GenerateAccess(string username, string role, TimeSpan? ttl = null)
        => Generate(username, role, ttl ?? DefaultAccessTtl(), tokenType: TypeAccess);

    public string GenerateRefresh(string username, TimeSpan? ttl = null)
        => Generate(username, role: null, ttl ?? DefaultRefreshTtl(), tokenType: TypeRefresh);

    public ClaimsPrincipal? ValidateAccess(string token)
        => Validate(token, expectType: TypeAccess, forRefresh: false);

    public ClaimsPrincipal? ValidateRefresh(string token)
        => Validate(token, expectType: TypeRefresh, forRefresh: true);

    private string Generate(string username, string? role, TimeSpan ttl, string tokenType)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, username),
            new(ClaimTypes.NameIdentifier, username),
            new(ClaimTypes.Name, username),
            new(TypeClaim, tokenType)
        };

        if (!string.IsNullOrWhiteSpace(role))
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
            claims.Add(new Claim("role", role));
        }

        var creds = new SigningCredentials(GetSigningKey(forRefresh: tokenType == TypeRefresh), SecurityAlgorithms.HmacSha256);

        var issuer = _config["Jwt:Issuer"];
        var audience = _config["Jwt:Audience"];

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: DateTime.UtcNow.Add(ttl),
            signingCredentials: creds
        );

        return _handler.WriteToken(token);
    }

    private ClaimsPrincipal? Validate(string token, string expectType, bool forRefresh)
    {
        try
        {
            var principal = _handler.ValidateToken(token, BuildValidationParameters(forRefresh), out _);
            var type = principal.FindFirst(TypeClaim)?.Value;
            if (!string.Equals(type, expectType, StringComparison.Ordinal)) return null;
            return principal;
        }
        catch { return null; }
    }

    private TokenValidationParameters BuildValidationParameters(bool forRefresh) => new()
    {
        ValidateIssuer = true,
        ValidIssuer = _config["Jwt:Issuer"],
        ValidateAudience = true,
        ValidAudience = _config["Jwt:Audience"],
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = GetSigningKey(forRefresh),
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero,
    };

    private SymmetricSecurityKey GetSigningKey(bool forRefresh)
    {
        var key = forRefresh
            ? (_config["Jwt:RefreshKey"] ?? _config["Jwt:Key"])
            : _config["Jwt:Key"];

        if (string.IsNullOrWhiteSpace(key))
            throw new InvalidOperationException("JWT key not configured. Set Jwt:Key (and optionally Jwt:AccessKey/Jwt:RefreshKey).");

        var keyType = forRefresh ? "Refresh" : "Access";

        return new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
    }

    private TimeSpan DefaultAccessTtl()
        => int.TryParse(_config["Jwt:AccessMinutes"], out var minutes) && minutes > 0
           ? TimeSpan.FromMinutes(minutes) : TimeSpan.FromMinutes(15);

    private TimeSpan DefaultRefreshTtl()
        => int.TryParse(_config["Jwt:RefreshDays"], out var days) && days > 0
           ? TimeSpan.FromDays(days) : TimeSpan.FromDays(14);
}
