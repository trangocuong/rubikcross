import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2020'
  },
  optimizeDeps: {
    exclude: ["cubing"],
    esbuildOptions: {
      target: 'es2020'
    }
  },
  worker: {
    format: "es"
  }
});
