import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Force test mode for Vitest even if the shell exports NODE_ENV=production.
// Without this, Vite pre-bundles React in production mode and react/jsx-dev-runtime
// drops jsxDEV, breaking every component test with "jsxDEV is not a function".
// Must run before the react() plugin and dep optimization read NODE_ENV.
process.env.NODE_ENV = "test";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
    // Multi-step interaction tests (drill labs) chain many fireEvent + waitFor
    // cycles. Under the full parallel run the default 5s is too tight and they
    // time out despite passing in isolation. Give heavy component tests headroom.
    testTimeout: 15000,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
