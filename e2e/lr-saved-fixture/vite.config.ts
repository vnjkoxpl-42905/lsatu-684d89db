import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';
const app = path.resolve(__dirname, '../..');
const mocks = path.resolve(__dirname, 'mocks.tsx');
export default defineConfig({ root: __dirname, envFile: false, plugins: [react()],
  server: { host: '127.0.0.1', port: 8101, strictPort: true, fs: { allow: [app] } },
  resolve: { alias: [
    ...['@/contexts/AuthContext', '@/contexts/QuestionBankContext', '@/hooks/useSavedSets', '@/lib/questionLoader', '@/lib/questionExposure', '@/features/rc/components/RcSavedSetsPanel', '@/integrations/supabase/client'].map(find => ({ find, replacement: mocks })),
    { find: '@', replacement: path.resolve(app, 'src') },
  ], dedupe: ['react', 'react-dom'] },
});
