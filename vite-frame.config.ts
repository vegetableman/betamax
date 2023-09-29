// vite.config.js
import solidPlugin from 'vite-plugin-solid';
import WindiCSS from "vite-plugin-windicss";
import { resolve } from "path";
const root = resolve(__dirname, "src");
import { spawn } from 'child_process';

const args = process.argv.slice(2);
const isWatch = args.includes('-w');

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
      },
      plugins: [isWatch ? {
        name: 'run-build',
        closeBundle () {
          const postBundleProcess = spawn('npm', ['run', 'build']);
          postBundleProcess.stdout.on('data', (data) => {
            console.log(`${data}`);
          });
          
          postBundleProcess.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
          });
          
          postBundleProcess.on('close', (code) => {
            console.log(`Post-bundle script exited with code ${code}`);
          });
        }
      }: null]
    },
    outDir: root + '/sandbox'
  },
};