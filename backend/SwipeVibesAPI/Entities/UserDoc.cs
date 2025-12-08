using Google.Cloud.Firestore;

namespace SwipeVibesAPI.Entities
{
    [FirestoreData]
    public class UserDoc
    {
        [FirestoreDocumentId]
        public string Id { get; set; }

        [FirestoreProperty]
        public string Username { get; set; }

        [FirestoreProperty]
        public string Email { get; set; }

        [FirestoreProperty]
        public string Password { get; set; }

        [FirestoreProperty]
        public string Role { get; set; } = "User";

        [FirestoreProperty]
        public string? DeezerToken { get; set; }

        [FirestoreProperty]
        public string? AvatarUrl { get; set; }

        [FirestoreProperty]
        public string? FavoriteArtist { get; set; }

        [FirestoreProperty]
        public string? FavoriteGenre { get; set; }

        [FirestoreProperty]
        public double? AverageBpm { get; set; }
        [FirestoreProperty]
        public int? Likes { get; set; }
        [FirestoreProperty]
        public int? Dislikes { get; set; }
    }
}