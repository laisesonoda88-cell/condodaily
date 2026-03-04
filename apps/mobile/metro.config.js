const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Monorepo root (2 levels up from apps/mobile/)
const workspaceRoot = path.resolve(__dirname, '../..');

const config = getDefaultConfig(__dirname);

// Watch all files in the monorepo (shared packages, etc.)
config.watchFolders = [workspaceRoot];

// Let Metro resolve packages from both local and workspace root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
