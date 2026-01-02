using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SwipeVibesAPI.Services;
using SwipeVibesAPI.Entities;
using System.Security.Claims;
using System.Threading.Tasks;

namespace SwipeVibesAPI.Controllers
{
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
            public string Decision { get; set; } = default!;
            public long? DeezerTrackId { get; set; }
            public string? Source { get; set; }
            public string? PreviewUrl { get; set; }
            public string? Artist { get; set; }
            public string? Title { get; set; }
            public string? Album { get; set; }
            public double? Bpm { get; set; }
            public double? Gain { get; set; }
            public int? Position { get; set; }
            public bool InstantSync { get; set; }
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
                Album = body.Album,
                Bpm = body.Bpm,
                Gain = body.Gain,
                Position = body.Position
            };

            var added = await _fs.AddInteractionAsync(doc);

            await _fs.UpdateUserStatsAsync(userId!, body.Decision.ToLowerInvariant(), body.Bpm, body.Artist);


            if (body.Decision.ToLowerInvariant() == "like" && body.InstantSync)
            {
                await _fs.ExportLikeToSpotifyAsync(userId!, body.Isrc);
            }

            return Ok(new { id = added.Id, ok = true });
        }
    }
}