import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3000,
  },
  resolve: {
    // Resolves the `~/` alias from tsconfig.json `paths`.
    tsconfigPaths: true,
  },
  plugins: [tanstackStart(), viteReact()],
})
