import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    open: true,
    // En local, /api se reenvía al servidor Express (npm run dev en /server)
    proxy: { '/api': 'http://localhost:3000' },
  },
})
