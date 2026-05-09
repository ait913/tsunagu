const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Web target で native-only モジュールを stub に向ける
const webStubs = {
  "react-native-maps": path.resolve(
    __dirname,
    "src/web-stubs/react-native-maps.js",
  ),
};

const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && webStubs[moduleName]) {
    return {
      type: "sourceFile",
      filePath: webStubs[moduleName],
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
