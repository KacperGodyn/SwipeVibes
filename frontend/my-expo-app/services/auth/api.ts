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

export async function refreshAccess() {
  const req: PartialMessage<RefreshRequest> = {
    refreshToken: Platform.OS === "web" ? "" : "",
  };
  const res: RefreshReply = await userClient.refresh(req);
  setAccessToken(res.token);
  return res;
}
