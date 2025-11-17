import { userClient } from "./gRPC/user/connectClient";
import type { PartialMessage } from "@bufbuild/protobuf";
import type {
  LoginRequest,
  RefreshRequest,
  LoginReply,
  RefreshReply,
} from "./gRPC/user/users_pb";
import { setAccessToken } from "./token";
import { Platform } from "react-native";
import { clearSavedUser } from "./userInfo";

export async function loginWithSpotify(idTokenSpotify: string) {
  const req: PartialMessage<LoginRequest> = {
    provider: "spotify",
    token: idTokenSpotify,
  };
  const res: LoginReply = await userClient.login(req);
  setAccessToken(res.token);
  return res;
}

export async function loginWithGoogle(idTokenGoogle: string) {
  const req: PartialMessage<LoginRequest> = {
    provider: "google",
    token: idTokenGoogle,
  };
  const res: LoginReply = await userClient.login(req);
  setAccessToken(res.token);
  return res;
}

export async function loginWithPassword(username: string, password: string) {
  const req: PartialMessage<LoginRequest> = {
    username,
    password,
  };
  const res: LoginReply = await userClient.login(req);
  setAccessToken(res.token);
  return res;
}

export async function refreshAccess(): Promise<{ token: string }> {
  const req: PartialMessage<RefreshRequest> = { refreshToken: "" };
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
  }
}