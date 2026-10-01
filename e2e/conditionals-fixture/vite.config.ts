import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';
const app = path.resolve(__dirname, '../..');
export default defineConfig({
  root: __dirname,
  plugins: [react()],
  server: { host: '127.0.0.1', port: 8097, fs: { allow: [app] } },
  resolve: { alias: [
    { find: '@/hooks/useUserPermissions', replacement: path.resolve(__dirname, 'mockPermissions.tsx') },
    { find: '@/integrations/supabase/client', replacement: path.resolve(__dirname, 'mockCloud.ts') },
    { find: '@/contexts/AuthContext', replacement: path.resolve(__dirname, 'mockAuth.tsx') },
    { find: '@', replacement: path.resolve(app, 'src') },
  ], dedupe: ['react', 'react-dom'] },
});
