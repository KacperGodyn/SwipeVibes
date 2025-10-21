import { userClient } from "./connectClient";
import { LoginReply, LoginRequest } from "./users_pb";

export default async function handleUserLogin(
  provider: string,
  token: string
): Promise<LoginReply> {
  const req: LoginRequest = { provider, token } as LoginRequest;
  const res = await userClient.login(req);

  (globalThis as any).__SV_JWT__ = res.token;

  return res;
}
