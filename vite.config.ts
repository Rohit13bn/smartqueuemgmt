import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

/**
 * Custom plugin that disables Vite development WebSocket connection in preview environments
 * where WebSockets are not forwarded, avoiding "WebSocket closed without opened" errors
 * while keeping style injection, ErrorOverlay, and React component compilation working seamlessly.
 */
function disableViteHmrPlugin(): Plugin {
  return {
    name: 'disable-vite-hmr',
    enforce: 'post',
    transform(code: string, id: string) {
      if (id.includes('client.mjs') || id.includes('bundledDevClient.mjs') || id.includes('@vite/client')) {
        return code.replace(
          'const createWebSocketModuleRunnerTransport = (options) => {',
          'const createWebSocketModuleRunnerTransport = () => ({ connect: async () => {}, disconnect: async () => {}, send: () => {} }); const _unused_createWebSocket = (options) => {'
        );
      }
      return null;
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), disableViteHmrPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // HMR is disabled in AI Studio preview to prevent WebSocket closed errors
      hmr: false,
      ws: false as const,
      watch: null,
    },
  };
});

