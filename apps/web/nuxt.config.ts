import tailwindcss from '@tailwindcss/vite';

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/tailwind.css'],
  vite: { plugins: [tailwindcss()] },
  routeRules: {
    '/api/**': { proxy: 'http://127.0.0.1:4000/api/**' },
    '/login': { ssr: false },
    '/admin': { ssr: false },
    '/admin/**': { ssr: false },
  },
});
