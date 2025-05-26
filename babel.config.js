module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['.'],
        alias: {
          'invariant': './node_modules/invariant',
        },
      },
    ],
  ],
};
