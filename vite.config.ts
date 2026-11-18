import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/** Đọc phiên bản MediaPipe đang cài để tải đúng file WASM cùng phiên bản từ CDN. */
const mediapipeVersion = (): string => {
  const entry = createRequire(import.meta.url).resolve('@mediapipe/tasks-vision')
  return JSON.parse(readFileSync(join(dirname(entry), 'package.json'), 'utf-8')).version
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __MEDIAPIPE_VERSION__: JSON.stringify(mediapipeVersion()),
  },
})
