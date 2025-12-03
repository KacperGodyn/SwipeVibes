import * as dotenv from 'dotenv';
import path from 'path';

export default ({ config }) => {
  const appEnv = process.env.APP_ENV || 'development';
  const isProduction = appEnv === 'production';

  const envFile = appEnv === 'production' ? '.env.production' : '.env';

  dotenv.config({ path: path.resolve(__dirname, envFile) });

  console.log(`Loading config from: ${envFile} (ENV: ${appEnv})`);
  
  const ANDROID_WEB_CLIENT_ID = process.env.GOOGLE_ANDROID_CLIENT_ID;

  const ANDROID_REVERSED_SCHEME = ANDROID_WEB_CLIENT_ID
    ? `com.googleusercontent.apps.${ANDROID_WEB_CLIENT_ID.replace('.apps.googleusercontent.com', '')}`
    : 'com.googleusercontent.apps.placeholder';

  return {
    ...config,
    expo: {
      ...config.expo,
      name: 'SwipeVibes',
      slug: 'swipevibes',
      version: '1.0.0',
      sdkVersion: '54.0.0',
      web: {
        bundler: 'metro',
        output: 'static',
        favicon: './assets/favicon.png',
      },
      experiments: {
        tsconfigPaths: true,
      },
      scheme: [ANDROID_REVERSED_SCHEME, 'swipevibes'],
      extra: {
        appEnv,
        apiUrl: isProduction ? process.env.PROD_API_URL : process.env.DEV_API_URL,
        spotify: {
          clientId: process.env.SPOTIFY_CLIENT_ID,
          scopes: (process.env.SPOTIFY_SCOPES || 'user-read-email user-read-private').split(' '),
        },
        google: {
          expoClientId: process.env.GOOGLE_WEB_CLIENT_ID, // web only
          webClientId: process.env.GOOGLE_WEB_CLIENT_ID, // web only
          androidClientId: ANDROID_WEB_CLIENT_ID, // full id (WITH domain)
          androidReversedClientScheme: ANDROID_REVERSED_SCHEME, // WITHOUT domain (for redirect)
          // iosClientId: process.env.GOOGLE_IOS_CLIENT_ID,      // optional (later)
        },
        deezerApiUrl: process.env.EXPO_PUBLIC_DEEZER_API_URL,
        eas: {
          projectId: '745c3276-782e-4cb5-8395-17e19efc5299',
        },
      },

      plugins: [['expo-router', { origin: 'https://swipevibes-31667.web.app' }]],
      orientation: 'portrait',
      icon: './assets/icon.png',
      userInterfaceStyle: 'light',
      splash: {
        image: './assets/splash.png',
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
      },
      assetBundlePatterns: ['**/*'],
      ios: {
        bundleIdentifier: 'com.kacgod.swipevibes',
        supportsTablet: true,
      },
      android: {
        adaptiveIcon: {
          foregroundImage: './assets/adaptive-icon.png',
          backgroundColor: '#ffffff',
        },
        package: 'com.kacgod.swipevibes',
        googleServicesFile: './google-services.json',
        intentFilters: [
          {
            action: 'VIEW',
            category: ['BROWSABLE', 'DEFAULT'],
            data: [
              {
                scheme: ANDROID_REVERSED_SCHEME,
                pathPrefix: '/oauth2redirect',
              },
            ],
          },
        ],
      },
    },
  };
};
