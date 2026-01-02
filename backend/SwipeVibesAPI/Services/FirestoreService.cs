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

        protected FirestoreService() { }

        public virtual async Task<UserDoc?> GetUserByIdAsync(string id)
        {
            var docRef = _db.Collection("users").Document(id);
            var snapshot = await docRef.GetSnapshotAsync();
            return snapshot.Exists ? snapshot.ConvertTo<UserDoc>() : null;
        }

        public virtual async Task<UserDoc?> GetUserByEmailAsync(string email)
        {
            var snapshot = await _db.Collection("users").WhereEqualTo("Email", email).Limit(1).GetSnapshotAsync();
            return snapshot.Documents.FirstOrDefault()?.ConvertTo<UserDoc>();
        }

        public virtual async Task<UserDoc?> GetUserByUsernameAsync(string username)
        {
            var snapshot = await _db.Collection("users").WhereEqualTo("Username", username).Limit(1).GetSnapshotAsync();
            return snapshot.Documents.FirstOrDefault()?.ConvertTo<UserDoc>();
        }

        public virtual async Task<UserDoc> CreateUserAsync(UserDoc user)
        {
            var refDoc = await _db.Collection("users").AddAsync(user);
            user.Id = refDoc.Id;
            return user;
        }

        public virtual async Task UpdateUserAsync(UserDoc user)
        {
             if (string.IsNullOrEmpty(user.Id)) throw new ArgumentException("User ID is required for update.");
             await _db.Collection("users").Document(user.Id).SetAsync(user, SetOptions.MergeAll);
        }

        public virtual async Task UpdateUserCookiesAcceptedAsync(string userId, bool accepted)
        {
             await _db.Collection("users").Document(userId).UpdateAsync("CookiesAccepted", accepted);
        }

        public virtual async Task<string?> GetSpotifyAccessTokenForUser(string userId)
        {
            var user = await GetUserByIdAsync(userId);
            if (user == null || string.IsNullOrEmpty(user.SpotifyRefreshToken)) return null;

            var tokenResponse = await _spotifyService.RefreshAccessTokenAsync(user.SpotifyRefreshToken);
            return tokenResponse?.AccessToken;
        }

        public virtual Task<DocumentReference> AddInteractionAsync(InteractionDoc doc)
        {
            doc.Ts = FSTimestamp.FromDateTime(DateTime.UtcNow);
            return _db.Collection("interactions").AddAsync(doc);
        }

        public virtual async Task DeleteUserInteractionsAsync(string userId, string? decisionType = null)
        {
            var query = _db.Collection("interactions").WhereEqualTo("UserId", userId);

            if (!string.IsNullOrEmpty(decisionType))
            {
                query = query.WhereEqualTo("Decision", decisionType);
            }

            while (true)
            {
                var snapshot = await query.Limit(500).GetSnapshotAsync();
                if (snapshot.Count == 0) break;

                var batch = _db.StartBatch();
                foreach (var doc in snapshot.Documents)
                {
                    batch.Delete(doc.Reference);
                }
                await batch.CommitAsync();
            }
        }

        public virtual async Task<UserPrefsDoc?> GetUserPrefsAsync(string userId)
        {
            var snap = await _db.Collection("user_prefs").Document(userId).GetSnapshotAsync();
            return snap.Exists ? snap.ConvertTo<UserPrefsDoc>() : null;
        }

        public virtual Task SetUserPrefsAsync(string userId, bool audioMuted, bool autoExportLikes, List<string> genreFilters, List<string> languageFilters)
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

        public virtual async Task ExportLikeToSpotifyAsync(string userId, string isrc)
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
            }
        }

        public virtual async Task<PlaylistDoc> CreatePlaylistAsync(string userId, string name)
        {
            var doc = new PlaylistDoc
            {
                UserId = userId,
                Name = name,
                CreatedAt = FSTimestamp.FromDateTime(DateTime.UtcNow)
            };

            var refDoc = await _db.Collection("playlists").AddAsync(doc);
            doc.Id = refDoc.Id;

            return doc;
        }

        public virtual async Task<List<(string Id, PlaylistDoc Doc)>> GetUserPlaylistsAsync(string userId)
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

        public virtual async Task<bool> DeletePlaylistAsync(string userId, string playlistId)
        {
            var docRef = _db.Collection("playlists").Document(playlistId);
            var snap = await docRef.GetSnapshotAsync();

            if (!snap.Exists)
            {
                return false;
            }

            var playlist = snap.ConvertTo<PlaylistDoc>();
            if (playlist.UserId != userId)
            {
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
            }

            await docRef.DeleteAsync();
            return true;
        }

        public virtual async Task DeleteAllUserPlaylistsAsync(string userId, bool unsubscribeSpotify)
        {
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
                        await _spotifyService.UnfollowPlaylistAsync(doc.SpotifyPlaylistId, accessToken);
                    }
                    catch
                    {
                    }
                }

                await DeletePlaylistAsync(userId, id);
            }
        }

        public virtual async Task DeleteUserAccountAsync(string userId)
        {
            await DeleteUserInteractionsAsync(userId);
            await DeleteAllUserPlaylistsAsync(userId, false);
            await _db.Collection("user_prefs").Document(userId).DeleteAsync();
            await _db.Collection("users").Document(userId).DeleteAsync();
        }

        public virtual async Task AddTrackToPlaylistAsync(string userId, string playlistId, PlaylistTrackDoc track)
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
                catch
                {
                }
            }
        }

        public virtual async Task RemoveTrackFromPlaylistAsync(string userId, string playlistId, long deezerTrackId)
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
                    catch
                    {
                    }
                }

                await trackRef.DeleteAsync();
            }
        }

        public virtual async Task<List<PlaylistTrackDoc>> GetPlaylistTracksAsync(string userId, string playlistId)
        {
            var playlistRef = _db.Collection("playlists").Document(playlistId);
            var playlistSnap = await playlistRef.GetSnapshotAsync();
            if (!playlistSnap.Exists) return new List<PlaylistTrackDoc>();

            var snapshot = await playlistRef.Collection("tracks").OrderByDescending("AddedAt").GetSnapshotAsync();
            return snapshot.Documents.Select(d => d.ConvertTo<PlaylistTrackDoc>()).ToList();
        }

        public virtual async Task UpdateUserStatsAsync(string userId, string decision, double? bpm, string? artist)
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