import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      // السماح بجميع الملفات في مجلد المشروع
      allow: [
        // مسار مشروعك الأساسي
        path.resolve(__dirname, './'),
        // مسار node_modules المطلوب
        path.resolve(__dirname, './node_modules/@resvg'),
        // أي مسارات أخرى ضرورية
      ]
    }
  },
  optimizeDeps: {
    exclude: ['@resvg/resvg-js']
  }
})