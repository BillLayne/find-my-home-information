import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const propertyLookupDevUrl = process.env.PROPERTY_LOOKUP_DEV_URL || "https://nc-insurance-tools-gemini.pages.dev";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4175,
    proxy: {
      "/api/property": {
        target: propertyLookupDevUrl,
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
