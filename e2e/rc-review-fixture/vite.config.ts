import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';
const app = path.resolve(__dirname, '../..');
export default defineConfig({ root: __dirname, envFile: false,
  plugins: [{ name: 'isolated-rc-data', enforce: 'pre', resolveId(source, importer) {
    if (!importer?.includes('src/')) return;
    if (source === '../api/rcExposure') return path.resolve(__dirname, 'mockExposure.ts');
    if (source === '../api/rcSavedSets' || source === '@/features/rc/api/rcSavedSets') return path.resolve(__dirname, 'mockSavedSets.ts');
    if (source === '../lib/rcLearning') return path.resolve(__dirname, 'mockLearning.ts');
    if (source === '../api/rcProgress') return path.resolve(__dirname, 'mockProgress.ts');
    if (source === '../lib/rcBank') return path.resolve(__dirname, 'mockBank.ts');
    if (source === '../hooks/useRcHighlights') return path.resolve(__dirname, 'mockHighlights.ts');
  } }, react()],
  server: { host: '127.0.0.1', port: 8098, fs: { allow: [app] } },
  resolve: { alias: [
    { find: '@/hooks/useUserPermissions', replacement: path.resolve(__dirname, 'mockPermissions.ts') },
    { find: '@/integrations/supabase/client', replacement: path.resolve(__dirname, 'mockCloud.ts') },
    { find: '@/contexts/AuthContext', replacement: path.resolve(__dirname, 'mockAuth.tsx') },
    { find: '@', replacement: path.resolve(app, 'src') },
  ], dedupe: ['react', 'react-dom'] },
});
