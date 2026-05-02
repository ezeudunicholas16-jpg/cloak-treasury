import { defineConfig } from "vite";

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
      "/api": "http://localhost:3001"
    }
  }
});
