import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3000,
  },
  resolve: {
    // Resolves the `~/` alias from tsconfig.json `paths`.
    tsconfigPaths: true,
  },
  // nitro() gives the production build a self-contained Node server
  // (.output/server/index.mjs, run with plain `node`) — TanStack Start's
  // documented Node self-hosting path; without it the build emits only a
  // fetch handler with no listener. See
  // research/devops-deployment/containerization-and-build.md.
  plugins: [tanstackStart(), nitro(), viteReact()],
})
