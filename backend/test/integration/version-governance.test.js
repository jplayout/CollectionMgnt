import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { getBuildInfo, isProductVersion, readProductVersion } from '../../src/config/build-info.js';
import { checkVersionGovernance } from '../../../scripts/check-version-governance.mjs';
import { createTestApp } from '../helpers/test-app.js';

const canonical = readFileSync(new URL('../../../VERSION', import.meta.url), 'utf8').trim();
const revision = 'abcdef0123456789abcdef0123456789abcdef01';

test('VERSION is read relative to the module, independently of the working directory', () => {
    const previous = process.cwd();
    try {
        process.chdir(os.tmpdir());
        assert.equal(readProductVersion(), canonical);
    } finally {
        process.chdir(previous);
    }
});

test('SemVer supports development, alpha, RC and releases but rejects invalid values', () => {
    for (const value of ['1.2.3-dev', '1.2.3-alpha.1', '1.2.3-rc.1', '1.2.3', '1.2.3+metadata']) {
        assert.equal(isProductVersion(value), true, value);
    }
    for (const value of ['v1.2.3', '01.2.3', '1.2.3-alpha.01', '1.2', '1.2.3\nsecret']) {
        assert.equal(isProductVersion(value), false, value);
    }
});

test('missing VERSION has an explicit development fallback, production fails, invalid files fail', (t) => {
    const root = temporaryDirectory(t);
    const versionFile = path.join(root, 'VERSION');
    assert.equal(readProductVersion({ versionFile, allowMissing: true }), 'development');
    assert.throws(() => readProductVersion({ versionFile, allowMissing: false }), { code: 'ENOENT' });
    writeFileSync(versionFile, 'invalid\n');
    assert.throws(() => readProductVersion({ versionFile }), /SemVer/);
    writeFileSync(versionFile, '1.2.3-rc.2\n');
    assert.equal(readProductVersion({ versionFile }), '1.2.3-rc.2');
});

test('injected revision skips git, production without a revision never executes git', () => {
    const resolveRevision = () => assert.fail('git must not be executed');
    assert.deepEqual(getBuildInfo({ revision, resolveRevision }), { version: canonical, revision });
    assert.deepEqual(getBuildInfo({ revision: undefined, allowGit: false, resolveRevision }), {
        version: canonical, revision: 'development'
    });
    assert.equal(getBuildInfo({ revision: 'not-a-sha', resolveRevision }).revision, 'development');
});

test('local revision and unavailable git fallback are supported; injected version cannot diverge', () => {
    assert.equal(getBuildInfo({ allowGit: true, resolveRevision: () => revision }).revision, revision);
    assert.equal(getBuildInfo({ allowGit: true, resolveRevision: () => 'development' }).revision, 'development');
    assert.throws(() => getBuildInfo({ expectedVersion: '9.9.9', allowGit: false }), /must match/);
});

test('NODE_ENV=production disables git resolution by default', () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
        assert.deepEqual(getBuildInfo({
            revision: null,
            resolveRevision: () => assert.fail('production must never launch git')
        }), { version: canonical, revision: 'development' });
    } finally {
        if (previous === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = previous;
    }
});

test('authenticated system API exposes canonical version and injected revision only', async () => {
    const previous = process.env.APP_REVISION;
    process.env.APP_REVISION = revision;
    let context;
    try {
        context = await createTestApp();
        const token = await context.login();
        const response = await context.app.inject({
            method: 'GET', url: '/api/admin/system-summary',
            headers: { authorization: `Bearer ${token}` }
        });
        assert.equal(response.statusCode, 200);
        const body = response.json();
        assert.equal(body.version, canonical);
        assert.equal(body.revision, revision);
        assert.deepEqual(Object.keys(body).sort(), ['counts', 'revision', 'version']);
    } finally {
        if (context) await context.close();
        if (previous === undefined) delete process.env.APP_REVISION;
        else process.env.APP_REVISION = previous;
    }
});

test('version gate accepts the repository and rejects missing/invalid VERSION and competing sources', (t) => {
    assert.deepEqual(checkVersionGovernance(), []);
    const root = temporaryDirectory(t);
    assert.match(checkVersionGovernance(root).join('\n'), /VERSION is missing/);
    writeFileSync(path.join(root, 'VERSION'), 'invalid\n');
    assert.match(checkVersionGovernance(root).join('\n'), /SemVer/);
    writeFileSync(path.join(root, 'VERSION'), `${canonical}\n`);
    writeFileSync(path.join(root, 'package.json'), JSON.stringify({ version: canonical }));
    writeFileSync(path.join(root, 'package-lock.json'), JSON.stringify({ packages: { '': { version: canonical } } }));
    mkdirSync(path.join(root, 'frontend/src'), { recursive: true });
    mkdirSync(path.join(root, 'backend/src'), { recursive: true });
    writeFileSync(path.join(root, 'frontend/src/About.vue'), '<template><p>Version: 1.2.3-dev</p></template>');
    writeFileSync(path.join(root, 'backend/src/version.js'), `const version = 'v${[0, 12].join('.')}-lot10.0.1';`);
    const errors = checkVersionGovernance(root).join('\n');
    assert.match(errors, /package manifests/);
    assert.match(errors, /application lockfile/);
    assert.match(errors, /hardcoded frontend/);
    assert.match(errors, /obsolete product/);
});

function temporaryDirectory(t) {
    const root = mkdtempSync(path.join(os.tmpdir(), 'collectionmgnt-version-'));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    return root;
}
