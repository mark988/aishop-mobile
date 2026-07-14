import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://47.113.222.217:8081',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => {
          console.log(`Proxying API request: ${path} -> http://47.113.222.217:8081${path}`)
          return path
        }
      }
    }
  },
  preview: {
    port: 3001,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://47.113.222.217:8081',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // 确保public目录的文件被复制到dist
    copyPublicDir: true
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['sockjs-client']
  },
  // 确保public目录被识别
  publicDir: 'public'
})
