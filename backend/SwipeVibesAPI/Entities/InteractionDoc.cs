using Google.Cloud.Firestore;

namespace SwipeVibesAPI.Entities
{
    using FSTimestamp = Google.Cloud.Firestore.Timestamp;

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
        [FirestoreProperty] public string? Album { get; set; }
        [FirestoreProperty] public double? Bpm { get; set; }
        [FirestoreProperty] public double? Gain { get; set; }
        [FirestoreProperty] public int? Position { get; set; }
        [FirestoreProperty] public FSTimestamp Ts { get; set; }
    }
}