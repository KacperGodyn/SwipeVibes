using DotNetEnv;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using SwipeVibesAPI.Services;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Grpc.AspNetCore.Web;
using SwipeVibesAPI.Utility;
using Google.Cloud.Firestore;
using Google.Apis.Auth.OAuth2;
using Google.Api.Gax.Grpc;
using Google.Cloud.AIPlatform.V1Beta1;
using System.Text;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;


var builder = WebApplication.CreateBuilder(args);

Env.Load();

builder.Services.AddGrpc();
builder.Services.AddHttpContextAccessor();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddSingleton<UserService>();
builder.Services.AddSingleton<JwtService>();
builder.Services.AddSingleton<FirestoreService>();
builder.Services.AddSingleton<UserGrpcService>();
builder.Services.AddSingleton<GeminiGrpcService>();

builder.Services.AddHttpClient("deezer", c =>
{
    c.BaseAddress = new Uri("https://api.deezer.com/");
});
builder.Services.AddTransient<SwipeVibesAPI.Grpc.DeezerGrpcService>();

var projectId =
    builder.Configuration["Firebase:ProjectId"]
    ?? Environment.GetEnvironmentVariable("GCLOUD_PROJECT")
    ?? "swipevibes-31667";

var saPath =
    builder.Configuration["Firebase:ServiceAccountPath"]
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

builder.Services.AddSingleton(provider =>
{
    if (string.IsNullOrWhiteSpace(saPath))
    {
        throw new InvalidOperationException(
            "Missing Service Account path. Set Firebase:ServiceAccountPath or FIREBASE_CREDENTIALS_JSON_PATH/GOOGLE_APPLICATION_CREDENTIALS.");
    }

    var credential = GoogleCredential
        .FromFile(saPath)
        .CreateScoped(Google.Cloud.Firestore.V1.FirestoreClient.DefaultScopes);

    return new FirestoreDbBuilder
    {
        ProjectId = projectId,
        Credential = credential
    }.Build();
});

builder.Services.AddSingleton(provider =>
{
    if (string.IsNullOrWhiteSpace(saPath))
    {
        throw new InvalidOperationException(
            "Missing Service Account path. Set Firebase:ServiceAccountPath or GOOGLE_APPLICATION_CREDENTIALS.");
    }

    var credential = GoogleCredential.FromFile(saPath)
        .CreateScoped(PredictionServiceClient.DefaultScopes);

    var location = builder.Configuration["GCP:Location"] ?? "us-central1";
    var endpoint = $"{location}-aiplatform.googleapis.com";

    var clientBuilder = new PredictionServiceClientBuilder
    {
        Endpoint = endpoint,
        Credential = credential
    };
    return clientBuilder.Build();
});

builder.Services
  .AddAuthentication(options =>
  {
      options.DefaultAuthenticateScheme = "AppJwt";
      options.DefaultChallengeScheme = "AppJwt";
  })
  .AddJwtBearer("Firebase", options =>
  {
      options.Authority = "https://securetoken.google.com/swipevibes-31667";
      options.TokenValidationParameters = new TokenValidationParameters
      {
          ValidateIssuer = true,
          ValidIssuer = "https://securetoken.google.com/swipevibes-31667",
          ValidateAudience = true,
          ValidAudience = "swipevibes-31667",
          ValidateLifetime = true,
          NameClaimType = JwtRegisteredClaimNames.Sub
      };
  })
  .AddJwtBearer("AppJwt", options =>
  {
    var validationKey = builder.Configuration["Jwt:Key"];

    // <<< DODAJ TE LINIE >>>
    var validationIssuer = builder.Configuration["Jwt:Issuer"];
    var validationAudience = builder.Configuration["Jwt:Audience"];
    Console.WriteLine($"[Program.cs] Walidator: Key='{validationKey?.Substring(0, 4)}...', Issuer='{validationIssuer}', Audience='{validationAudience}'");
    // <<< KONIEC >>>


    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidIssuer = validationIssuer, // Użyj zmiennej
        ValidateAudience = true,
        ValidAudience = validationAudience, // Użyj zmiennej
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(validationKey)),
        ValidateLifetime = true,
        ClockSkew = TimeSpan.FromSeconds(30),
        NameClaimType = ClaimTypes.Name,
        RoleClaimType = ClaimTypes.Role
    };
  });

builder.WebHost.ConfigureKestrel(options =>
{
    //// gRPC HTTP/2 endpoint
    //// #TODO: might add TLS later
    //options.ListenLocalhost(5000, o => o.Protocols = HttpProtocols.Http2);

    //// REST HTTP/1.1 endpoint
    ////options.ListenLocalhost(5001, o => o.Protocols = HttpProtocols.Http1);
    //options.ListenLocalhost(5001, o =>
    //{
    //    o.Protocols = HttpProtocols.Http1;
    //    o.UseHttps();
    //});

    options.ListenLocalhost(5001, o =>
    {
        o.Protocols = HttpProtocols.Http1AndHttp2;
        o.UseHttps();
    });
});

builder.Services.AddCors(o => o.AddPolicy("WebCors", p =>
{
    p.WithOrigins(
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "https://localhost:8081",
        "https://127.0.0.1:8081",
        "https://kacpergodyn.github.io"
    )
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials()
    .WithExposedHeaders("Grpc-Status", "Grpc-Message", "Grpc-Encoding", "Grpc-Accept-Encoding");
}));

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
app.MapGrpcService<SwipeVibesAPI.Grpc.DeezerGrpcService>().EnableGrpcWeb();
app.MapGrpcService<InteractionGrpcService>().EnableGrpcWeb();
app.MapGrpcService<GeminiGrpcService>().EnableGrpcWeb();

app.MapGet("/ping", () => "pong");

app.Run();
