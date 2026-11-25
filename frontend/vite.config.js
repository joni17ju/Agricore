import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

/*
 * Opens the connection to the API host (DNS, TLS) while the page is still
 * loading, so the first API request does not pay for it. The origin comes from
 * VITE_API_URL, the same variable the app calls, so it is never hard-coded.
 */
function preconnectApi(apiUrl) {
  let origin = null
  try {
    origin = apiUrl ? new URL(apiUrl).origin : null
  } catch {
    origin = null
  }
  return {
    name: 'agricore-preconnect-api',
    transformIndexHtml() {
      if (!origin) return []
      return [
        { tag: 'link', attrs: { rel: 'preconnect', href: origin, crossorigin: '' }, injectTo: 'head' },
        { tag: 'link', attrs: { rel: 'dns-prefetch', href: origin }, injectTo: 'head' },
      ]
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    plugins: [react(), preconnectApi(env.VITE_API_URL ?? process.env.VITE_API_URL)],
  }
})
