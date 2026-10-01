import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { after, before, test } from 'node:test';

import sharp from 'sharp';

import { createTestApp } from '../helpers/test-app.js';

let context;
let token;
let validPng;
let maxMediaSize;

before(async () => {
    context = await createTestApp();
    token = await context.login();
    ({ MAX_MEDIA_SIZE: maxMediaSize } = await import(
        '../../src/services/media-service.js'
    ));
    validPng = await sharp({
        create: {
            width: 1800,
            height: 900,
            channels: 3,
            background: '#2357a4'
        }
    }).png().toBuffer();
});

after(async () => {
    await context.close();
});

for (const [format, mimeType] of [
    ['png', 'image/png'],
    ['jpeg', 'image/jpeg'],
    ['webp', 'image/webp']
]) {
    test(`POST /api/media preserves ${format} and generates decodable WebP derivatives`, async () => {
        const buffer = await sharp(validPng).toFormat(format).toBuffer();
        const itemId = createBookItem();
        const response = await upload(itemId, buffer, mimeType);

        assert.equal(response.statusCode, 201);
        const media = response.json();
        assert.equal(media.item_id, itemId);
        assert.equal(media.mime_type, mimeType);
        assert.equal(media.size, buffer.length);
        assert.equal(media.is_primary, 1);

        const directory = path.join(context.dataDir, 'uploads', 'items', String(itemId));
        const original = await fs.readFile(path.join(directory, 'originals', media.filename));
        assert.deepEqual(original, buffer);

        for (const [filePath, expectedFormat, width, height] of [
            [path.join(directory, 'originals', media.filename), format, 1800, 900],
            [path.join(directory, 'images', `${media.id}.webp`), 'webp', 1600, 800],
            [path.join(directory, 'thumbs', `${media.id}.webp`), 'webp', 320, 320]
        ]) {
            const metadata = await sharp(filePath).metadata();
            assert.equal(metadata.format, expectedFormat);
            assert.equal(metadata.width, width);
            assert.equal(metadata.height, height);
            await assert.doesNotReject(sharp(filePath).raw().toBuffer());
        }
    });
}

for (const [name, makeBuffer, mimeType, statusCode, message] of [
    ['invalid content', () => Buffer.from('not an image'), 'image/png', 400, 'Invalid image file'],
    ['truncated PNG', () => validPng.subarray(0, 20), 'image/png', 400, 'Invalid image file'],
    ['empty content', () => Buffer.alloc(0), 'image/png', 400, 'File is empty'],
    ['unsupported MIME type', () => validPng, 'text/plain', 400, 'Unsupported media type'],
    ['unsupported image format', () => sharp(validPng).gif().toBuffer(), 'image/png', 400, 'Unsupported image format'],
    ['oversized file', () => Buffer.alloc(maxMediaSize + 1), 'image/png', 413, 'File is too large'],
    ['oversized dimensions', () => sharp({
        create: { width: 12001, height: 1, channels: 3, background: '#2357a4' }
    }).png().toBuffer(), 'image/png', 400, 'Image dimensions are too large']
]) {
    test(`POST /api/media rejects ${name} without leaking decoder errors or storing media`, async () => {
        const itemId = createBookItem();
        const response = await upload(itemId, await makeBuffer(), mimeType);

        assert.equal(response.statusCode, statusCode);
        assert.deepEqual(response.json(), { error: message });
        const media = context.db.prepare('SELECT id FROM media WHERE item_id = ?').all(itemId);
        assert.deepEqual(media, []);
        const directory = path.join(context.dataDir, 'uploads', 'items', String(itemId));
        await assert.rejects(fs.access(directory), { code: 'ENOENT' });
    });
}

function createBookItem() {
    const plugin = context.db.prepare("SELECT id FROM plugins WHERE code = 'books'").get();
    const result = context.db.prepare(`
        INSERT INTO items (plugin_id, title, description, metadata)
        VALUES (?, 'Media upload regression', '', '{}')
    `).run(plugin.id);
    return result.lastInsertRowid;
}

function upload(itemId, buffer, mimeType) {
    const boundary = 'collectionmgnt-media-regression';
    const payload = Buffer.concat([
        Buffer.from(
            `--${boundary}\r\nContent-Disposition: form-data; name="item_id"\r\n\r\n${itemId}\r\n` +
            `--${boundary}\r\nContent-Disposition: form-data; name="is_primary"\r\n\r\ntrue\r\n` +
            `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="image.bin"\r\n` +
            `Content-Type: ${mimeType}\r\n\r\n`
        ),
        buffer,
        Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);
    return context.app.inject({
        method: 'POST',
        url: '/api/media',
        headers: {
            authorization: `Bearer ${token}`,
            'content-type': `multipart/form-data; boundary=${boundary}`
        },
        payload
    });
}
