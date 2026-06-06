import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';

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

        try {

            await fsp.mkdir(
                path.dirname(filePath),
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

        await removeFileIfExists(
            filePath
        );

        this.repository.delete(
            media.id
        );

        return true;

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
