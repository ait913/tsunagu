const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// React Native 0.74.x + react-native-web の web bundling で
// ReactNativePrivateInterface.js が `../Utilities/Platform` を解決できない問題への対策。
// Web target では Platform を react-native-web 提供のものに alias する。
const reactNativePath = path.resolve(__dirname, "node_modules/react-native");
const reactNativeWebPlatform = path.resolve(
  __dirname,
  "node_modules/react-native-web/dist/exports/Platform/index.js",
);

const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    platform === "web" &&
    moduleName === "../Utilities/Platform" &&
    context.originModulePath &&
    context.originModulePath.includes(reactNativePath)
  ) {
    return {
      type: "sourceFile",
      filePath: reactNativeWebPlatform,
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
