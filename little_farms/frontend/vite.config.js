import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import wasm from "vite-plugin-wasm";
import path from 'path';


export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [vue(), tailwindcss(), wasm()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    }
  },
  build: {
    target: "esnext",
  },
  optimizeDeps: {
    exclude: ['firebase-admin', 'farmhash-modern']
  }
});
