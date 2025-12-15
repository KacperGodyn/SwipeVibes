using Google.Cloud.Firestore;

namespace SwipeVibesAPI.Entities
{
    using FSTimestamp = Google.Cloud.Firestore.Timestamp;

    [FirestoreData]
    public class UserPrefsDoc
    {
        [FirestoreProperty] public bool AudioMuted { get; set; }
        [FirestoreProperty] public FSTimestamp UpdatedAt { get; set; }
    }
}