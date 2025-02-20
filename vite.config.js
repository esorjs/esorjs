 import { defineConfig } from "vite";
import esorPlugin from "./vite-plugin-esor";
import path from "path";

export default defineConfig({
  plugins: [esorPlugin()],
  resolve: {
    alias: {
      esor: path.resolve(__dirname, "./dist/esor.min.js"),
    },
  },
});
