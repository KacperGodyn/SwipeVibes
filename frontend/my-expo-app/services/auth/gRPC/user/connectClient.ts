import { createClient, type Client, type Interceptor } from "@connectrpc/connect";
import { createGrpcWebTransport } from "@connectrpc/connect-web";
import Constants from "expo-constants";
import { UserService } from "./users_connectweb";
import { getAccessToken } from "../../token";

const extra = Constants.expoConfig?.extra as any;

const apiUrl = extra?.apiUrl || "https://localhost:5001";

const authInterceptor: Interceptor = (next) => async (req) => {
  const token = getAccessToken();
  
  const url = req.url.toLowerCase();
  const isAuthEndpoint = url.includes("/login") || url.includes("/refresh");

  if (token && !isAuthEndpoint) {
    req.header.set("Authorization", `Bearer ${token}`);
  }
  
  return next(req);
};
const transport = createGrpcWebTransport({
  baseUrl: apiUrl,
  interceptors: [authInterceptor],
  credentials: "include",
});

export const userClient: Client<typeof UserService> = createClient(UserService, transport);