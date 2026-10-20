import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";
const root = path.resolve(__dirname, "../..");
export default defineConfig({ root, plugins: [react()], resolve: { alias: [{ find: "@/contexts/AuthContext", replacement: path.join(__dirname, "rc-picker-auth.tsx") }, { find: "@", replacement: path.join(root, "src") }], dedupe: ["react", "react-dom"] }, server: { host: "127.0.0.1", port: 8095, strictPort: true } });
