import { userClient } from './gRPC/user/connectClient';
import type { PartialMessage } from '@bufbuild/protobuf';
import {
  LoginRequest,
  RefreshRequest,
  LoginReply,
  RefreshReply,
  CreatePlaylistRequest,
  DeletePlaylistRequest,
  PlaylistReply,
  PlaylistsListReply,
  DeleteReply,
  GetPlaylistTracksRequest,
  PlaylistTracksListReply,
  PlaylistTrack,
  AddTrackToPlaylistRequest,
  RemoveTrackFromPlaylistRequest,
  PlaylistTrackReply,
  CreateUserRequest,
  UserReply,
  UserStatsRequest,
  UserStatsReply,
  ResetSwipeHistoryRequest,
  DeleteAllPlaylistsRequest,
  SwipeResetType,
  PromoteToAdminRequest,
  AdminDashboardStatsRequest,
  AdminDashboardStatsReply,
  AdminDeleteUserRequest,
} from './gRPC/user/users_pb';
import { setAccessToken, setRefreshToken, getRefreshToken } from './token';
import { Platform, DeviceEventEmitter } from 'react-native'; // Dodano DeviceEventEmitter
import { setSavedUser, clearSavedUser } from './userInfo';
import { AUTH_EVENT } from './useBootstrapAuth'; // Import nazwy eventu (opcjonalnie string "auth.state_change")

const handleLoginResponse = (res: LoginReply) => {
  setAccessToken(res.token);
  if (res.refreshToken) {
    setRefreshToken(res.refreshToken);
  }

  setSavedUser(res.username, res.role, res.id);

  // Powiadamiamy aplikację o zalogowaniu
  DeviceEventEmitter.emit('auth.state_change', true);

  return res;
};

export async function registerUser(username: string, password: string, email?: string) {
  const req: PartialMessage<CreateUserRequest> = {
    username,
    password,
    email,
  };
  const res: UserReply = await userClient.createUser(req);
  return res;
}

export async function loginWithSpotify(idTokenSpotify: string) {
  const req: PartialMessage<LoginRequest> = {
    provider: 'spotify',
    token: idTokenSpotify,
  };
  const res: LoginReply = await userClient.login(req);
  return handleLoginResponse(res);
}

export async function loginWithGoogle(idTokenGoogle: string) {
  const req: PartialMessage<LoginRequest> = {
    provider: 'google',
    token: idTokenGoogle,
  };
  const res: LoginReply = await userClient.login(req);
  return handleLoginResponse(res);
}

export async function loginWithPassword(username: string, password: string) {
  const req: PartialMessage<LoginRequest> = {
    username,
    password,
  };
  const res: LoginReply = await userClient.login(req);
  return handleLoginResponse(res);
}

export async function getUserStatistics(userId: string): Promise<UserStatsReply> {
  const req: PartialMessage<UserStatsRequest> = {
    userId: userId,
  };
  const res: UserStatsReply = await userClient.getUserStats(req);
  return res;
}

export async function refreshAccess(): Promise<{ token: string }> {
  const refreshToken = getRefreshToken() || '';

  const req: PartialMessage<RefreshRequest> = {
    refreshToken: refreshToken,
  };

  const res: RefreshReply = await userClient.refresh(req);

  setAccessToken(res.token);

  return { token: res.token };
}

export async function logout(): Promise<void> {
  try {
    await userClient.logout({});
  } catch {
  } finally {
    clearSavedUser();
    setAccessToken(null);
    setRefreshToken(null);
    // Powiadamiamy aplikację o wylogowaniu!
    DeviceEventEmitter.emit('auth.state_change', false);
  }
}

export async function getMyPlaylists(): Promise<PlaylistReply[]> {
  const res: PlaylistsListReply = await userClient.getMyPlaylists({});
  return res.playlists;
}

export async function createPlaylist(name: string): Promise<PlaylistReply> {
  const req: PartialMessage<CreatePlaylistRequest> = { name };
  const res: PlaylistReply = await userClient.createPlaylist(req);
  return res;
}

export async function deletePlaylist(id: string): Promise<boolean> {
  const req: PartialMessage<DeletePlaylistRequest> = { id };
  const res: DeleteReply = await userClient.deletePlaylist(req);
  return res.success;
}

export async function getPlaylistTracks(playlistId: string): Promise<PlaylistTrack[]> {
  const req: PartialMessage<GetPlaylistTracksRequest> = { playlistId };
  const res: PlaylistTracksListReply = await userClient.getPlaylistTracks(req);
  return res.tracks;
}

export async function addTrackToPlaylist(
  playlistId: string,
  track: {
    id: number;
    title: string;
    isrc: string;
    artistId: number;
    artistName: string;
    albumCover: string;
  }
): Promise<boolean> {
  const req: PartialMessage<AddTrackToPlaylistRequest> = {
    playlistId,
    deezerTrackId: BigInt(track.id),
    title: track.title,
    isrc: track.isrc,
    artistId: BigInt(track.artistId),
    artistName: track.artistName,
    albumCover: track.albumCover,
  };
  const res: PlaylistTrackReply = await userClient.addTrackToPlaylist(req);
  return res.success;
}

export async function removeTrackFromPlaylist(
  playlistId: string,
  deezerTrackId: number
): Promise<boolean> {
  const req: PartialMessage<RemoveTrackFromPlaylistRequest> = {
    playlistId,
    deezerTrackId: BigInt(deezerTrackId),
  };
  const res: DeleteReply = await userClient.removeTrackFromPlaylist(req);
  return res.success;
}

// --- Danger Zone ---

export async function resetSwipeHistory(type: SwipeResetType): Promise<boolean> {
  const req: PartialMessage<ResetSwipeHistoryRequest> = { type };
  const res: DeleteReply = await userClient.resetSwipeHistory(req);
  return res.success;
}

export async function deleteAllPlaylists(unsubscribeSpotify: boolean): Promise<boolean> {
  const req: PartialMessage<DeleteAllPlaylistsRequest> = { unsubscribeSpotify };
  const res: DeleteReply = await userClient.deleteAllPlaylists(req);
  return res.success;
}

export async function deleteAccount(): Promise<boolean> {
  const res: DeleteReply = await userClient.deleteAccount({});
  if (res.success) {
    await logout();
  }
  return res.success;
}

export async function promoteToAdmin(secret: string, userId?: string): Promise<UserReply> {
  const req: PartialMessage<PromoteToAdminRequest> = { secret, userId };
  const res: UserReply = await userClient.promoteToAdmin(req);
  return res;
}

export async function getAdminStats(): Promise<AdminDashboardStatsReply> {
  const res: AdminDashboardStatsReply = await userClient.getAdminDashboardStats({});
  return res;
}

export async function adminDeleteUser(id: string): Promise<boolean> {
  const req: PartialMessage<AdminDeleteUserRequest> = { id };
  const res: DeleteReply = await userClient.adminDeleteUser(req);
  return res.success;
}
