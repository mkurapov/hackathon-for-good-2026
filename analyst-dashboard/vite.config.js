import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// /api is proxied to the backend so the analyst key never reaches the browser.
// ANALYST_API_KEY and API_URL are read from the shell or the repo-root .env.
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, "..", ""), ...process.env };
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: env.API_URL || "http://localhost:8000",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
          headers: env.ANALYST_API_KEY ? { "X-Analyst-Key": env.ANALYST_API_KEY } : {},
        },
      },
    },
  };
});
