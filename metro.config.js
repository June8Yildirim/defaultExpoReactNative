// Learn more https://docs.expo.dev/guides/customizing-metro
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// The backends in server/ have their own node_modules; keep Metro from crawling or bundling them.
const serverDir = path.join(__dirname, 'server').replace(/[/\\^$.*+?()[\]{}|-]/g, '\\$&');
const existing = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(existing) ? existing : existing ? [existing] : []),
  new RegExp(`^${serverDir}[/\\\\].*`),
];

module.exports = config;
