import { defineConfig } from "vite";

const API_PROXY_TARGET = process.env.VITE_API_URL || "https://cloak-treasury.onrender.com";

export default defineConfig({
  resolve: {
    alias: {
      buffer: "buffer/"
    }
  },
  optimizeDeps: {
    include: ["buffer"]
  },
  define: {
    global: "globalThis"
  },
  server: {
    proxy: {
      "/api": {
        target: API_PROXY_TARGET,
        changeOrigin: true,
        secure: true
      }
    }
  }
});
