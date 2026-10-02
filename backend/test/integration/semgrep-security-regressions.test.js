import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { validateItem } from '../../src/services/item-validator.js';
import { loadPlugins } from '../../src/plugins/plugin-loader.js';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'semgrep-regressions-'));
process.env.DATA_DIR = path.join(root, 'data');
await fs.mkdir(process.env.DATA_DIR);
const { getSafeMediaPath, hasNoSymlinkComponents } = await import('../../src/security/media-path.js');
const { MediaCleanupService } = await import('../../src/services/media-cleanup-service.js');
const { MediaAuditService } = await import('../../src/services/media-audit-service.js');
const { MediaService } = await import('../../src/services/media-service.js');
const { BackupService } = await import('../../src/services/backup-service.js');
after(async () => fs.rm(root, { recursive: true, force: true }));
function validate(pattern, value) {
    return validateItem({ fields: [{ name: 'code', type: 'text', pattern }] },
        { title: 'Example', metadata: { code: value } });
}
test('plugin patterns preserve anchored, unanchored and JS Unicode matching', () => {
    assert.deepEqual(validate('^ABC-[0-9]+$', 'ABC-123'), []);
    assert.deepEqual(validate('ABC', 'prefix ABC suffix'), []);
    assert.deepEqual(validate('^\\u0041+$', 'AAA'), []);
    assert.deepEqual(validate('^ABC-[0-9]+$', 'invalid'), ['code does not match pattern']);
    assert.deepEqual(validate('[', 'ABC'), ['code has an invalid pattern']);
});
test('nested-quantifier plugin patterns cannot stall validation', { timeout: 5000 }, () => {
    const source = `import { validateItem } from './src/services/item-validator.js';
        const errors = validateItem({fields:[{name:'code',type:'text',pattern:'^(a+)+$'}]},
            {title:'Example',metadata:{code:'a'.repeat(16000)+'!'}});
        if (errors[0] !== 'code does not match pattern') process.exit(1);`;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', source], {
        cwd: new URL('../../', import.meta.url), timeout: 3000, encoding: 'utf8'
    });
    assert.equal(result.error, undefined);
    assert.equal(result.status, 0, result.stderr);
});
test('pattern/input limits and unsupported syntax fail closed', () => {
    assert.deepEqual(validate('a'.repeat(1025), 'a'), ['code has an invalid pattern']);
    assert.deepEqual(validate('a', 'a'.repeat(16385)), ['code exceeds the pattern input limit (16384 characters)']);
    assert.deepEqual(validate('(a)\\1', 'aa'), ['code has an invalid pattern']);
    assert.deepEqual(validate('a(?=b)', 'ab'), ['code has an invalid pattern']);
});
test('media paths reject traversal, absolute paths, separators and encoded names', () => {
    for (const filename of ['../secret.jpg', '/tmp/secret.jpg', '..\\secret.jpg', '%2e%2e%2fsecret.jpg', '1.jpg/../../secret']) {
        assert.throws(() => getSafeMediaPath(1, 'originals', filename), /Unsafe media path/);
    }
    for (const id of ['../1', '/tmp', '1', -1, 0, NaN]) assert.throws(() => getSafeMediaPath(id), /Unsafe media path/);
    assert.throws(() => getSafeMediaPath(1, '../originals', '1.jpg'), /Unsafe media path/);
    assert.equal(getSafeMediaPath(1, 'originals', '1.jpg'), path.join(process.env.DATA_DIR, 'uploads/items/1/originals/1.jpg'));
    assert.equal(hasNoSymlinkComponents(path.join(root, 'outside')), false);
});
test('media reads and writes refuse file and parent symlinks', async () => {
    const itemRoot = getSafeMediaPath(2);
    const outside = path.join(root, 'outside');
    await fs.mkdir(outside);
    await fs.mkdir(itemRoot, { recursive: true });
    await fs.symlink(outside, path.join(itemRoot, 'originals'));
    assert.throws(() => getSafeMediaPath(2, 'originals', '1.jpg'), /symlink/);
    const service = new MediaService({});
    service.repository.findById = () => ({ id: 1, item_id: 2, filename: '1.jpg' });
    assert.throws(() => service.getOriginalStream(1), /symlink/);
    await fs.unlink(path.join(itemRoot, 'originals'));
    await fs.mkdir(path.join(itemRoot, 'originals'));
    await fs.writeFile(path.join(outside, 'file.jpg'), 'outside');
    await fs.symlink(path.join(outside, 'file.jpg'), path.join(itemRoot, 'originals/1.jpg'));
    assert.throws(() => getSafeMediaPath(2, 'originals', '1.jpg'), /symlink/);
});
test('cleanup refuses traversal and parent symlinks and preserves outside files', async () => {
    const service = new MediaCleanupService({});
    const outside = path.join(root, 'cleanup-outside');
    await fs.mkdir(outside);
    await fs.writeFile(path.join(outside, 'secret.jpg'), 'keep');
    const itemRoot = getSafeMediaPath(3);
    await fs.mkdir(itemRoot, { recursive: true });
    await fs.symlink(outside, path.join(itemRoot, 'originals'));
    service.auditService.runAudit = async () => ({ dbIssues: [], warnings: [], cleanupCandidates: [
        { code: 'UNEXPECTED_FILE', candidate_type: 'file', path: 'uploads/items/3/originals/secret.jpg' },
        { code: 'UNEXPECTED_FILE', candidate_type: 'file', path: '../cleanup-outside/secret.jpg' },
        { code: 'UNEXPECTED_FILE', candidate_type: 'file', path: path.join(outside, 'secret.jpg') }
    ] });
    const result = await service.preview();
    assert.deepEqual(result.candidates, []);
    assert.equal(result.warnings.length, 3);
    assert.equal(await fs.readFile(path.join(outside, 'secret.jpg'), 'utf8'), 'keep');
});
test('audit reports unsafe database filenames without following them', async () => {
    const service = new MediaAuditService({});
    service.repository.findItemIds = () => [1];
    service.repository.findMediaRows = () => [{ id: 1, item_id: 1, filename: '../../secret.jpg' }];
    const report = await service.runAudit();
    assert.equal(report.dbIssues[0].code, 'MEDIA_PATH_UNSAFE');
});
test('plugin loader refuses symlink definitions; normal definitions load', async () => {
    const plugins = path.join(root, 'plugins');
    const directory = path.join(plugins, 'example');
    await fs.mkdir(directory, { recursive: true });
    const manifest = path.join(directory, 'manifest.json');
    await fs.writeFile(manifest, JSON.stringify({ id: 'example', name: 'Example', version: '1.0.0' }));
    await fs.writeFile(path.join(directory, 'fields.json'), '[]');
    assert.equal((await loadPlugins(plugins))[0].id, 'example');
    await fs.unlink(manifest);
    const outside = path.join(root, 'manifest.json');
    await fs.writeFile(outside, JSON.stringify({ id: 'outside', name: 'Outside', version: '1.0.0' }));
    await fs.symlink(outside, manifest);
    await assert.rejects(loadPlugins(plugins), /regular files/);
});
test('backup refuses symlink media roots instead of archiving outside files', async () => {
    const items = path.join(process.env.DATA_DIR, 'uploads/items');
    const renamed = path.join(process.env.DATA_DIR, 'uploads/items.saved');
    await fs.rename(items, renamed);
    const outside = path.join(root, 'backup-outside');
    await fs.mkdir(outside);
    await fs.writeFile(path.join(outside, 'secret.txt'), 'must not be archived');
    await fs.symlink(outside, items);
    try {
        const service = new BackupService({});
        service.db.backup = async file => fs.writeFile(file, 'db');
        service.getCounts = () => ({});
        service.exportService.buildApplicationExport = () => ({});
        const { archive } = await service.createBackupArchive();
        const entries = [];
        archive.on('entry', entry => entries.push(entry.name));
        archive.resume();
        const completed = new Promise((resolve, reject) => {
            archive.once('end', resolve); archive.once('error', reject);
        });
        await archive.finalize();
        await completed;
        assert.equal(entries.some(name => name.startsWith('media/')), false);
    } finally {
        await fs.unlink(items);
        await fs.rename(renamed, items);
    }
});


test('cleanup rechecks parent symlinks at execution after a valid preview', async () => {
    const service = new MediaCleanupService({});
    const outside = path.join(root, 'execution-outside');
    await fs.mkdir(outside);
    await fs.writeFile(path.join(outside, '4.jpg'), 'keep');
    const itemRoot = getSafeMediaPath(4);
    await fs.mkdir(itemRoot, { recursive: true });
    await fs.symlink(outside, path.join(itemRoot, 'originals'));
    service.preview = async () => ({ candidates: [{
        id: 'cached-server-id', type: 'file', code: 'UNEXPECTED_FILE',
        relativePath: 'uploads/items/4/originals/4.jpg'
    }] });
    const result = await service.execute(['cached-server-id']);
    assert.equal(result.deleted.length, 0);
    assert.equal(result.errors[0].reason, 'unsafe_path');
    assert.equal(await fs.readFile(path.join(outside, '4.jpg'), 'utf8'), 'keep');
});

test('upload failure on a symlink rolls back the pending media row', async () => {
    const { default: sharp } = await import('sharp');
    const buffer = await sharp({ create: { width: 1, height: 1, channels: 3, background: 'white' } }).png().toBuffer();
    const itemRoot = getSafeMediaPath(5);
    await fs.mkdir(itemRoot, { recursive: true });
    await fs.symlink(path.join(root, 'outside'), path.join(itemRoot, 'originals'));
    const service = new MediaService({});
    const deleted = [];
    service.repository.findItemWithPlugin = () => ({ id: 5, supports_images: 1 });
    service.repository.createPending = () => 5;
    service.repository.delete = id => deleted.push(id);
    await assert.rejects(service.createOriginalMedia({ itemId: 5, buffer, mimeType: 'image/png' }), /symlink/);
    assert.deepEqual(deleted, [5]);
});
