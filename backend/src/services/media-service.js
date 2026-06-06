import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';

import sharp from 'sharp';

import {
    MediaRepository
} from '../repositories/media-repository.js';

const ALLOWED_MIME_TYPES = new Map([
    [
        'image/jpeg',
        'jpg'
    ],
    [
        'image/png',
        'png'
    ],
    [
        'image/webp',
        'webp'
    ]
]);

export const MAX_MEDIA_SIZE =
    10 * 1024 * 1024;

const MAX_IMAGE_WIDTH =
    12000;

const MAX_IMAGE_HEIGHT =
    12000;

const ALLOWED_IMAGE_FORMATS = [
    'jpeg',
    'png',
    'webp'
];

export class MediaError extends Error {

    constructor(
        statusCode,
        message
    ) {

        super(message);
        this.name = 'MediaError';
        this.statusCode = statusCode;

    }

}

export class MediaService {

    constructor(db) {
        this.repository =
            new MediaRepository(
                db
            );
    }

    async createOriginalMedia(data) {

        const item =
            this.repository.findItemWithPlugin(
                data.itemId
            );

        if (
            !item
        ) {

            throw new MediaError(
                404,
                'Item not found'
            );

        }

        if (
            item.supports_images === 0
        ) {

            throw new MediaError(
                400,
                'Plugin does not support images'
            );

        }

        validateUpload(
            data
        );

        await validateImageContent(
            data.buffer
        );

        const mediaId =
            this.repository.createPending({
                item_id:
                    item.id,
                mime_type:
                    data.mimeType,
                size:
                    data.buffer.length
            });

        const filename =
            `${mediaId}.${getExtension(data.mimeType)}`;

        const filePath =
            getMediaFilePath(
                item.id,
                filename
            );

        const optimizedPath =
            getOptimizedFilePath(
                item.id,
                mediaId
            );

        const thumbnailPath =
            getThumbnailFilePath(
                item.id,
                mediaId
            );

        try {

            await fsp.mkdir(
                path.dirname(filePath),
                {
                    recursive: true
                }
            );

            await fsp.mkdir(
                path.dirname(optimizedPath),
                {
                    recursive: true
                }
            );

            await fsp.mkdir(
                path.dirname(thumbnailPath),
                {
                    recursive: true
                }
            );

            await fsp.writeFile(
                filePath,
                data.buffer,
                {
                    flag: 'wx'
                }
            );

            await generateOptimizedImage(
                data.buffer,
                optimizedPath
            );

            await generateThumbnail(
                data.buffer,
                thumbnailPath
            );

            this.repository.finalize({
                id:
                    mediaId,
                item_id:
                    item.id,
                filename,
                is_primary:
                    data.isPrimary
            });

        } catch (error) {

            this.repository.delete(
                mediaId
            );

            await removeFileIfExists(
                filePath
            );

            await removeFileIfExists(
                optimizedPath
            );

            await removeFileIfExists(
                thumbnailPath
            );

            throw error;

        }

        return this.repository.findById(
            mediaId
        );

    }

    listByItemId(itemId) {

        const item =
            this.repository.findItemWithPlugin(
                itemId
            );

        if (
            !item
        ) {

            throw new MediaError(
                404,
                'Item not found'
            );

        }

        return this.repository.findByItemId(
            item.id
        );

    }

    getById(id) {

        const media =
            this.repository.findById(
                id
            );

        if (
            !media
        ) {

            throw new MediaError(
                404,
                'Media not found'
            );

        }

        return media;

    }

    getOriginalStream(id) {

        const media =
            this.getById(
                id
            );

        const filePath =
            getMediaFilePath(
                media.item_id,
                media.filename
            );

        if (
            !fs.existsSync(filePath)
        ) {

            throw new MediaError(
                404,
                'Media file not found'
            );

        }

        return {
            media,
            stream:
                fs.createReadStream(
                    filePath
                )
        };

    }

    getThumbnailStream(id) {

        const media =
            this.getById(
                id
            );

        const thumbnailPath =
            getThumbnailFilePath(
                media.item_id,
                media.id
            );

        if (
            !fs.existsSync(thumbnailPath)
        ) {

            throw new MediaError(
                404,
                'Media thumbnail not found'
            );

        }

        return {
            stream:
                fs.createReadStream(
                    thumbnailPath
                )
        };

    }

    setPrimary(id) {

        const media =
            this.repository.setPrimary(
                id
            );

        if (
            !media
        ) {

            throw new MediaError(
                404,
                'Media not found'
            );

        }

        return media;

    }

    async delete(id) {

        const media =
            this.getById(
                id
            );

        const filePath =
            getMediaFilePath(
                media.item_id,
                media.filename
            );

        const optimizedPath =
            getOptimizedFilePath(
                media.item_id,
                media.id
            );

        const thumbnailPath =
            getThumbnailFilePath(
                media.item_id,
                media.id
            );

        const replacement =
            media.is_primary
                ? this.repository.findFirstByItemId(
                    media.item_id,
                    media.id
                )
                : null;

        await removeFileIfExists(
            filePath
        );

        await removeFileIfExists(
            optimizedPath
        );

        await removeFileIfExists(
            thumbnailPath
        );

        this.repository.delete(
            media.id
        );

        if (
            replacement
        ) {

            this.repository.setPrimary(
                replacement.id
            );

        }

        return true;

    }

}

async function validateImageContent(buffer) {

    let metadata;

    try {

        metadata =
            await sharp(
                buffer
            )
                .metadata();

    } catch {

        throw new MediaError(
            400,
            'Invalid image file'
        );

    }

    if (
        !ALLOWED_IMAGE_FORMATS.includes(
            metadata.format
        )
    ) {

        throw new MediaError(
            400,
            'Unsupported image format'
        );

    }

    if (
        metadata.width > MAX_IMAGE_WIDTH ||
        metadata.height > MAX_IMAGE_HEIGHT
    ) {

        throw new MediaError(
            400,
            'Image dimensions are too large'
        );

    }

}

async function generateOptimizedImage(
    buffer,
    filePath
) {

    try {

        await sharp(
            buffer
        )
            .rotate()
            .resize({
                width:
                    1600,
                height:
                    1600,
                fit:
                    'inside',
                withoutEnlargement:
                    true
            })
            .webp({
                quality:
                    82
            })
            .toFile(
                filePath
            );

    } catch {

        throw new MediaError(
            500,
            'Failed to process image'
        );

    }

}

async function generateThumbnail(
    buffer,
    filePath
) {

    try {

        await sharp(
            buffer
        )
            .rotate()
            .resize({
                width:
                    320,
                height:
                    320,
                fit:
                    'cover'
            })
            .webp({
                quality:
                    75
            })
            .toFile(
                filePath
            );

    } catch {

        throw new MediaError(
            500,
            'Failed to process image'
        );

    }

}

function validateUpload(data) {

    if (
        !ALLOWED_MIME_TYPES.has(data.mimeType)
    ) {

        throw new MediaError(
            400,
            'Unsupported media type'
        );

    }

    if (
        data.buffer.length === 0
    ) {

        throw new MediaError(
            400,
            'File is empty'
        );

    }

    if (
        data.buffer.length > MAX_MEDIA_SIZE
    ) {

        throw new MediaError(
            413,
            'File is too large'
        );

    }

}

function getExtension(mimeType) {

    return ALLOWED_MIME_TYPES.get(
        mimeType
    );

}

function getMediaFilePath(
    itemId,
    filename
) {

    return path.join(
        process.cwd(),
        'data',
        'uploads',
        'items',
        String(itemId),
        'originals',
        filename
    );

}

function getOptimizedFilePath(
    itemId,
    mediaId
) {

    return path.join(
        process.cwd(),
        'data',
        'uploads',
        'items',
        String(itemId),
        'images',
        `${mediaId}.webp`
    );

}

function getThumbnailFilePath(
    itemId,
    mediaId
) {

    return path.join(
        process.cwd(),
        'data',
        'uploads',
        'items',
        String(itemId),
        'thumbs',
        `${mediaId}.webp`
    );

}

async function removeFileIfExists(filePath) {

    try {

        await fsp.unlink(
            filePath
        );

    } catch (error) {

        if (
            error.code !== 'ENOENT'
        ) {

            throw error;

        }

    }

}
