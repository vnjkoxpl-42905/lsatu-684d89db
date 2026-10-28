// Isolated development fixture: no MCP generator, auth or student writes.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');
export default defineConfig({
  root,
  cacheDir: path.resolve(root, 'node_modules/.vite-question-finder-verification'),
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(root, 'src'), react: path.resolve(root, 'node_modules/react'), 'react-dom': path.resolve(root, 'node_modules/react-dom') }, dedupe: ['react', 'react-dom'] },
  define: { __BUILD_SHA__: JSON.stringify('question-finder-verification'), __BUILD_TIME__: JSON.stringify('2026-10-28') },
  optimizeDeps: { entries: ['src/dev/question-finder-preview.html'] },
  server: { host: '127.0.0.1', port: 5289 },
});
