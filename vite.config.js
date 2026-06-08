import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,        // bind to 0.0.0.0 + IPv6 — fixes browsers that only resolve localhost → IPv4
    port: 5173,
    strictPort: false, // fall through to 5174/5175 if 5173 is busy
  },
})
