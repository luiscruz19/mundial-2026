module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // Alias para imports con "@/..." que apuntan a src/
    [
      'module-resolver',
      {
        root: ['./'],
        alias: {
          '@': './src',
        },
      },
    ],
  ],
};
