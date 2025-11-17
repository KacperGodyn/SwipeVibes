using Google.Cloud.Firestore;
using System;
using System.Threading.Tasks;

namespace SwipeVibesAPI.Services
{
    using FSTimestamp = Google.Cloud.Firestore.Timestamp;

    public class FirestoreService
    {
        private readonly FirestoreDb _db;
        public FirestoreService(FirestoreDb db) => _db = db;

        public Task<DocumentReference> AddInteractionAsync(InteractionDoc doc)
        {
            doc.Ts = FSTimestamp.FromDateTime(DateTime.UtcNow);
            return _db.Collection("interactions").AddAsync(doc);
        }

        public async Task<UserPrefsDoc?> GetUserPrefsAsync(string userId)
        {
            var snap = await _db.Collection("user_prefs").Document(userId).GetSnapshotAsync();
            return snap.Exists ? snap.ConvertTo<UserPrefsDoc>() : null;
        }

        public Task SetUserPrefsAsync(string userId, bool audioMuted)
        {
            var doc = new UserPrefsDoc
            {
                AudioMuted = audioMuted,
                UpdatedAt = FSTimestamp.FromDateTime(DateTime.UtcNow)
            };
            return _db.Collection("user_prefs").Document(userId).SetAsync(doc, SetOptions.MergeAll);
        }
    }

    [FirestoreData]
    public class UserPrefsDoc
    {
        [FirestoreProperty] public bool AudioMuted { get; set; }
        [FirestoreProperty] public FSTimestamp UpdatedAt { get; set; }
    }

    [FirestoreData]
    public class InteractionDoc
    {
        [FirestoreProperty] public string UserId { get; set; } = default!;
        [FirestoreProperty] public string Isrc { get; set; } = default!;
        [FirestoreProperty] public string Decision { get; set; } = default!;
        [FirestoreProperty] public long? DeezerTrackId { get; set; }
        [FirestoreProperty] public string? Source { get; set; }
        [FirestoreProperty] public string? PreviewUrl { get; set; }
        [FirestoreProperty] public string? Artist { get; set; }
        [FirestoreProperty] public string? Title { get; set; }
        [FirestoreProperty] public FSTimestamp Ts { get; set; }
    }
}
