import multipart from '@fastify/multipart';

import {
    MAX_MEDIA_SIZE,
    MediaError,
    MediaService
} from '../services/media-service.js';

export default async function (
    fastify
) {

    await fastify.register(
        multipart,
        {
            limits: {
                fileSize:
                    MAX_MEDIA_SIZE,
                files:
                    1
            }
        }
    );

    const service =
        new MediaService(
            fastify.db
        );

    fastify.post(
        '/api/media',
        async (
            request,
            reply
        ) => {

            try {

                const upload =
                    await parseUpload(
                        request
                    );

                const media =
                    await service.createOriginalMedia(
                        upload
                    );

                return reply
                    .code(201)
                    .send(
                        media
                    );

            } catch (error) {

                return sendMediaError(
                    reply,
                    error
                );

            }

        }
    );

    fastify.get(
        '/api/items/:id/media',
        async (
            request,
            reply
        ) => {

            try {

                return service.listByItemId(
                    Number(
                        request.params.id
                    )
                );

            } catch (error) {

                return sendMediaError(
                    reply,
                    error
                );

            }

        }
    );

    fastify.get(
        '/api/media/:id',
        async (
            request,
            reply
        ) => {

            try {

                return service.getById(
                    Number(
                        request.params.id
                    )
                );

            } catch (error) {

                return sendMediaError(
                    reply,
                    error
                );

            }

        }
    );

    fastify.get(
        '/api/media/:id/file',
        async (
            request,
            reply
        ) => {

            try {

                const {
                    media,
                    stream
                } =
                    service.getOriginalStream(
                        Number(
                            request.params.id
                        )
                    );

                return reply
                    .type(
                        media.mime_type
                    )
                    .send(
                        stream
                    );

            } catch (error) {

                return sendMediaError(
                    reply,
                    error
                );

            }

        }
    );

    fastify.get(
        '/api/media/:id/thumb',
        async (
            request,
            reply
        ) => {

            try {

                const {
                    stream
                } =
                    service.getThumbnailStream(
                        Number(
                            request.params.id
                        )
                    );

                return reply
                    .type(
                        'image/webp'
                    )
                    .send(
                        stream
                    );

            } catch (error) {

                return sendMediaError(
                    reply,
                    error
                );

            }

        }
    );

    fastify.delete(
        '/api/media/:id',
        async (
            request,
            reply
        ) => {

            try {

                await service.delete(
                    Number(
                        request.params.id
                    )
                );

                return {
                    success: true
                };

            } catch (error) {

                return sendMediaError(
                    reply,
                    error
                );

            }

        }
    );

}

async function parseUpload(
    request
) {

    const upload = {
        itemId: null,
        isPrimary: false,
        buffer: null,
        mimeType: null
    };

    for await (
        const part
        of request.parts()
    ) {

        if (
            part.type === 'file'
        ) {

            if (
                part.fieldname !== 'file'
            ) {

                throw new MediaError(
                    400,
                    'Unexpected file field'
                );

            }

            if (
                upload.buffer
            ) {

                throw new MediaError(
                    400,
                    'Only one file is allowed'
                );

            }

            upload.mimeType =
                part.mimetype;

            upload.buffer =
                await part.toBuffer();

            continue;

        }

        if (
            part.fieldname === 'item_id'
        ) {

            upload.itemId =
                Number(
                    part.value
                );

        }

        if (
            part.fieldname === 'is_primary'
        ) {

            upload.isPrimary =
                parseBoolean(
                    part.value
                );

        }

    }

    if (
        !Number.isInteger(upload.itemId) ||
        upload.itemId <= 0
    ) {

        throw new MediaError(
            400,
            'item_id is required'
        );

    }

    if (
        !upload.buffer
    ) {

        throw new MediaError(
            400,
            'file is required'
        );

    }

    return upload;

}

function parseBoolean(value) {

    return [
        true,
        'true',
        '1',
        'on',
        'yes'
    ].includes(value);

}

function sendMediaError(
    reply,
    error
) {

    if (
        error instanceof MediaError
    ) {

        return reply
            .code(
                error.statusCode
            )
            .send({
                error:
                    error.message
            });

    }

    if (
        error.code === 'FST_REQ_FILE_TOO_LARGE' ||
        error.statusCode === 413
    ) {

        return reply
            .code(413)
            .send({
                error:
                    'File is too large'
            });

    }

    throw error;

}
