import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

declare const process: { env: Record<string, string | undefined> }

const isShareBuild = process.env.SHARE_BUILD === '1'

export default defineConfig({
  plugins: [react()],
  define: {
    __THRIVE_SHARE_MODE__: isShareBuild,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rolldownOptions: {
      output: {
        manualChunks: isShareBuild ? undefined : (id) => {
          if (id.includes('node_modules/recharts')) return 'chart-vendor'
          if (id.includes('node_modules/lucide-react')) return 'icon-vendor'
        },
      },
    },
  },
})
