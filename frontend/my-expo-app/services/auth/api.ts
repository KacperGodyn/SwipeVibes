import { userClient } from "./gRPC/user/connectClient";
import type { PartialMessage } from "@bufbuild/protobuf";
import type {
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
  PlaylistTrackReply
} from "./gRPC/user/users_pb";
import { setAccessToken, setRefreshToken, getRefreshToken } from "./token"; 
import { Platform } from "react-native";
import { clearSavedUser } from "./userInfo";

const handleLoginResponse = (res: LoginReply) => {
  setAccessToken(res.token);
  if (res.refreshToken) {
    setRefreshToken(res.refreshToken);
  }
  return res;
};

export async function loginWithSpotify(idTokenSpotify: string) {
  const req: PartialMessage<LoginRequest> = {
    provider: "spotify",
    token: idTokenSpotify,
  };
  const res: LoginReply = await userClient.login(req);
  return handleLoginResponse(res);
}

export async function loginWithGoogle(idTokenGoogle: string) {
  const req: PartialMessage<LoginRequest> = {
    provider: "google",
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

export async function refreshAccess(): Promise<{ token: string }> {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
      console.warn("Brak refresh tokena w storage. Wymuszone wylogowanie.");
      await logout();
      throw new Error("No refresh token available"); 
  }
  
  try {
      const req: PartialMessage<RefreshRequest> = { refreshToken: refreshToken };
      const res: RefreshReply = await userClient.refresh(req);
      
      setAccessToken(res.token);
      return { token: res.token };
  } catch (err) {
      console.error("Refresh failed:", err);
      await logout();
      throw err;
  }
}

export async function logout(): Promise<void> {
  try {
    await userClient.logout({});
  } catch {
  } finally {
    clearSavedUser();
    setAccessToken(null);
    setRefreshToken(null);
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
    albumCover: track.albumCover
  };
  const res: PlaylistTrackReply = await userClient.addTrackToPlaylist(req);
  return res.success;
}

export async function removeTrackFromPlaylist(playlistId: string, deezerTrackId: number): Promise<boolean> {
  const req: PartialMessage<RemoveTrackFromPlaylistRequest> = {
    playlistId,
    deezerTrackId: BigInt(deezerTrackId)
  };
  const res: DeleteReply = await userClient.removeTrackFromPlaylist(req);
  return res.success;
}