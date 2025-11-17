using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SwipeVibesAPI.Services;
using System.Security.Claims;

[ApiController]
[Route("api/prefs")]
[Authorize(AuthenticationSchemes = "Firebase,AppJwt")]
public class PreferencesController : ControllerBase
{
    private readonly FirestoreService _fs;
    public PreferencesController(FirestoreService fs) => _fs = fs;

    public sealed class PrefsDto
    {
        public bool AudioMuted { get; set; }
    }

    [HttpGet]
    public async Task<ActionResult<PrefsDto>> Get()
    {
        var userId =
            User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? User.FindFirstValue("user_id");
        if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();

        var doc = await _fs.GetUserPrefsAsync(userId);
        return Ok(new PrefsDto { AudioMuted = doc?.AudioMuted ?? true });
    }

    [HttpPut]
    public async Task<IActionResult> Put([FromBody] PrefsDto body)
    {
        var userId =
            User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? User.FindFirstValue("user_id");
        if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();

        await _fs.SetUserPrefsAsync(userId, body.AudioMuted);
        return NoContent();
    }
}
