import { crx } from "@crxjs/vite-plugin";
import { resolve } from "path";
import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import copyPlugin from 'rollup-plugin-copy';
import WindiCSS from "vite-plugin-windicss";
import manifest from "./src/manifest";

const root = resolve(__dirname, "src");
const pagesDir = resolve(root, "pages");
const assetsDir = resolve(root, "assets");
const outDir = resolve(__dirname, "dist");
const publicDir = resolve(__dirname, "public");

const isDev = process.env.__DEV__ === "true";

export default defineConfig({
  plugins: [solidPlugin(), copyPlugin({
    targets: [
    {
      src: root + '/frame.html',
      dest: outDir + '/src'
    },
    {
      src: root + '/frame-runtime.js',
      dest: outDir + '/src'
    },
    {
      src: pagesDir + '/content/content.css',
      dest: outDir + '/src/pages/content'
    },
    {
      src: root + '/demo.js',
      dest: outDir + '/src'
    },
  ],  hook: 'writeBundle'
  }), WindiCSS(),  crx({ manifest })],
  resolve: {
    alias: {
      "@src": root,
      "@assets": assetsDir,
      "@pages": pagesDir,
    },
  },
  publicDir,
  build: {
    outDir,
    sourcemap: isDev,
    minify: false
  },
});
