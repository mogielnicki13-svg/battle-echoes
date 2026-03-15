// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Firebase v9+ używa package.json "exports" (subpath exports).
// Metro wymaga tej flagi żeby rozpoznać "firebase/app", "firebase/firestore" itp.
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
