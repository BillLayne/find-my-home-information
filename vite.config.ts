import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4175,
    proxy: {
      "/api/property": {
        target: "https://nc-insurance-tools-gemini.pages.dev",
        changeOrigin: true,
        rewrite: () => "/api/lookup",
        configure(proxy) {
          proxy.on("proxyReq", (proxyRequest, request) => {
            if (request.method === "POST") proxyRequest.setHeader("content-type", "application/json");
          });
        },
      },
    },
  },
});

