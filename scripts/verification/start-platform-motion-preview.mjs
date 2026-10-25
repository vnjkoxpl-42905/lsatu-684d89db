// Real application, normal authentication/backend. No production writes are mocked.
// Excludes the Lovable MCP bundler so local preview cannot rewrite Edge Functions.
import { createServer } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const server = await createServer({
  root,
  configFile: false,
  plugins: [react()],
  resolve: { alias: { '@': resolve(root, 'src') }, dedupe: ['react', 'react-dom'] },
  server: { host: '127.0.0.1', port: 8120, strictPort: true },
});
await server.listen();
console.log('Real LSAT U application: http://127.0.0.1:8120');
