using DotNetEnv;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using SwipeVibesAPI.Services;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Grpc.AspNetCore.Web;
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
    // #TODO: might add TLS later
    options.ListenLocalhost(5000, o => o.Protocols = HttpProtocols.Http2);

    // REST HTTP/1.1 endpoint
    //options.ListenLocalhost(5001, o => o.Protocols = HttpProtocols.Http1);
    options.ListenLocalhost(5001, o =>
    {
        o.Protocols = HttpProtocols.Http1;
        o.UseHttps();
    });
});

builder.Services.AddCors(o => o.AddPolicy("WebCors", p =>
{
    p.WithOrigins(
        "http://localhost:8081",        // Expo web dev
        "http://127.0.0.1:8081",
        "https://kacpergodyn.github.io" // PROD
    )
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials()
    .WithExposedHeaders("Grpc-Status", "Grpc-Message", "Grpc-Encoding", "Grpc-Accept-Encoding");
}));

Env.Load();

var saPath = builder.Configuration["Firebase:ServiceAccountPath"]
            ?? Environment.GetEnvironmentVariable("FIREBASE_CREDENTIALS_JSON_PATH")
            ?? Environment.GetEnvironmentVariable("GOOGLE_APPLICATION_CREDENTIALS");

if (!string.IsNullOrWhiteSpace(saPath))
{
    FirebaseHelper.Initialize(saPath);
}
else
{
    Console.WriteLine("WARNING: Firebase Admin not initialized. Set Firebase:ServiceAccountPath or FIREBASE_CREDENTIALS_JSON_PATH.");
}


var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseGrpcWeb(new GrpcWebOptions { DefaultEnabled = true });

app.UseHttpsRedirection();
app.UseRouting();
app.UseCors("WebCors");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapGrpcService<UserGrpcService>().EnableGrpcWeb();

app.MapGet("/ping", () => "pong");

app.Run();
