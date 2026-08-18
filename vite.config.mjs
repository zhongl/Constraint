import { defineConfig } from 'vite';

export default defineConfig({
    base: './',
    publicDir: 'app',
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('/node_modules/three/')) return 'three';
                }
            }
        }
    }
});
