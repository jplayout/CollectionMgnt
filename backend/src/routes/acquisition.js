import {
    AcquisitionProviderRegistry
} from '../acquisition/provider-registry.js';

import {
    AcquisitionService
} from '../acquisition/acquisition-service.js';

import {
    AcquisitionError
} from '../acquisition/errors.js';

export default async function (
    fastify
) {

    const registry =
        fastify.acquisitionProviderRegistry ??
        new AcquisitionProviderRegistry();

    const service =
        fastify.acquisitionService ??
        new AcquisitionService({
            providerRegistry:
                registry
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
