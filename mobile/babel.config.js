module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // import.meta を classic-script でも動く形に変換 (主に web target でのclassic script ロード時のSyntaxError対策)
      "babel-plugin-transform-import-meta",
      "react-native-reanimated/plugin",
    ],
  };
};
