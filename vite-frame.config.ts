// vite.config.js
import solidPlugin from 'vite-plugin-solid';
import { resolve } from "path";
const root = resolve(__dirname, "src");

export default {
  plugins: [solidPlugin()],
  build: {
    rollupOptions: {
      input: 'src/frame-manager.tsx', // Path to your SolidJS file
      output: {
        entryFileNames: "[name].js"
      }
    },
    outDir: root + "/lib"
  },
};