import path from 'node:path';
import { defineConfig } from 'vite';
import commonjs from 'vite-plugin-commonjs';
import glslify from 'glslify';

function glslifyInline() {
    return {
        name: 'glslify-inline',
        enforce: 'pre',
        async transform(code, id) {
            if (!id.endsWith('.js') || !code.includes('glslify(')) return null;

            var dir = path.dirname(id);
            var jobs = [];
            var out = code.replace(/glslify\(\s*(['"])(.+?)\1\s*\)/g, function(match, quote, filename) {
                var index = jobs.length;
                jobs.push(new Promise(function(resolve, reject) {
                    glslify.bundle(filename, { basedir: dir }, function(err, source) {
                        if(err) reject(err);
                        else resolve(source);
                    });
                }));
                return '__GLSLIFY_INLINE_' + index + '__';
            });

            var sources = await Promise.all(jobs);
            sources.forEach(function(source, index) {
                out = out.replace('__GLSLIFY_INLINE_' + index + '__', JSON.stringify(source));
            });
            return { code: out, map: null };
        }
    };
}

export default defineConfig({
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
