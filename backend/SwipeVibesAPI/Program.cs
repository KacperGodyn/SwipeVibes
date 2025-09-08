using DotNetEnv;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using SwipeVibesAPI.Services;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using SwipeVibesAPI.Utility;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddGrpc();
builder.Services.AddHttpContextAccessor();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSingleton<UserService>();
builder.Services.AddSingleton<JwtService>();

Env.Load();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = "https://securetoken.google.com/swipevibes-31667";
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = $"https://securetoken.google.com/swipevibes-31667",
            ValidateAudience = true,
            ValidAudience = "swipevibes-31667",
            ValidateLifetime = true
        };
    });

builder.WebHost.ConfigureKestrel(options =>
{
    // gRPC HTTP/2 endpoint
    options.ListenLocalhost(5000, o => o.Protocols = HttpProtocols.Http2);

    // REST HTTP/1.1 endpoint
    options.ListenLocalhost(5001, o => o.Protocols = HttpProtocols.Http1);
});


var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapGrpcService<UserGrpcService>();
app.MapGet("/ping", () => "pong");

app.Run();
