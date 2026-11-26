import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import apiPlugin from './dev/apiPlugin.mjs'

// The admin console is a second page (admin.html) in the same build, served
// at /admin. In dev, send /admin and its sub-routes to that page rather than
// the member app's index.html.
function adminPage() {
  return {
    name: 'nomad-admin-page',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (/^\/admin(\/|\?|$)/.test(req.url)) req.url = '/admin.html';
        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      input: { main: 'index.html', admin: 'admin.html' },
    },
  },
  plugins: [
    react(),
    apiPlugin(),
    adminPage(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/favicon-16.png', 'icons/favicon-32.png', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Nomad',
        short_name: 'Nomad',
        description: 'Nomad Financial Services — savings, loans and investments.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F5EEE2',
        theme_color: '#1F4A47',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        // Members' phones never download or cache the admin console, and the
        // member app's offline fallback must not answer /admin or /api.
        globIgnores: ['admin.html', 'assets/admin-*'],
        navigateFallbackDenylist: [/^\/admin/, /^\/api\//],
      },
    }),
  ],
})
