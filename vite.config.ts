import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // TEMPORAL: selfDestroying mata al Service Worker viejo que cachea código obsoleto.
    // Una vez que todos los dispositivos se actualicen, restaurar la config PWA original.
    VitePWA({
      selfDestroying: true,
    })
  ],
  server: {
    host: true,
  },
})
