// frontend/vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      // كل ما يبدأ بـ /api يروح للباك إند
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path, // لا نغير الـ path
      },
    },
  },
  build: {
    // ✅ تحسينات الإنتاج
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // إزالة console.log في الإنتاج
        drop_debugger: true,
      },
    },
    sourcemap: false, // إزالة source maps في الإنتاج
    rollupOptions: {
      output: {
        manualChunks: {
          // ✅ تقسيم bundle لتحسين الأداء
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-mui': ['@mui/material', '@mui/icons-material'],
          'vendor-utils': ['axios', 'date-fns', 'i18next', 'react-i18next'],
        },
      },
    },
    chunkSizeWarningLimit: 1000, // تحذير عند تجاوز 1MB
  },
});
