import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../../", import.meta.url));

// Separate local artifact. The application's production entry stays unchanged.
export default defineConfig({
  root,
  plugins: [react()],
  define: { __BUILD_SHA__: JSON.stringify("local-home-preview"), __BUILD_TIME__: JSON.stringify("2026-10-27") },
  resolve: {
    alias: {
      "@": path.join(root, "src"),
      react: path.join(root, "node_modules/react"),
      "react-dom": path.join(root, "node_modules/react-dom"),
      "react/jsx-runtime": path.join(root, "node_modules/react/jsx-runtime.js"),
    },
    dedupe: ["react", "react-dom"],
  },
  build: {
    outDir: path.join(root, "dist-home-preview"),
    emptyOutDir: false,
    rollupOptions: { input: path.join(root, "docs/verification/role-home-preview.html") },
  },
});
