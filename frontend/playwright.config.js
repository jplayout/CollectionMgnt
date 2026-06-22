import {
    defineConfig,
    devices
} from '@playwright/test';

export default defineConfig({
    testDir:
        './e2e',
    fullyParallel:
        false,
    workers:
        1,
    reporter:
        process.env.CI ? 'github' : 'list',
    use: {
        baseURL:
            'http://127.0.0.1:4173',
        screenshot:
            'off',
        trace:
            'retain-on-failure',
        video:
            'off'
    },
    projects: [
        {
            name:
                'chromium',
            use: {
                ...devices['Desktop Chrome']
            }
        }
    ],
    webServer: [
        {
            command:
                'node e2e/scripts/start-backend.mjs',
            reuseExistingServer:
                false,
            timeout:
                45000,
            url:
                'http://127.0.0.1:3101/health'
        },
        {
            command:
                'npm run dev -- --host 127.0.0.1 --port 4173',
            env: {
                VITE_PROXY_TARGET:
                    'http://127.0.0.1:3100'
            },
            reuseExistingServer:
                !process.env.CI,
            timeout:
                45000,
            url:
                'http://127.0.0.1:4173'
        }
    ]
});
