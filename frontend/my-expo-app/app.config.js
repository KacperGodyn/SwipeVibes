import 'dotenv/config';

export default ({ config }) => {
  const appEnv = process.env.APP_ENV || 'development';
  const isDev = appEnv === 'development';

  const ANDROID_WEB_CLIENT_ID = process.env.GOOGLE_ANDROID_CLIENT_ID;

  const ANDROID_REVERSED_SCHEME = `com.googleusercontent.apps.${ANDROID_WEB_CLIENT_ID?.replace(
    '.apps.googleusercontent.com',
    ''
  )}`;

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
        baseUrl: '/SwipeVibes',
      },
      scheme: [ANDROID_REVERSED_SCHEME, 'swipevibes'],
      extra: {
        appEnv,
        apiUrl: isDev ? process.env.DEV_API_URL : process.env.PROD_API_URL,
        google: {
          expoClientId: process.env.GOOGLE_WEB_CLIENT_ID, // web only
          webClientId: process.env.GOOGLE_WEB_CLIENT_ID, // web only
          androidClientId: ANDROID_WEB_CLIENT_ID, // full id (WITH domain)
          androidReversedClientScheme: ANDROID_REVERSED_SCHEME, // WITHOUT domain (for redirect)
          // iosClientId: process.env.GOOGLE_IOS_CLIENT_ID,      // optional (later)
        },
        eas: {
          projectId: '745c3276-782e-4cb5-8395-17e19efc5299',
        },
      },

      plugins: [['expo-router', { origin: 'https://kacpergodyn.github.io' }]],
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
                // This MUST match com.googleusercontent.apps.<ANDROID_CLIENT_ID>:/oauth2redirect/google
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
