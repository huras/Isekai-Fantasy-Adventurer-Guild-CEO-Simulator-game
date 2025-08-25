import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const globalAny: any = globalThis as any
const preferredPort = Number(
  globalAny?.process?.env?.PORT ?? globalAny?.process?.env?.VITE_PORT ?? 5179
)

export default defineConfig({
  plugins: [react()],
  server: {
    port: preferredPort,
    strictPort: true,
  },
  preview: {
    port: preferredPort,
    strictPort: true,
  },
})
