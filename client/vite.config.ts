import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
      '/ws': { target: 'ws://localhost:3001', ws: true },
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: { output: { manualChunks: { three: ['three','@react-three/fiber','@react-three/drei'], react: ['react','react-dom','react-router-dom'] } } },
  },
});
