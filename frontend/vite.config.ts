import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Gelistirmede frontend (5173) ve API (5080) farkli portlarda calisir.
// Proxy sayesinde tarayici her seyi 5173'ten ister: "/api/..." istekleri arka planda API'ye iletilir.
// Sonuc: CORS ayarina gerek kalmaz ve httpOnly refresh cookie ayni origin'de calisir.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5080',
        changeOrigin: true,
      },
    },
  },
});
