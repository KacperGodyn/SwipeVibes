using FirebaseAdmin;
using FirebaseAdmin.Auth;
using Google.Apis.Auth.OAuth2;

public static class FirebaseHelper
{
    public static void Initialize(string pathToServiceAccountJson)
    {
        if (FirebaseApp.DefaultInstance == null)
        {
            FirebaseApp.Create(new AppOptions()
            {
                Credential = GoogleCredential.FromFile(pathToServiceAccountJson)
            });
        }
    }

    public static async Task<string> CreateCustomToken(string uid)
    {
        return await FirebaseAuth.DefaultInstance.CreateCustomTokenAsync(uid);
    }
}
