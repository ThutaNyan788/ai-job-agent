import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

// The frontend lives in web/. Two aliases:
//   @        → web/src        (shadcn / prompt-kit convention)
//   @shared  → shared/        (the event types the server also uses)
export default defineConfig({
  root: "web",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./web/src", import.meta.url)),
      "@shared": fileURLToPath(new URL("./shared", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // allow importing files from outside web/ (i.e. shared/)
    fs: { allow: [fileURLToPath(new URL(".", import.meta.url))] },
    allowedHosts: ["localhost", "unmashed-automatically-hortense.ngrok-free.dev"],
    // The backend (Express + auth + the harness WebSocket) runs as a separate
    // process on :8787. Proxy it through here so a single ngrok tunnel to
    // this dev server is enough to reach the whole app.
    proxy: {
      "/api": "http://localhost:8787",
      "/ws": { target: "ws://localhost:8787", ws: true },
    },
  },
});
