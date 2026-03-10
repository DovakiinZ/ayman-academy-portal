import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // qrcode package requires Node built-ins; provide browser-safe stubs
  define: {
    global: "window",
    "process.env": "{}",
    "process.version": '"v18.0.0"',
    "process.platform": '"browser"',
  },
  optimizeDeps: {
    include: ["qrcode"],
  },
});
