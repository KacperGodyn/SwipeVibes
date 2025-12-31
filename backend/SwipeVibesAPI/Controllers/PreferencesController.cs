using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SwipeVibesAPI.Services;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;

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
        public bool AutoExportLikes { get; set; }
        public List<string> GenreFilters { get; set; } = new List<string>();
        public List<string> LanguageFilters { get; set; } = new List<string>();
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
        return Ok(new PrefsDto
        {
            AudioMuted = doc?.AudioMuted ?? true,
            AutoExportLikes = doc?.AutoExportLikes ?? false,
            GenreFilters = doc?.GenreFilters ?? new List<string>(),
            LanguageFilters = doc?.LanguageFilters ?? new List<string>()
        });
    }

    [HttpPut]
    public async Task<IActionResult> Put([FromBody] PrefsDto body)
    {
        var userId =
            User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? User.FindFirstValue("user_id");
        if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();

        await _fs.SetUserPrefsAsync(
            userId,
            body.AudioMuted,
            body.AutoExportLikes,
            body.GenreFilters ?? new List<string>(),
            body.LanguageFilters ?? new List<string>()
        );

        return NoContent();
    }
}