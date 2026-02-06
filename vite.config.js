import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  publicDir: 'data',
  base: '/arc-dorito/',
  build: {
    outDir: 'dist',
  },
})
