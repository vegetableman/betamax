// vite.config.js
import solidPlugin from 'vite-plugin-solid';
import copyPlugin from 'rollup-plugin-copy';
import { resolve } from "path";

export default {
  plugins: [solidPlugin()],
  build: {
    rollupOptions: {
      input: 'src/frame-manager.tsx', // Path to your SolidJS file
      output: {
        entryFileNames: "[name].js"
      }
    },
    outDir: resolve(__dirname, "lib")
  },
};