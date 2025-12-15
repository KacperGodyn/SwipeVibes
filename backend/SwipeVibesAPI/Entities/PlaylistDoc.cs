using Google.Cloud.Firestore;

namespace SwipeVibesAPI.Entities
{
    [FirestoreData]
    public class PlaylistDoc
    {
        [FirestoreDocumentId]
        public string Id { get; set; }

        [FirestoreProperty]
        public string UserId { get; set; }

        [FirestoreProperty]
        public string Name { get; set; }

        [FirestoreProperty]
        public string? SpotifyPlaylistId { get; set; }

        [FirestoreProperty]
        public Timestamp CreatedAt { get; set; }
    }
}