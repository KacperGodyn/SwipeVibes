using Google.Cloud.Firestore;
using System.Collections.Generic;

namespace SwipeVibesAPI.Entities
{
    using FSTimestamp = Google.Cloud.Firestore.Timestamp;

    [FirestoreData]
    public class UserPrefsDoc
    {
        [FirestoreProperty]
        public bool AudioMuted { get; set; }

        [FirestoreProperty]
        public bool AutoExportLikes { get; set; }

        [FirestoreProperty]
        public List<string> GenreFilters { get; set; } = new List<string>();

        [FirestoreProperty]
        public List<string> LanguageFilters { get; set; } = new List<string>();

        [FirestoreProperty]
        public string? SpotifyLikesPlaylistId { get; set; }

        [FirestoreProperty]
        public FSTimestamp UpdatedAt { get; set; }
    }
}