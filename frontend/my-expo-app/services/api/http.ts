import axios from 'axios';
import Constants from 'expo-constants';
import { getAccessToken, loadAccessToken, setAccessToken } from '../auth/token';
import { refreshAccess } from '../auth/api';

const baseURL = (Constants.expoConfig?.extra as any)?.apiUrl || 'https://localhost:5001';

const http = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 10000,
  headers: { Accept: 'application/json' },
});

http.interceptors.request.use((config) => {
  const token = getAccessToken() ?? loadAccessToken();
  
  console.log(`[HTTP Request] ${config.method?.toUpperCase()} ${config.url}`);
  
  if (token) {
    console.log("[HTTP Request] Dołączam token:", token.substring(0, 10) + "...");
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    console.log("[HTTP Request] Brak tokenu.");
  }
  
  return config;
});

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { response, config } = error || {};

    if (response?.status === 401 && config && !config.__isRetry) {
      console.log("[HTTP Response 401] Token wygasł lub jest nieważny. Próba ponownego odświeżenia...");
      config.__isRetry = true;
      try {
        const { token } = await refreshAccess();
        console.log("[HTTP Response 401] Ponowne odświeżenie powiodło się.");
        config.headers.Authorization = `Bearer ${token}`;
        return http.request(config);
      } catch (refreshError: any) {
        console.error("[HTTP Response 401] Ponowne odświeżenie NIE powiodło się. Wylogowywanie.", refreshError.message || refreshError);
        setAccessToken(null); // Wyloguj
      }
    }
    
    return Promise.reject(error);
  }
);

export default http;