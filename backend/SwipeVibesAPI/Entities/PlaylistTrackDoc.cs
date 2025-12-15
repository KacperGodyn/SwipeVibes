using Google.Cloud.Firestore;

namespace SwipeVibesAPI.Entities
{
    using FSTimestamp = Google.Cloud.Firestore.Timestamp;

    [FirestoreData]
    public class PlaylistTrackDoc
    {
        [FirestoreProperty] public long DeezerTrackId { get; set; }
        [FirestoreProperty] public string Title { get; set; } = default!;
        [FirestoreProperty] public string Isrc { get; set; } = default!;
        [FirestoreProperty] public long ArtistId { get; set; }
        [FirestoreProperty] public string ArtistName { get; set; } = default!;
        [FirestoreProperty] public string? AlbumCover { get; set; }

        [FirestoreProperty] public string? SpotifyUri { get; set; }

        [FirestoreProperty] public FSTimestamp AddedAt { get; set; }
    }
}