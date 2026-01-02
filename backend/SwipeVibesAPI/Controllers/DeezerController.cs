using System.Linq;
using Microsoft.AspNetCore.Mvc;
using Google.Protobuf.WellKnownTypes;
using Proto = SwipeVibesAPI.Grpc;
using SwipeVibesAPI.Services;
using SwipeVibesAPI.Entities;
using Microsoft.AspNetCore.Authorization;
using Grpc.Core;

[ApiController]
[Route("api/deezer")]
public class DeezerController : ControllerBase
{
    private readonly Proto.DeezerGrpcService _svc;
    private readonly FirestoreService _fs;
    private readonly ILogger<DeezerController> _logger;

    public DeezerController(Proto.DeezerGrpcService svc, FirestoreService fs, ILogger<DeezerController> logger)
    {
        _svc = svc;
        _fs = fs;
        _logger = logger;
    }

    [Authorize(AuthenticationSchemes = "AppJwt")]
    [HttpGet("recommendation")]
    public async Task<ActionResult<RandomTrackResponse>> GetRecommendation(CancellationToken ct)
    {
        var userId = HttpContext.User?.Identity?.Name;
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized(new { message = "Brak uwierzytelnienia. Nie można pobrać rekomendacji." });
        }

        try
        {
            var t = await _svc.GetAiRecommendedTrackAsync(userId, ct);

            var dto = RandomTrackResponse.FromProto(t);

            _ = _fs.AddInteractionAsync(new InteractionDoc
            {
                UserId = userId,
                Isrc = dto.Isrc ?? "",
                Decision = "impression",
                DeezerTrackId = dto.Id,
                Source = "gemini/recommendation",
                PreviewUrl = dto.Preview,
                Artist = dto.Artists?.FirstOrDefault()?.Name,
                Title = dto.Title
            });

            return Ok(dto);
        }
        catch (RpcException ex)
        {
            _logger.LogError(ex, "Błąd podczas pobierania rekomendacji dla {UserId}", userId);

            var statusCode = ex.Status.StatusCode switch
            {
                global::Grpc.Core.StatusCode.NotFound => 404,
                global::Grpc.Core.StatusCode.Internal => 500,
                global::Grpc.Core.StatusCode.Unauthenticated => 401,
                _ => 500
            };
            return StatusCode(statusCode, new { message = ex.Status.Detail });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Nieoczekiwany błąd podczas pobierania rekomendacji dla {UserId}", userId);
            return StatusCode(500, new { message = "Wystąpił wewnętrzny błąd serwera." });
        }
    }


    public sealed record RandomTrackResponse(
        long Id,
        string Title,
        string? TitleShort,
        string? Isrc,
        string? Link,
        string? Share,
        int TrackPosition,
        int DiskNumber,
        int Rank,
        string? ReleaseDate,
        bool ExplicitLyrics,
        string ExplicitContentLyrics,
        string ExplicitCover,
        string? Preview,
        double? Bpm,
        double? Gain,
        string[] CountryCodes,
        List<ArtistDto> Artists,
        AlbumDto Album
    )
    {
        public static RandomTrackResponse FromProto(Proto.Track t)
        {
            string? release = t.ReleaseDate != null
                ? t.ReleaseDate.ToDateTime().ToUniversalTime().ToString("yyyy-MM-dd")
                : null;

            return new RandomTrackResponse(
                Id: t.Id,
                Title: t.Title,
                TitleShort: t.TitleShort,
                Isrc: t.Isrc,
                Link: t.Link,
                Share: t.Share,
                TrackPosition: t.TrackPosition,
                DiskNumber: t.DiskNumber,
                Rank: t.Rank,
                ReleaseDate: release,
                ExplicitLyrics: t.ExplicitLyrics,
                ExplicitContentLyrics: t.ExplicitContentLyrics.ToString(),
                ExplicitCover: t.ExplicitCover.ToString(),
                Preview: t.Preview,
                Bpm: t.Bpm,
                Gain: t.Gain,
                CountryCodes: t.CountryCodes.ToArray(),
                Artists: t.Artists.Select(a => new ArtistDto(
                    a.Id, a.Name, a.Link, a.Picture, a.PictureSmall, a.PictureMedium, a.PictureBig, a.PictureXl, a.Tracklist
                )).ToList(),
                Album: new AlbumDto(
                    t.Album?.Id ?? 0,
                    t.Album?.Title ?? "",
                    t.Album?.Cover ?? "",
                    t.Album?.CoverSmall ?? "",
                    t.Album?.CoverMedium ?? "",
                    t.Album?.CoverBig ?? "",
                    t.Album?.CoverXl ?? "",
                    t.Album?.Tracklist ?? ""
                )
            );
        }
    }

    public sealed record ArtistDto(
        long Id,
        string Name,
        string Link,
        string Picture,
        string? PictureSmall,
        string? PictureMedium,
        string? PictureBig,
        string? PictureXl,
        string Tracklist
    );

    public sealed record AlbumDto(
        long Id,
        string Title,
        string Cover,
        string? CoverSmall,
        string? CoverMedium,
        string? CoverBig,
        string? CoverXl,
        string Tracklist
    );
}