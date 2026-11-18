import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { ADSENSE_CLIENT } from './src/adsense-config'

export default defineConfig(({ mode }) => {
  const { VITE_ADSENSE_CLIENT } = loadEnv(mode, '.', 'VITE_ADSENSE_')
  const client = VITE_ADSENSE_CLIENT?.trim() || ADSENSE_CLIENT

  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'adsense-site-verification',
        apply: 'build',
        transformIndexHtml() {
          if (!/^ca-pub-\d{16}$/.test(client)) return

          return [{ tag: 'meta', attrs: { name: 'google-adsense-account', content: client } }]
        },
      },
    ],
  }
})
