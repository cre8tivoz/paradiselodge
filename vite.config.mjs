import { rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

const r2Assets = ['models/unit-a.glb']

export default defineConfig({
  // Game entry only. tools/lookdev is a separate harness with its own index.html.
  build: {
    // three@0.180.0 core is ~542 kB raw (~136 kB gzipped) after splitting three-addons.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      input: resolve('index.html'),
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three/examples')) {
            return 'three-addons'
          }
          if (id.includes('node_modules/three')) {
            return 'three'
          }
        },
      },
    },
  },
  optimizeDeps: {
    entries: ['index.html'],
  },
  server: {
    watch: {
      ignored: ['**/tools/lookdev/**', '**/art-source/**'],
    },
  },
  plugins: [
    {
      name: 'exclude-r2-assets-from-pages',
      apply: 'build',
      async closeBundle() {
        await Promise.all(
          r2Assets.map((asset) => rm(resolve('dist', asset), { force: true })),
        )
      },
    },
  ],
})
