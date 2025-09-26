import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  // Configuration spéciale pour Home Assistant
  base: '/local/learroom-assistant/',
  build: {
    rollupOptions: {
      output: {
        // Noms de fichiers simples pour Home Assistant
        entryFileNames: 'js/[name]-[hash].js',
        chunkFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (!assetInfo.name) return `assets/[name]-[hash].[ext]`;
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `images/[name]-[hash].[ext]`;
          }
          if (/css/i.test(ext)) {
            return `css/[name]-[hash].[ext]`;
          }
          return `assets/[name]-[hash].[ext]`;
        },
      },
    },
    // Configuration pour Home Assistant
    assetsDir: '',
    outDir: 'dist',
    // Désactiver la minification des noms de classes CSS si problème
    cssCodeSplit: false,
  },
  // Configuration pour le serveur de développement
  server: {
    port: 5173,
    host: true,
  },
});
