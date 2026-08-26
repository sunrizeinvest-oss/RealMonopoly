import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,        // bind to 0.0.0.0 + IPv6 — fixes browsers that only resolve localhost → IPv4
    port: 5173,
    strictPort: false, // fall through to 5174/5175 if 5173 is busy
  },
  build: {
    // Split the ~700KB vendor bundle into named chunks. Returning users only
    // re-download chunks whose contents changed — a landing-page tweak no
    // longer invalidates the React runtime. Also improves parallelism on
    // first paint (browsers can fetch multiple chunks concurrently).
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) return 'vendor-react'
          if (id.includes('/react-router') || id.includes('/@remix-run/')) return 'vendor-router'
          if (id.includes('/@supabase/')) return 'vendor-supabase'
          if (id.includes('/@stripe/')) return 'vendor-stripe'
          if (id.includes('/@vercel/')) return 'vendor-vercel'
          // recharts + d3 (charting) — leave as its own chunk so lazy routes
          // that don't render charts don't have to fetch them
          if (id.includes('/recharts') || id.includes('/d3-')) return 'vendor-charts'
          // everything else in node_modules stays in the default vendor chunk
        },
      },
    },
    // Bump the warning threshold since we've deliberately split large libs
    // (xlsx, jspdf, html2canvas) into their own on-demand chunks.
    chunkSizeWarningLimit: 700,
  },
})
