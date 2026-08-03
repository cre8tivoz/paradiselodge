import { rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

const r2Assets = ['models/unit-a.glb']

export default defineConfig({
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
