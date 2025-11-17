using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using SwipeVibesAPI.Services;

[Authorize(AuthenticationSchemes = "AppJwt,Firebase")]
[ApiController]
[Route("api/interactions")]
public class InteractionsController : ControllerBase
{
    private readonly FirestoreService _fs;

    public InteractionsController(FirestoreService fs)
    {
        _fs = fs;
    }

    public sealed class InteractionDto
    {
        public string Isrc { get; set; } = default!;
        public string Decision { get; set; } = default!; // like|dislike|skip|impression
        public long? DeezerTrackId { get; set; }
        public string? Source { get; set; }
        public string? PreviewUrl { get; set; }
        public string? Artist { get; set; }
        public string? Title { get; set; }
        public string? Album { get; set; }
        public double? Bpm { get; set; }
        public double? Gain { get; set; }
    }

    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Log([FromBody] InteractionDto body)
    {
        if (string.IsNullOrWhiteSpace(body.Isrc))
            return BadRequest("isrc required");
        if (string.IsNullOrWhiteSpace(body.Decision))
            return BadRequest("decision required");

        var userId =
            User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? User.FindFirstValue("user_id");

        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized();

        var doc = new InteractionDoc
        {
            UserId = userId!,
            Isrc = body.Isrc,
            Decision = body.Decision.ToLowerInvariant(),
            DeezerTrackId = body.DeezerTrackId,
            Source = body.Source,
            PreviewUrl = body.PreviewUrl,
            Artist = body.Artist,
            Title = body.Title,
        };
        var added = await _fs.AddInteractionAsync(doc);

        return Ok(new { id = added.Id, ok = true });
    }
}
