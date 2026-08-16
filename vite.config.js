const { defineConfig } = require('vite');
const commonjs = require('vite-plugin-commonjs').default;
const glslify = require('glslify');

function glslifyInline() {
    return {
        name: 'glslify-inline',
        enforce: 'pre',
        transform(code, id) {
            if (!id.endsWith('.js') || !code.includes('glslify(')) return null;

            return new Promise(function(resolve, reject) {
                var stream = glslify(id);
                var out = '';

                stream.on('data', function(chunk) {
                    out += chunk;
                });
                stream.on('end', function() {
                    resolve({ code: out, map: null });
                });
                stream.on('error', reject);
                stream.end(code);
            });
        }
    };
}

module.exports = defineConfig({
    base: './',
    publicDir: 'app',
    plugins: [
        glslifyInline(),
        commonjs()
    ],
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        commonjsOptions: {
            include: [/node_modules/, /src/]
        }
    }
});
