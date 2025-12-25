import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true, // Listen on all network interfaces (0.0.0.0)
    open: true,
    allowedHosts: [
      'localhost',
      '.loca.lt',           // localtunnel
      '.ngrok.io',          // ngrok
      '.ngrok-free.app',    // ngrok free
      '.trycloudflare.com'  // cloudflare tunnel
    ]
  }
})