// vite.config.js
import solidPlugin from 'vite-plugin-solid';
import copyPlugin from 'rollup-plugin-copy';
import WindiCSS from "vite-plugin-windicss";
import { resolve } from "path";
const root = resolve(__dirname, "src");

export default {
  plugins: [solidPlugin(), WindiCSS()],
  resolve: {
    alias: {
      "@src": root
    },
  },
  build: {
    minify: false,
    rollupOptions: {
      input: 'src/frame-manager.tsx', // Path to your SolidJS file
      output: {
        entryFileNames: "[name].js",
        assetFileNames: `assets/[name].[ext]`
      }
    },
    outDir: resolve(__dirname, "dist") + '/src/lib'
  },
};