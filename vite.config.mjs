import path from 'node:path';
import { defineConfig } from 'vite';
import glslify from 'glslify';

function bundleShader(file) {
    return glslify.file(file, { basedir: path.dirname(file) });
}

function glslifyShader() {
    return {
        name: 'glslify-shader',
        enforce: 'pre',
        async load(id) {
            var file = id.split('?')[0];
            if(!/\.(glsl|frag|vert)$/.test(file)) return null;

            var source = await bundleShader(file);
            return {
                code: 'export default ' + JSON.stringify(source) + ';',
                map: null
            };
        }
    };
}

export default defineConfig({
    base: './',
    publicDir: 'app',
    plugins: [
        glslifyShader()
    ],
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
