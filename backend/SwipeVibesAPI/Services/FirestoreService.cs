using Google.Cloud.Firestore;
using System;
using System.Collections.Generic;
using System.Linq;
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
        public async Task<PlaylistDoc> CreatePlaylistAsync(string userId, string name)
        {
            var doc = new PlaylistDoc
            {
                UserId = userId,
                Name = name,
                CreatedAt = FSTimestamp.FromDateTime(DateTime.UtcNow)
            };

            var refDoc = await _db.Collection("playlists").AddAsync(doc);
            return doc;
            // Note: In a real app, you might want to return the ID separately or set it on the object, 
            // but AddAsync returns a DocumentReference which has the Id.
        }

        public async Task<List<(string Id, PlaylistDoc Doc)>> GetUserPlaylistsAsync(string userId)
        {
            var snapshot = await _db.Collection("playlists")
                .WhereEqualTo("UserId", userId)
                .OrderByDescending("CreatedAt")
                .GetSnapshotAsync();

            return snapshot.Documents
                .Select(d => (d.Id, d.ConvertTo<PlaylistDoc>()))
                .ToList();
        }

        public async Task<bool> DeletePlaylistAsync(string userId, string playlistId)
        {
            var docRef = _db.Collection("playlists").Document(playlistId);
            var snap = await docRef.GetSnapshotAsync();

            if (!snap.Exists) return false;
            var playlist = snap.ConvertTo<PlaylistDoc>();

            if (playlist.UserId != userId) return false;

            // Delete the main document (Firestore doesn't auto-delete subcollections, 
            // but for this scope, we will just delete the parent reference. 
            // In production, you should recursively delete the 'tracks' subcollection).
            await docRef.DeleteAsync();
            return true;
        }

        public async Task AddTrackToPlaylistAsync(string userId, string playlistId, PlaylistTrackDoc track)
        {
            var playlistRef = _db.Collection("playlists").Document(playlistId);
            var playlistSnap = await playlistRef.GetSnapshotAsync();
            if (!playlistSnap.Exists) throw new Exception("Playlist not found");
            if (playlistSnap.GetValue<string>("UserId") != userId) throw new Exception("Unauthorized");

            track.AddedAt = FSTimestamp.FromDateTime(DateTime.UtcNow);

            await playlistRef.Collection("tracks")
                .Document(track.DeezerTrackId.ToString())
                .SetAsync(track);
        }

        public async Task RemoveTrackFromPlaylistAsync(string userId, string playlistId, long deezerTrackId)
        {
            var playlistRef = _db.Collection("playlists").Document(playlistId);
            var playlistSnap = await playlistRef.GetSnapshotAsync();
            if (!playlistSnap.Exists) return;
            if (playlistSnap.GetValue<string>("UserId") != userId) throw new Exception("Unauthorized");

            await playlistRef.Collection("tracks").Document(deezerTrackId.ToString()).DeleteAsync();
        }

        public async Task<List<PlaylistTrackDoc>> GetPlaylistTracksAsync(string userId, string playlistId)
        {
            var playlistRef = _db.Collection("playlists").Document(playlistId);
            var playlistSnap = await playlistRef.GetSnapshotAsync();
            if (!playlistSnap.Exists) return new List<PlaylistTrackDoc>();

            var snapshot = await playlistRef.Collection("tracks").OrderByDescending("AddedAt").GetSnapshotAsync();
            return snapshot.Documents.Select(d => d.ConvertTo<PlaylistTrackDoc>()).ToList();
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

    [FirestoreData]
    public class PlaylistDoc
    {
        [FirestoreProperty] public string UserId { get; set; } = default!;
        [FirestoreProperty] public string Name { get; set; } = default!;
        [FirestoreProperty] public FSTimestamp CreatedAt { get; set; }
    }

    [FirestoreData]
    public class PlaylistTrackDoc
    {
        [FirestoreProperty] public long DeezerTrackId { get; set; }
        [FirestoreProperty] public string Title { get; set; } = default!;
        [FirestoreProperty] public string Isrc { get; set; } = default!;
        [FirestoreProperty] public long ArtistId { get; set; }
        [FirestoreProperty] public string ArtistName { get; set; } = default!;
        [FirestoreProperty] public string? AlbumCover { get; set; }
        [FirestoreProperty] public FSTimestamp AddedAt { get; set; }
    }
}