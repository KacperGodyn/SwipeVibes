using Microsoft.AspNetCore.Mvc;
using SwipeVibesAPI.Services;

namespace SwipeVibesAPI.Controllers
{
    [ApiController]
    [Route("api/test")]
    public class TestController : ControllerBase
    {
        [HttpGet("firebase-token/{uid}")]
        public async Task<IActionResult> GetFirebaseToken(string uid)
        {
            Console.WriteLine($"Request for Firebase token for UID: {uid}");
            FirebaseHelper.Initialize("C:\\Users\\Kacper\\Downloads\\swipevibes-31667-firebase-adminsdk-fbsvc-555fcb9971.json");
            var token = await FirebaseHelper.CreateCustomToken(uid);
            return Ok(new { token });
        }
    }
}
