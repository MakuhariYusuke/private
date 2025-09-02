import { defineConfig } from 'vite';

/**
 * Vite configuration for the project.
 */
export default defineConfig({
  build: {
    // keep small chunks for client scripts
    rollupOptions: {
      output: { manualChunks: undefined }
    }
  }
});
