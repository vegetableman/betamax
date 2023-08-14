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
  plugins: [solidPlugin(), crx({ manifest }), WindiCSS(), copyPlugin({
    targets: [
    {
      src: root + '/sandbox.html',
      dest: outDir + '/src'
    },
    {
      src: root + '/frame.html',
      dest: outDir + '/src'
    },
    {
      src: root + '/lib/frame-manager.js',
      dest: outDir + '/src/lib'
    },
    {
      src: root + '/frame-runtime.js',
      dest: outDir + '/src'
    }
  ]
  })],
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
    minify: false,
    rollupOptions: {
      // external: 'frame-manager.js'
        // input: 'src/frame-manager.tsx', // Path to your SolidJS file
      // input: {
        // frame: resolve(root, "src", "frame-manager.tsx"),
        // content: resolve(pagesDir, "content", "index.ts"),
      // }
      //   devtools: resolve(pagesDir, "devtools", "index.html"),
      //   panel: resolve(pagesDir, "panel", "index.html"),
      //   content: resolve(pagesDir, "content", "index.ts"),
      //   background: resolve(pagesDir, "background", "index.ts"),
      //   contentStyle: resolve(pagesDir, "content", "style.scss"),
      //   popup: resolve(pagesDir, "popup", "index.html"),
      //   newtab: resolve(pagesDir, "newtab", "index.html"),
      //   options: resolve(pagesDir, "options", "index.html"),
      // },
      // output: {
      //   entryFileNames: "src/pages/[name]/index.js",
      //   chunkFileNames: isDev
      //     ? "assets/js/[name].js"
      //     : "assets/js/[name].[hash].js",
      //   assetFileNames: (assetInfo) => {
      //     const { dir, name: _name } = path.parse(assetInfo.name);
      //     // const assetFolder = getLastElement(dir.split("/"));
      //     // const name = assetFolder + firstUpperCase(_name);
      //     return `assets/[ext]/${name}.chunk.[ext]`;
      //   },
      // },
    },
  },
});
