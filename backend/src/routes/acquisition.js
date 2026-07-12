import {
    AcquisitionCache
} from '../acquisition/acquisition-cache.js';

import {
    AcquisitionProviderRegistry
} from '../acquisition/provider-registry.js';

import {
    AcquisitionService
} from '../acquisition/acquisition-service.js';

import {
    AcquisitionImageImportError,
    AcquisitionImageImportService
} from '../acquisition/acquisition-image-import-service.js';

import {
    AcquisitionError
} from '../acquisition/errors.js';

import {
    AcquisitionCacheRepository
} from '../repositories/acquisition-cache-repository.js';

export default async function (
    fastify
) {

    const registry =
        fastify.acquisitionProviderRegistry ??
        new AcquisitionProviderRegistry();

    const acquisitionCache =
        fastify.acquisitionCache ??
        (
            fastify.db
                ? new AcquisitionCache({
                    repository:
                        new AcquisitionCacheRepository(
                            fastify.db
                        )
                })
                : null
        );

    const service =
        fastify.acquisitionService ??
        new AcquisitionService({
            acquisitionCache,
            providerRegistry:
                registry
        });

    const imageImportService =
        fastify.acquisitionImageImportService ??
        new AcquisitionImageImportService({
            db:
                fastify.db
        });

    fastify.get(
        '/api/acquisition/providers',
        async () => ({
            providers:
                service.listProviders()
        })
    );

    fastify.post(
        '/api/acquisition/books/isbn/lookup',
        async (
            request,
            reply
        ) => {

            try {

                return await service.lookupBookByIsbn({
                    isbn:
                        request.body?.isbn,
                    providerId:
                        request.body?.provider ?? null
                });

            } catch (error) {

                return sendAcquisitionError(
                    reply,
                    error
                );

            }

        }
    );

    fastify.post(
        '/api/acquisition/movies/search',
        async (
            request,
            reply
        ) => {

            try {

                return await service.searchMovies({
                    language:
                        request.body?.language ?? null,
                    providerId:
                        request.body?.provider ?? null,
                    query:
                        request.body?.query,
                    region:
                        request.body?.region ?? null,
                    year:
                        request.body?.year ?? null
                });

            } catch (error) {

                return sendAcquisitionError(
                    reply,
                    error
                );

            }

        }
    );

    fastify.post(
        '/api/acquisition/games/search',
        async (
            request,
            reply
        ) => {

            try {

                return await service.searchGames({
                    platform:
                        request.body?.platform ?? null,
                    providerId:
                        request.body?.provider ?? null,
                    query:
                        request.body?.query,
                    year:
                        request.body?.year ?? null
                });

            } catch (error) {

                return sendAcquisitionError(
                    reply,
                    error
                );

            }

        }
    );

    fastify.post(
        '/api/acquisition/images/import',
        async (
            request,
            reply
        ) => {

            try {

                const media =
                    await imageImportService.importImage(
                        request.body
                    );

                return reply
                    .code(201)
                    .send(
                        media
                    );

            } catch (error) {

                return sendAcquisitionImageImportError(
                    reply,
                    error
                );

            }

        }
    );

}

function sendAcquisitionError(
    reply,
    error
) {

    if (
        error instanceof AcquisitionError
    ) {

        return reply
            .code(
                error.statusCode
            )
            .send({
                code:
                    error.code,
                error:
                    error.code,
                message:
                    error.message
            });

    }

    return reply
        .code(503)
        .send({
            code:
                'provider_error',
            error:
                'provider_error',
            message:
                'Provider lookup failed'
        });

}

function sendAcquisitionImageImportError(
    reply,
    error
) {

    if (
        error instanceof AcquisitionImageImportError
    ) {

        return reply
            .code(
                error.statusCode
            )
            .send({
                code:
                    error.code,
                error:
                    error.code,
                message:
                    error.message
            });

    }

    if (
        error?.name === 'MediaError'
    ) {

        return reply
            .code(
                error.statusCode
            )
            .send({
                code:
                    'media_error',
                error:
                    'media_error',
                message:
                    error.message
            });

    }

    return reply
        .code(503)
        .send({
            code:
                'image_import_failed',
            error:
                'image_import_failed',
            message:
                'Image import failed'
        });

}
