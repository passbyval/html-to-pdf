import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '^react': path.resolve(__dirname, 'react'),
      '^react-dom': path.resolve(__dirname, 'react-dom')
    }
  },
  test: {
    globals: true,
    environment: 'jsdom'
  }
})
