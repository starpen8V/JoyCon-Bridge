const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Resolve the local native module from source so Metro always picks up edits
// without needing a pnpm reinstall cycle.
config.resolver.extraNodeModules = {
  "joycon-input": path.resolve(__dirname, "modules/joycon-input"),
};

module.exports = config;
