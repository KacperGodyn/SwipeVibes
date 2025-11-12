using System.Linq;
using Microsoft.AspNetCore.Mvc;
using Google.Protobuf.WellKnownTypes;
using Proto = SwipeVibesAPI.Grpc;

[ApiController]
[Route("api/deezer")]
public class DeezerController : ControllerBase
{
    private readonly Proto.DeezerGrpcService _svc;

    public DeezerController(Proto.DeezerGrpcService svc)
    {
        _svc = svc;
    }

    [HttpGet("random-track")]
    public async Task<ActionResult<RandomTrackResponse>> GetRandomTrack(CancellationToken ct)
    {
        try
        {
            var track = await _svc.GetRandomTrackFromRandomStationAsync(ct);
            return Ok(RandomTrackResponse.FromProto(track));
        }
        catch (Grpc.Core.RpcException ex) when (ex.StatusCode == Grpc.Core.StatusCode.NotFound)
        {
            return NotFound(new { message = ex.Status.Detail });
        }
        catch (Grpc.Core.RpcException ex)
        {
            return StatusCode(502, new { message = "Upstream Deezer error", detail = ex.Status.Detail });
        }
    }


    // DTO
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
        string ExplicitContentLyrics,   // "Unspecified" / "Clean" / "Explicit"
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
            // Timestamp -> string (yyyy-MM-dd). t.ReleaseDate może być null.
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
                Bpm: t.Bpm,   // w .proto: double (nullable w runtime jako 0/hasValue nie dotyczy)
                Gain: t.Gain,
                CountryCodes: t.CountryCodes.ToArray(), // RepeatedField<string>
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
