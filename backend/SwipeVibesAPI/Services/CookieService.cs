using Microsoft.AspNetCore.Http;
using System;

namespace SwipeVibesAPI.Services
{
    public interface ICookieService
    {
        void Append(string key, string value, CookieOptions options);
        string? Get(string key);
    }

    public class CookieService : ICookieService
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        public CookieService(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        public void Append(string key, string value, CookieOptions options)
        {
            _httpContextAccessor.HttpContext?.Response.Cookies.Append(key, value, options);
        }

        public string? Get(string key)
        {
            return _httpContextAccessor.HttpContext?.Request.Cookies[key];
        }
    }
}
