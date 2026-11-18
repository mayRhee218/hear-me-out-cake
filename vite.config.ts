import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { ADSENSE_CLIENT } from './src/adsense-config'

export default defineConfig(({ mode }) => {
  const { VITE_ADSENSE_CLIENT } = loadEnv(mode, '.', 'VITE_ADSENSE_')
  const client = VITE_ADSENSE_CLIENT?.trim() || ADSENSE_CLIENT
  // GitHub Pages already permits CORS for assets requested by the opaque editor.
  const editorCors = { origin: 'null' }

  return {
    base: './',
    server: { cors: editorCors },
    preview: { cors: editorCors },
    build: {
      rollupOptions: {
        input: {
          page: 'index.html',
          editor: 'editor.html',
          privacy: 'privacy.html',
        },
      },
    },
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'adsense-site-verification',
        apply: 'build',
        transformIndexHtml(_html, context) {
          if (context.path !== '/index.html' || !/^ca-pub-\d{16}$/.test(client)) return

          return [{ tag: 'meta', attrs: { name: 'google-adsense-account', content: client } }]
        },
      },
    ],
  }
})
