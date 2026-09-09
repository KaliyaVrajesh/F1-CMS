import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
          'chart-vendor': ['recharts'],
          'motion-vendor': ['framer-motion', 'gsap'],
          'map-vendor': ['leaflet', 'react-leaflet'],
          'react-vendor': ['react', 'react-dom', 'react-router-dom', 'axios', 'react-hot-toast'],
        },
      },
    },
  },
});
