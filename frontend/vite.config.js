import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

const proxyTarget =
    process.env.VITE_PROXY_TARGET ?? 'http://localhost:3000';

export default defineConfig({
    plugins: [
        vue()
    ],
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
