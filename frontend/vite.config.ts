import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Gelistirmede frontend (5173) ve API (5080) farkli portlarda calisir.
// Proxy sayesinde tarayici her seyi 5173'ten ister: "/api/..." istekleri arka planda API'ye iletilir.
// Sonuc: CORS ayarina gerek kalmaz ve httpOnly refresh cookie ayni origin'de calisir.
export default defineConfig({
  plugins: [
    react(),
    /*
     * PWA: build sirasinda manifest.webmanifest + service worker (Workbox) uretilir.
     *  - registerType 'prompt': yeni surum inince kendiliginden yenilenmez; kullaniciya "Yenile" sorulur
     *    (yarim kalmis bir formu kaybetmesin diye).
     *  - Onbellege alinan: uygulama kabugu (JS/CSS/HTML/ikonlar) + Google Fonts.
     *  - Onbellege ALINMAYAN: /api istekleri. Kisisel veri ve token iceren cevaplar diske yazilmaz;
     *    veri her zaman sunucudan gelir (TanStack Query bellek cache'i yeterli).
     */
    VitePWA({
      registerType: 'prompt',
      injectRegister: false, // kaydi kendimiz yapiyoruz: src/pwa/PwaUpdatePrompt.tsx
      manifest: {
        id: '/',
        name: 'JobHunter',
        short_name: 'JobHunter',
        description: 'İş başvurularını tek yerden yönet',
        lang: 'tr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        theme_color: '#ffffff',
        background_color: '#f2f6f7', // Okyanus acik zemin: acilis (splash) ekrani rengi
        categories: ['productivity', 'business'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // Ikona uzun basinca / sag tiklayinca cikan kisayollar
        shortcuts: [
          { name: 'Yapılacaklar', short_name: 'Görevler', url: '/todos', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
          { name: 'Mülakatlar', short_name: 'Mülakatlar', url: '/interviews', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // SPA: /todos gibi adresler cevrimdisiyken de index.html'den acilsin. /api ve swagger haric.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/swagger/],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css' },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-files',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      // Gelistirmede (npm run dev) SW kapali: HMR ile cakismasin. Denemek icin: npm run build && npm run preview
      devOptions: { enabled: false },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5080',
        changeOrigin: true,
      },
    },
  },
  // "npm run preview" (PWA testi) de API'ye ulassin.
  preview: {
    port: 4173,
    proxy: {
      '/api': {
        target: 'http://localhost:5080',
        changeOrigin: true,
      },
    },
  },
});
