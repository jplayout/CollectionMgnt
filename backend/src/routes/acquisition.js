import {
    AcquisitionError
} from '../acquisition/errors.js';

import {
    AcquisitionProviderRegistry
} from '../acquisition/provider-registry.js';

import {
    isValidIsbn,
    normalizeIdentifier
} from '../services/item-validator.js';

export default async function (
    fastify
) {

    const registry =
        fastify.acquisitionProviderRegistry ??
        new AcquisitionProviderRegistry();

    fastify.get(
        '/api/acquisition/providers',
        async () => ({
            providers:
                registry.listProviders()
        })
    );

    fastify.post(
        '/api/acquisition/books/isbn/lookup',
        async (
            request,
            reply
        ) => {

            const isbn =
                request.body?.isbn;

            if (
                typeof isbn !== 'string' ||
                !isValidIsbn(
                    isbn
                )
            ) {

                return sendAcquisitionError(
                    reply,
                    new AcquisitionError(
                        400,
                        'invalid_isbn',
                        'ISBN must be a valid ISBN-10 or ISBN-13'
                    )
                );

            }

            const normalizedIsbn =
                normalizeIdentifier(
                    isbn
                );

            try {

                const provider =
                    request.body?.provider
                        ? registry.getProvider(
                            request.body.provider
                        )
                        : registry.getDefaultProviderFor({
                            capability:
                                'isbnLookup',
                            plugin:
                                'books'
                        });

                const results =
                    await provider.lookupIsbn(
                        normalizedIsbn
                    );

                return {
                    query: {
                        plugin:
                            'books',
                        type:
                            'isbn',
                        value:
                            normalizedIsbn
                    },
                    results
                };

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

