import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Bind all interfaces (0.0.0.0) so the dashboard is reachable on the LAN,
    // not just localhost. Without this Vite listens on 127.0.0.1 only.
    host: true,
    port: 5173,
    strictPort: true,
  },
})
