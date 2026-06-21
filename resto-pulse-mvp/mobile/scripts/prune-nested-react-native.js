const fs = require('fs');
const path = require('path');

/** Metro codegen breaks when npm nests react-native@0.86 under react-native@0.81 (Expo SDK 54). */
const nested = path.join(__dirname, '..', 'node_modules', 'react-native', 'node_modules', 'react-native');

if (fs.existsSync(nested)) {
  fs.rmSync(nested, { recursive: true, force: true });
  console.log('[postinstall] Removed nested react-native to fix Metro bundling.');
}
