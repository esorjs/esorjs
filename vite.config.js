// vite.config.js
import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      esor: path.resolve(__dirname, "./dist/esor.min.js"),
    },
  },
});
