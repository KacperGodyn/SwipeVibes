using Google.Cloud.Firestore;
using SwipeVibesAPI.Entities;
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
        private readonly ISpotifyService _spotifyService;

        public FirestoreService(FirestoreDb db, ISpotifyService spotifyService)
        {
            _db = db;
            _spotifyService = spotifyService;
        }

        private async Task<string?> GetSpotifyAccessTokenForUser(string userId)
        {
            var snap = await _db.Collection("users").Document(userId).GetSnapshotAsync();
            if (!snap.Exists) return null;

            var user = snap.ConvertTo<UserDoc>();
            if (string.IsNullOrEmpty(user.SpotifyRefreshToken)) return null;

            var tokenResponse = await _spotifyService.RefreshAccessTokenAsync(user.SpotifyRefreshToken);
            return tokenResponse?.AccessToken;
        }

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
            doc.Id = refDoc.Id;

            try
            {
                var accessToken = await GetSpotifyAccessTokenForUser(userId);
                if (!string.IsNullOrEmpty(accessToken))
                {
                    var spotifyUserId = await _spotifyService.GetSpotifyUserIdAsync(accessToken);
                    if (!string.IsNullOrEmpty(spotifyUserId))
                    {
                        var spotifyPlaylistId = await _spotifyService.CreatePlaylistAsync(spotifyUserId, name, accessToken);
                        if (!string.IsNullOrEmpty(spotifyPlaylistId))
                        {
                            await refDoc.UpdateAsync("SpotifyPlaylistId", spotifyPlaylistId);
                            doc.SpotifyPlaylistId = spotifyPlaylistId;
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error creating Spotify playlist: {ex.Message}");
            }

            return doc;
        }

        public async Task<List<(string Id, PlaylistDoc Doc)>> GetUserPlaylistsAsync(string userId)
        {
            var snapshot = await _db.Collection("playlists")
                .WhereEqualTo("UserId", userId)
                .OrderByDescending("CreatedAt")
                .GetSnapshotAsync();

            return snapshot.Documents
                .Select(d =>
                {
                    var p = d.ConvertTo<PlaylistDoc>();
                    p.Id = d.Id;
                    return (d.Id, p);
                })
                .ToList();
        }

        public async Task<bool> DeletePlaylistAsync(string userId, string playlistId)
        {
            var docRef = _db.Collection("playlists").Document(playlistId);
            var snap = await docRef.GetSnapshotAsync();

            if (!snap.Exists) return false;
            var playlist = snap.ConvertTo<PlaylistDoc>();

            if (playlist.UserId != userId) return false;

            await docRef.DeleteAsync();
            return true;
        }

        public async Task AddTrackToPlaylistAsync(string userId, string playlistId, PlaylistTrackDoc track)
        {
            var playlistRef = _db.Collection("playlists").Document(playlistId);
            var playlistSnap = await playlistRef.GetSnapshotAsync();
            if (!playlistSnap.Exists) throw new Exception("Playlist not found");

            var playlistData = playlistSnap.ConvertTo<PlaylistDoc>();
            if (playlistData.UserId != userId) throw new Exception("Unauthorized");

            track.AddedAt = FSTimestamp.FromDateTime(DateTime.UtcNow);

            var trackRef = playlistRef.Collection("tracks").Document(track.DeezerTrackId.ToString());
            await trackRef.SetAsync(track);

            if (!string.IsNullOrEmpty(playlistData.SpotifyPlaylistId))
            {
                try
                {
                    var accessToken = await GetSpotifyAccessTokenForUser(userId);
                    if (!string.IsNullOrEmpty(accessToken))
                    {
                        var spotifyUri = await _spotifyService.SearchTrackByIsrcAsync(track.Isrc, accessToken);
                        if (!string.IsNullOrEmpty(spotifyUri))
                        {
                            var success = await _spotifyService.AddTracksToPlaylistAsync(playlistData.SpotifyPlaylistId, new List<string> { spotifyUri }, accessToken);
                            if (success)
                            {
                                await trackRef.UpdateAsync("SpotifyUri", spotifyUri);
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error adding track to Spotify: {ex.Message}");
                }
            }
        }

        public async Task RemoveTrackFromPlaylistAsync(string userId, string playlistId, long deezerTrackId)
        {
            var playlistRef = _db.Collection("playlists").Document(playlistId);
            var playlistSnap = await playlistRef.GetSnapshotAsync();
            if (!playlistSnap.Exists) return;

            var playlistData = playlistSnap.ConvertTo<PlaylistDoc>();
            if (playlistData.UserId != userId) throw new Exception("Unauthorized");

            var trackRef = playlistRef.Collection("tracks").Document(deezerTrackId.ToString());
            var trackSnap = await trackRef.GetSnapshotAsync();

            if (trackSnap.Exists)
            {
                var trackData = trackSnap.ConvertTo<PlaylistTrackDoc>();
                if (!string.IsNullOrEmpty(playlistData.SpotifyPlaylistId) && !string.IsNullOrEmpty(trackData.SpotifyUri))
                {
                    try
                    {
                        var accessToken = await GetSpotifyAccessTokenForUser(userId);
                        if (!string.IsNullOrEmpty(accessToken))
                        {
                            await _spotifyService.RemoveTrackFromPlaylistAsync(playlistData.SpotifyPlaylistId, trackData.SpotifyUri, accessToken);
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Error removing track from Spotify: {ex.Message}");
                    }
                }

                await trackRef.DeleteAsync();
            }
        }

        public async Task<List<PlaylistTrackDoc>> GetPlaylistTracksAsync(string userId, string playlistId)
        {
            var playlistRef = _db.Collection("playlists").Document(playlistId);
            var playlistSnap = await playlistRef.GetSnapshotAsync();
            if (!playlistSnap.Exists) return new List<PlaylistTrackDoc>();

            var snapshot = await playlistRef.Collection("tracks").OrderByDescending("AddedAt").GetSnapshotAsync();
            return snapshot.Documents.Select(d => d.ConvertTo<PlaylistTrackDoc>()).ToList();
        }

        public async Task UpdateUserStatsAsync(string userId, string decision, double? bpm, string? artist)
        {
            var userRef = _db.Collection("users").Document(userId);

            await _db.RunTransactionAsync(async transaction =>
            {
                var snapshot = await transaction.GetSnapshotAsync(userRef);

                long currentLikes = snapshot.Exists && snapshot.ContainsField("Likes") ? snapshot.GetValue<long?>("Likes") ?? 0 : 0;
                double currentAvgBpm = snapshot.Exists && snapshot.ContainsField("AverageBpm") ? snapshot.GetValue<double?>("AverageBpm") ?? 0 : 0;

                var updates = new Dictionary<string, object>();

                if (decision == "like")
                {
                    updates["Likes"] = FieldValue.Increment(1);

                    if (bpm.HasValue && bpm.Value > 0)
                    {
                        double newAvg = currentLikes == 0 ? bpm.Value : ((currentAvgBpm * currentLikes) + bpm.Value) / (currentLikes + 1);
                        updates["AverageBpm"] = newAvg;
                    }

                    if (!string.IsNullOrEmpty(artist))
                    {
                        updates["FavoriteArtist"] = artist;
                    }
                }
                else if (decision == "dislike")
                {
                    updates["Dislikes"] = FieldValue.Increment(1);
                }

                if (snapshot.Exists)
                {
                    transaction.Update(userRef, updates);
                }
                else
                {
                    transaction.Set(userRef, updates, SetOptions.MergeAll);
                }
            });
        }
    }
}