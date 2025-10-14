const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer');
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'svg');
config.resolver.sourceExts.push('svg');

config.server = config.server || {};
config.server.rewriteRequestUrl = (url) => {
  if (url.startsWith('/_expo/')) {
    return url.replace('/_expo/', '/swipevibes/_expo/');
  }
  return url;
};

module.exports = withNativeWind(config, { input: './global.css' });