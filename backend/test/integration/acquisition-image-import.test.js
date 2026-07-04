import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';
import {
    after,
    before,
    test
} from 'node:test';

import sharp from 'sharp';

import { createTestApp } from '../helpers/test-app.js';

const originalFetch =
    globalThis.fetch;

let context;
let token;
let fetchHandler;
let validImageBuffer;
let AcquisitionImageImportService;
let MAX_MEDIA_SIZE;

before(async () => {

    validImageBuffer =
        await sharp({
            create: {
                background:
                    '#2357a4',
                channels:
                    3,
                height:
                    12,
                width:
                    12
            }
        })
            .png()
            .toBuffer();

    globalThis.fetch =
        async (
            url,
            options
        ) => fetchHandler(
            url,
            options
        );

    context =
        await createTestApp();

    ({
        AcquisitionImageImportService
    } =
        await import(
            '../../src/acquisition/acquisition-image-import-service.js'
        ));

    ({
        MAX_MEDIA_SIZE
    } =
        await import(
            '../../src/services/media-service.js'
        ));

    token =
        await context.login();

});

after(async () => {

    globalThis.fetch =
        originalFetch;

    await context.close();

});

test(
    'POST /api/acquisition/images/import imports a valid provider image through MediaService',
    async () => {

        const itemId =
            createBookItem();

        fetchHandler =
            async () => createImageResponse(
                validImageBuffer,
                {
                    contentType:
                        'image/png'
                }
            );

        const response =
            await importImage({
                imageUrl:
                    'https://8.8.8.8/cover.png',
                isPrimary:
                    true,
                itemId,
                provider:
                    'openlibrary',
                source:
                    'openlibrary'
            });

        assert.equal(
            response.statusCode,
            201
        );

        const media =
            response.json();

        assert.equal(
            media.item_id,
            itemId
        );

        assert.equal(
            media.mime_type,
            'image/png'
        );

        assert.equal(
            media.is_primary,
            1
        );

        await assertFileExists(
            path.join(
                context.dataDir,
                'uploads',
                'items',
                String(itemId),
                'originals',
                media.filename
            )
        );

        await assertFileExists(
            path.join(
                context.dataDir,
                'uploads',
                'items',
                String(itemId),
                'images',
                `${media.id}.webp`
            )
        );

        await assertFileExists(
            path.join(
                context.dataDir,
                'uploads',
                'items',
                String(itemId),
                'thumbs',
                `${media.id}.webp`
            )
        );

    }
);

test(
    'AcquisitionImageImportService passes downloaded images to MediaService',
    async () => {

        let receivedData =
            null;

        const service =
            new AcquisitionImageImportService({
                fetchImpl:
                    async () => createImageResponse(
                        validImageBuffer,
                        {
                            contentType:
                                'image/png'
                        }
                    ),
                mediaService: {
                    async createOriginalMedia(data) {

                        receivedData =
                            data;

                        return {
                            id:
                                42
                        };

                    }
                }
            });

        const media =
            await service.importImage({
                imageUrl:
                    'https://8.8.4.4/cover.png',
                isPrimary:
                    true,
                itemId:
                    123
            });

        assert.deepEqual(
            media,
            {
                id:
                    42
            }
        );

        assert.equal(
            receivedData.itemId,
            123
        );

        assert.equal(
            receivedData.isPrimary,
            true
        );

        assert.equal(
            receivedData.mimeType,
            'image/png'
        );

        assert.deepEqual(
            receivedData.buffer,
            validImageBuffer
        );

    }
);

test(
    'POST /api/acquisition/images/import requires authentication',
    async () => {

        const response =
            await context.app.inject({
                method:
                    'POST',
                payload: {
                    imageUrl:
                        'https://8.8.8.8/cover.png',
                    itemId:
                        1
                },
                url:
                    '/api/acquisition/images/import'
            });

        assert.equal(
            response.statusCode,
            401
        );

    }
);

test(
    'POST /api/acquisition/images/import rejects localhost URLs',
    async () => {

        fetchHandler =
            async () => {

                throw new Error(
                    'fetch should not be called'
                );

            };

        const response =
            await importImage({
                imageUrl:
                    'https://localhost/cover.png',
                itemId:
                    createBookItem()
            });

        assert.equal(
            response.statusCode,
            400
        );

        assert.equal(
            response.json().code,
            'unsafe_image_url'
        );

    }
);

test(
    'POST /api/acquisition/images/import rejects private IP URLs',
    async () => {

        fetchHandler =
            async () => {

                throw new Error(
                    'fetch should not be called'
                );

            };

        const response =
            await importImage({
                imageUrl:
                    'https://192.168.1.10/cover.png',
                itemId:
                    createBookItem()
            });

        assert.equal(
            response.statusCode,
            400
        );

        assert.equal(
            response.json().code,
            'unsafe_image_url'
        );

    }
);

test(
    'POST /api/acquisition/images/import rejects private IPv6 URLs',
    async () => {

        fetchHandler =
            async () => {

                throw new Error(
                    'fetch should not be called'
                );

            };

        const response =
            await importImage({
                imageUrl:
                    'https://[fc00::1]/cover.png',
                itemId:
                    createBookItem()
            });

        assert.equal(
            response.statusCode,
            400
        );

        assert.equal(
            response.json().code,
            'unsafe_image_url'
        );

    }
);

test(
    'POST /api/acquisition/images/import rejects redirects to private IPs',
    async () => {

        fetchHandler =
            async () => createRedirectResponse(
                'https://10.0.0.5/cover.png'
            );

        const response =
            await importImage({
                imageUrl:
                    'https://8.8.8.8/redirect',
                itemId:
                    createBookItem()
            });

        assert.equal(
            response.statusCode,
            400
        );

        assert.equal(
            response.json().code,
            'unsafe_image_url'
        );

    }
);

test(
    'POST /api/acquisition/images/import rejects HTTPS to HTTP redirects',
    async () => {

        fetchHandler =
            async () => createRedirectResponse(
                'http://8.8.8.8/cover.png'
            );

        const response =
            await importImage({
                imageUrl:
                    'https://8.8.8.8/redirect',
                itemId:
                    createBookItem()
            });

        assert.equal(
            response.statusCode,
            400
        );

        assert.equal(
            response.json().code,
            'unsafe_redirect'
        );

    }
);

test(
    'AcquisitionImageImportService resolves each redirect target before downloading',
    async () => {

        const resolvedHosts =
            [];

        const requestedUrls =
            [];

        const service =
            new AcquisitionImageImportService({
                fetchImpl:
                    async url => {

                        requestedUrls.push(
                            String(url)
                        );

                        if (
                            String(url) === 'https://covers.example/redirect'
                        ) {

                            return createRedirectResponse(
                                'https://cdn.example/cover.png'
                            );

                        }

                        return createImageResponse(
                            validImageBuffer,
                            {
                                contentType:
                                    'image/png'
                            }
                        );

                    },
                lookupAddress:
                    async hostname => {

                        resolvedHosts.push(
                            hostname
                        );

                        return [
                            {
                                address:
                                    '8.8.8.8'
                            }
                        ];

                    },
                mediaService: {
                    async createOriginalMedia() {

                        return {
                            id:
                                1
                        };

                    }
                }
            });

        await service.importImage({
            imageUrl:
                'https://covers.example/redirect',
            itemId:
                123
        });

        assert.deepEqual(
            resolvedHosts,
            [
                'covers.example',
                'cdn.example'
            ]
        );

        assert.deepEqual(
            requestedUrls,
            [
                'https://covers.example/redirect',
                'https://cdn.example/cover.png'
            ]
        );

    }
);

test(
    'POST /api/acquisition/images/import handles download timeouts',
    async () => {

        fetchHandler =
            async (
                _url,
                options
            ) => new Promise(
                (
                    _resolve,
                    reject
                ) => {

                    options.signal.addEventListener(
                        'abort',
                        () => reject(
                            new DOMException(
                                'Aborted',
                                'AbortError'
                            )
                        )
                    );

                }
            );

        const response =
            await importImage({
                imageUrl:
                    'https://8.8.8.8/slow.png',
                itemId:
                    createBookItem()
            });

        assert.equal(
            response.statusCode,
            504
        );

        assert.equal(
            response.json().code,
            'image_download_timeout'
        );

    }
);

test(
    'POST /api/acquisition/images/import handles network errors',
    async () => {

        fetchHandler =
            async () => {

                throw new Error(
                    'network failed'
                );

            };

        const response =
            await importImage({
                imageUrl:
                    'https://8.8.8.8/missing.png',
                itemId:
                    createBookItem()
            });

        assert.equal(
            response.statusCode,
            502
        );

        assert.equal(
            response.json().code,
            'image_download_failed'
        );

    }
);

test(
    'POST /api/acquisition/images/import rejects invalid MIME types',
    async () => {

        fetchHandler =
            async () => createImageResponse(
                Buffer.from(
                    'not an image'
                ),
                {
                    contentType:
                        'text/plain'
                }
            );

        const response =
            await importImage({
                imageUrl:
                    'https://8.8.8.8/file.txt',
                itemId:
                    createBookItem()
            });

        assert.equal(
            response.statusCode,
            400
        );

        assert.equal(
            response.json().code,
            'unsupported_image_type'
        );

    }
);

test(
    'POST /api/acquisition/images/import rejects invalid image content',
    async () => {

        fetchHandler =
            async () => createImageResponse(
                Buffer.from(
                    'not an image'
                ),
                {
                    contentType:
                        'image/png'
                }
            );

        const response =
            await importImage({
                imageUrl:
                    'https://8.8.8.8/broken.png',
                itemId:
                    createBookItem()
            });

        assert.equal(
            response.statusCode,
            400
        );

        assert.equal(
            response.json().code,
            'media_error'
        );

        assert.equal(
            response.json().message,
            'Invalid image file'
        );

    }
);

test(
    'POST /api/acquisition/images/import rejects images that exceed the media size limit while downloading',
    async () => {

        fetchHandler =
            async () => createImageResponse(
                Buffer.alloc(
                    MAX_MEDIA_SIZE + 1
                ),
                {
                    contentType:
                        'image/png'
                }
            );

        const response =
            await importImage({
                imageUrl:
                    'https://8.8.8.8/large.png',
                itemId:
                    createBookItem()
            });

        assert.equal(
            response.statusCode,
            413
        );

        assert.equal(
            response.json().code,
            'image_too_large'
        );

    }
);

function authHeaders() {

    return {
        authorization:
            `Bearer ${token}`
    };

}

function importImage(payload) {

    return context.app.inject({
        headers:
            authHeaders(),
        method:
            'POST',
        payload,
        url:
            '/api/acquisition/images/import'
    });

}

function createBookItem() {

    const plugin =
        context.db
            .prepare(`
                SELECT id
                FROM plugins
                WHERE code = 'books'
            `)
            .get();

    const result =
        context.db
            .prepare(`
                INSERT INTO items (
                    plugin_id,
                    title,
                    description,
                    metadata
                )
                VALUES (?, 'Imported cover item', '', '{}')
            `)
            .run(
                plugin.id
            );

    return result.lastInsertRowid;

}

function createImageResponse(
    buffer,
    {
        contentType
    }
) {

    return new Response(
        buffer,
        {
            headers: {
                'content-type':
                    contentType
            },
            status:
                200
        }
    );

}

function createRedirectResponse(location) {

    return new Response(
        null,
        {
            headers: {
                location
            },
            status:
                302
        }
    );

}

async function assertFileExists(filePath) {

    await assert.doesNotReject(
        fs.access(
            filePath
        )
    );

}
