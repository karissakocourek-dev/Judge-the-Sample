import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // GitHub Pages serves the app from https://<user>.github.io/Judge-the-Sample/
  base: "/Judge-the-Sample/",
  plugins: [react()],
});
