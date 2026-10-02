import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import { getBuildInfo } from '../backend/src/config/build-info.js';

const buildInfo = getBuildInfo({
    allowGit: true,
    allowMissing: false,
    revision: process.env.APP_REVISION ?? process.env.VITE_APP_REVISION,
    expectedVersion: process.env.APP_VERSION ?? process.env.VITE_APP_VERSION
});

const proxyTarget =
    process.env.VITE_PROXY_TARGET ?? 'http://localhost:3000';

export default defineConfig({
    define: {
        'import.meta.env.VITE_APP_VERSION': JSON.stringify(buildInfo.version),
        'import.meta.env.VITE_APP_REVISION': JSON.stringify(buildInfo.revision)
    },
    plugins: [
        vue()
    ],
    resolve: {
        dedupe: [
            '@zxing/library'
        ]
    },
    server: {
        proxy: {
            '/api': {
                target:
                    proxyTarget,
                changeOrigin:
                    true
            }
        }
    }
});
