import { defineConfig } from 'vite';
import { compression } from 'vite-plugin-compression2';

export default defineConfig({
  plugins: [
    compression({ algorithm: 'brotliCompress', exclude: [/\.(webp|mp4|mp3|png)$/] }),
  ],
  root: 'src/',

  publicDir:'../public/',
  server:
  {
      host: true, // Open to local network and display URL
      open: !('SANDBOX_URL' in process.env || 'CODESANDBOX_HOST' in process.env) // Open if it's not a CodeSandbox
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true, 
    sourcemap: true
  }
});