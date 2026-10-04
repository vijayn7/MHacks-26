import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5174,
    strictPort: true,
    // Cursor / cloud port-forwards use non-localhost Host headers; Vite 7
    // blocks those by default and the tab sits on a blank/spinning load.
    allowedHosts: true,
  },
});
