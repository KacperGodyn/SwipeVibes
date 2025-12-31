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

        public async Task DeleteUserInteractionsAsync(string userId, string? decisionType = null)
        {
            Console.WriteLine($"[DeleteUserInteractions] Starting for user: {userId}, Decision: {decisionType ?? "ALL"}");

            var query = _db.Collection("interactions").WhereEqualTo("UserId", userId);

            if (!string.IsNullOrEmpty(decisionType))
            {
                query = query.WhereEqualTo("Decision", decisionType);
            }

            int totalDeleted = 0;
            while (true)
            {
                var snapshot = await query.Limit(500).GetSnapshotAsync();
                if (snapshot.Count == 0)
                {
                    Console.WriteLine("[DeleteUserInteractions] No more documents found.");
                    break;
                }

                Console.WriteLine($"[DeleteUserInteractions] Found batch of {snapshot.Count} documents. Deleting...");

                var batch = _db.StartBatch();
                foreach (var doc in snapshot.Documents)
                {
                    batch.Delete(doc.Reference);
                }
                await batch.CommitAsync();
                totalDeleted += snapshot.Count;
            }
            Console.WriteLine($"[DeleteUserInteractions] Total deleted: {totalDeleted}");
        }

        public async Task<UserPrefsDoc?> GetUserPrefsAsync(string userId)
        {
            var snap = await _db.Collection("user_prefs").Document(userId).GetSnapshotAsync();
            return snap.Exists ? snap.ConvertTo<UserPrefsDoc>() : null;
        }

        public Task SetUserPrefsAsync(string userId, bool audioMuted, bool autoExportLikes, List<string> genreFilters, List<string> languageFilters)
        {
            var doc = new UserPrefsDoc
            {
                AudioMuted = audioMuted,
                AutoExportLikes = autoExportLikes,
                GenreFilters = genreFilters ?? new List<string>(),
                LanguageFilters = languageFilters ?? new List<string>(),
                UpdatedAt = FSTimestamp.FromDateTime(DateTime.UtcNow)
            };
            return _db.Collection("user_prefs").Document(userId).SetAsync(doc, SetOptions.MergeAll);
        }

        public async Task ExportLikeToSpotifyAsync(string userId, string isrc)
        {
            try
            {
                var prefs = await GetUserPrefsAsync(userId);
                if (prefs == null || !prefs.AutoExportLikes) return;

                var accessToken = await GetSpotifyAccessTokenForUser(userId);
                if (string.IsNullOrEmpty(accessToken)) return;

                string? playlistId = prefs.SpotifyLikesPlaylistId;

                if (string.IsNullOrEmpty(playlistId))
                {
                    var spotifyUserId = await _spotifyService.GetSpotifyUserIdAsync(accessToken);
                    if (string.IsNullOrEmpty(spotifyUserId)) return;

                    playlistId = await _spotifyService.CreatePlaylistAsync(spotifyUserId, "SwipeVibes Likes", accessToken);

                    if (!string.IsNullOrEmpty(playlistId))
                    {
                        await _db.Collection("user_prefs").Document(userId).UpdateAsync("SpotifyLikesPlaylistId", playlistId);
                    }
                    else
                    {
                        return;
                    }
                }

                var trackUri = await _spotifyService.SearchTrackByIsrcAsync(isrc, accessToken);
                if (!string.IsNullOrEmpty(trackUri))
                {
                    await _spotifyService.AddTracksToPlaylistAsync(playlistId, new List<string> { trackUri }, accessToken);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error exporting like to Spotify: {ex.Message}");
            }
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
            Console.WriteLine($"[DeletePlaylist] Attempting to delete playlist: {playlistId}");
            var docRef = _db.Collection("playlists").Document(playlistId);
            var snap = await docRef.GetSnapshotAsync();

            if (!snap.Exists)
            {
                Console.WriteLine("[DeletePlaylist] Playlist not found.");
                return false;
            }

            var playlist = snap.ConvertTo<PlaylistDoc>();
            if (playlist.UserId != userId)
            {
                Console.WriteLine("[DeletePlaylist] Unauthorized user.");
                return false;
            }

            var tracksQuery = docRef.Collection("tracks");
            int deletedTracks = 0;
            while (true)
            {
                var tracksSnap = await tracksQuery.Limit(500).GetSnapshotAsync();
                if (tracksSnap.Count == 0) break;

                var batch = _db.StartBatch();
                foreach (var t in tracksSnap.Documents)
                {
                    batch.Delete(t.Reference);
                }
                await batch.CommitAsync();
                deletedTracks += tracksSnap.Count;
            }
            Console.WriteLine($"[DeletePlaylist] Deleted {deletedTracks} tracks from subcollection.");

            await docRef.DeleteAsync();
            Console.WriteLine("[DeletePlaylist] Playlist document deleted.");
            return true;
        }

        public async Task DeleteAllUserPlaylistsAsync(string userId, bool unsubscribeSpotify)
        {
            Console.WriteLine($"[DeleteAllPlaylists] Starting for user {userId}. UnsubSpotify: {unsubscribeSpotify}");
            var playlists = await GetUserPlaylistsAsync(userId);
            string? accessToken = null;

            if (unsubscribeSpotify)
            {
                accessToken = await GetSpotifyAccessTokenForUser(userId);
            }

            foreach (var (id, doc) in playlists)
            {
                if (unsubscribeSpotify && !string.IsNullOrEmpty(accessToken) && !string.IsNullOrEmpty(doc.SpotifyPlaylistId))
                {
                    try
                    {
                        Console.WriteLine($"[DeleteAllPlaylists] Unfollowing Spotify playlist: {doc.SpotifyPlaylistId}");
                        await _spotifyService.UnfollowPlaylistAsync(doc.SpotifyPlaylistId, accessToken);
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Failed to unfollow spotify playlist {doc.SpotifyPlaylistId}: {ex.Message}");
                    }
                }

                await DeletePlaylistAsync(userId, id);
            }
        }

        public async Task DeleteUserAccountAsync(string userId)
        {
            Console.WriteLine($"[DeleteAccount] Wiping data for user {userId}");

            await DeleteUserInteractionsAsync(userId);

            await DeleteAllUserPlaylistsAsync(userId, false);

            Console.WriteLine("[DeleteAccount] Deleting user prefs...");
            await _db.Collection("user_prefs").Document(userId).DeleteAsync();

            Console.WriteLine("[DeleteAccount] Deleting user doc...");
            await _db.Collection("users").Document(userId).DeleteAsync();

            Console.WriteLine("[DeleteAccount] Wipe complete.");
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