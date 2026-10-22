import { defineConfig } from 'vite';

// A interface fica em web/ e o build vai para servidor/publico/ (commitado, para rodar sem npm).
// No `npm run dev`, o Vite manda /api para o servidor Node na porta 5050.
export default defineConfig({
  root: 'web',
  base: '/',
  publicDir: false,
  build: {
    outDir: '../servidor/publico',
    emptyOutDir: true,
    assetsDir: 'assets',
    target: 'es2022',
    chunkSizeWarningLimit: 900,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:5050', changeOrigin: false },
    },
  },
});
