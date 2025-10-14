const { withExpo } = require('@expo/webpack-config');
const webpack = require('webpack');

module.exports = async function (env, argv) {
  const config = await withExpo(env, argv);

  config.module.rules.push({
    test: /\.svg$/i,
    issuer: /\.[jt]sx?$/,
    use: [
      {
        loader: '@svgr/webpack',
        options: { native: true },
      },
    ],
  });
  config.plugins.push(
    new webpack.ProvidePlugin({
      React: 'react',
    })
  );

  return config;
};
