const { expect, test } = require('@playwright/test');
const { readFileSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const version = readFileSync(path.join(root, 'VERSION'), 'utf8').trim();
const revision = process.env.APP_REVISION ?? process.env.VITE_APP_REVISION ?? localRevision();
let adminToken;

test.beforeAll(async ({ request }) => {
    const response = await request.post('/api/auth/login', {
        data: { username: 'admin', password: 'e2e-admin-password' }
    });
    expect(response.ok()).toBeTruthy();
    adminToken = (await response.json()).token;
});

test.beforeEach(async ({ page }) => {
    await page.addInitScript((value) => sessionStorage.setItem('auth_token', value), adminToken);
});

function localRevision() {
    try {
        return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch {
        return 'development';
    }
}

test('Settings shows canonical product version and a separate short build SHA', async ({ page }) => {
    await page.goto('/admin');
    const info = page.getByTestId('application-build-info');
    await expect(info.locator('div').filter({ has: page.locator('dt', { hasText: /^Version$/ }) }).locator('dd')).toHaveText(version);
    await expect(info.locator('div').filter({ has: page.locator('dt', { hasText: /^Build$/ }) }).locator('dd')).toHaveText(
        /^[a-f0-9]{7,64}$/i.test(revision) ? revision.slice(0, 7).toLowerCase() : 'development'
    );
    await expect(info).not.toContainText('lot');
});

test('Settings retains frontend build metadata when the system API is unavailable', async ({ page }) => {
    await page.route('**/api/admin/system-summary', route => route.fulfill({
        status: 503, json: { error: 'Résumé système indisponible.' }
    }));
    await page.goto('/admin');
    await expect(page.getByTestId('application-build-info')).toContainText(version);
    await expect(page.locator('.error-message')).toContainText('Résumé système indisponible.');
});

test('frontend build helpers use development fallback and format injected SHA', async ({ page }) => {
    await page.goto('/admin');
    const result = await page.evaluate(async (productVersion) => {
        const { getApplicationBuildInfo, formatBuildRevision } = await import('/src/services/build-info.js');
        return {
            fallback: getApplicationBuildInfo({}),
            injected: getApplicationBuildInfo({ VITE_APP_VERSION: productVersion, VITE_APP_REVISION: 'abcdef0123456789' }),
            invalid: formatBuildRevision('sensitive-value')
        };
    }, version);
    expect(result.fallback).toEqual({ version: 'development', build: 'development' });
    expect(result.injected).toEqual({
        version, build: 'abcdef0'
    });
    expect(result.invalid).toBe('development');
});
