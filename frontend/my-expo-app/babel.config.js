const dotenv = require('dotenv');
dotenv.config();

module.exports = function (api) {
  api.cache(true);

  return {
    presets: [
      [
        'babel-preset-expo',
        {
          jsxImportSource: 'nativewind',
          runtime: 'automatic',
        },
      ],
      'nativewind/babel',
    ],
    plugins: [
      [
        'module:react-native-dotenv',
        {
          moduleName: '@env',
          path: '.env',
          allowlist: ['EXPO_PUBLIC_DEEZER_API_URL'],
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
