import assert from 'node:assert/strict';
import {
    test
} from 'node:test';

import { TmdbProvider } from '../../src/acquisition/providers/tmdb-provider.js';

test(
    'TmdbProvider describes the movies search capability when configured',
    () => {

        const provider =
            new TmdbProvider({
                readAccessToken:
                    'test-token'
            });

        assert.deepEqual(
            provider.describe(),
            {
                capabilities: [
                    'movies/search'
                ],
                enabled:
                    true,
                id:
                    'tmdb',
                name:
                    'The Movie Database (TMDb)',
                plugin:
                    'movies',
                requiresConfiguration:
                    true
            }
        );

    }
);

test(
    'TmdbProvider is disabled and rejects searches when the token is missing',
    async () => {

        const provider =
            new TmdbProvider({
                readAccessToken:
                    ''
            });

        assert.equal(
            provider.describe().enabled,
            false
        );

        await assert.rejects(
            () => provider.searchMovies(
                createSearchQuery()
            ),
            {
                code:
                    'provider_unavailable',
                statusCode:
                    503
            }
        );

    }
);

test(
    'TmdbProvider builds the search URL and authorization header',
    async () => {

        const calls =
            [];

        const provider =
            new TmdbProvider({
                fetchImpl:
                    async (
                        url,
                        options
                    ) => {

                        calls.push({
                            options,
                            url:
                                String(
                                    url
                                )
                        });

                        return createJsonResponse({
                            results:
                                []
                        });

                    },
                readAccessToken:
                    'test-token'
            });

        await provider.searchMovies(
            createSearchQuery({
                language:
                    'fr-FR',
                query:
                    'Blade Runner',
                region:
                    'FR',
                year:
                    '1982'
            })
        );

        assert.equal(
            calls.length,
            1
        );

        const url =
            new URL(
                calls[0].url
            );

        assert.equal(
            url.origin + url.pathname,
            'https://api.themoviedb.org/3/search/movie'
        );

        assert.equal(
            url.searchParams.get(
                'query'
            ),
            'Blade Runner'
        );

        assert.equal(
            url.searchParams.get(
                'language'
            ),
            'fr-FR'
        );

        assert.equal(
            url.searchParams.get(
                'region'
            ),
            'FR'
        );

        assert.equal(
            url.searchParams.get(
                'year'
            ),
            '1982'
        );

        assert.equal(
            url.searchParams.get(
                'include_adult'
            ),
            'false'
        );

        assert.equal(
            url.searchParams.has(
                'api_key'
            ),
            false
        );

        assert.equal(
            calls[0].options.headers.Authorization,
            'Bearer test-token'
        );

    }
);

test(
    'TmdbProvider omits optional search parameters when absent',
    async () => {

        let requestedUrl =
            '';

        const provider =
            new TmdbProvider({
                fetchImpl:
                    async url => {

                        requestedUrl =
                            String(
                                url
                            );

                        return createJsonResponse({
                            results:
                                []
                        });

                    },
                readAccessToken:
                    'test-token'
            });

        await provider.searchMovies(
            createSearchQuery({
                language:
                    null,
                query:
                    'Heat',
                region:
                    null,
                year:
                    null
            })
        );

        const url =
            new URL(
                requestedUrl
            );

        assert.equal(
            url.searchParams.has(
                'language'
            ),
            false
        );

        assert.equal(
            url.searchParams.has(
                'region'
            ),
            false
        );

        assert.equal(
            url.searchParams.has(
                'year'
            ),
            false
        );

    }
);

test(
    'TmdbProvider maps TMDb movie results to normalized suggestions',
    async () => {

        const provider =
            new TmdbProvider({
                fetchImpl:
                    async () => createJsonResponse({
                        results: [
                            {
                                id:
                                    78,
                                original_language:
                                    'en',
                                original_title:
                                    'Blade Runner',
                                overview:
                                    'Deckard hunts replicants.',
                                poster_path:
                                    '/63N9uy8nd9j7Eog2axPQ8lbr3Wj.jpg',
                                release_date:
                                    '1982-06-25',
                                title:
                                    'Blade Runner'
                            }
                        ]
                    }),
                readAccessToken:
                    'test-token'
            });

        const results =
            await provider.searchMovies(
                createSearchQuery({
                    query:
                        'Blade Runner'
                })
            );

        assert.deepEqual(
            results,
            [
                {
                    confidence:
                        'high',
                    description:
                        'Deckard hunts replicants.',
                    images: [
                        {
                            kind:
                                'cover',
                            source:
                                'tmdb',
                            url:
                                'https://image.tmdb.org/t/p/w500/63N9uy8nd9j7Eog2axPQ8lbr3Wj.jpg'
                        }
                    ],
                    metadata: {
                        originalLanguage:
                            'en',
                        originalTitle:
                            'Blade Runner',
                        releaseDate:
                            '1982-06-25',
                        releaseYear:
                            '1982',
                        tmdbId:
                            78
                    },
                    provider:
                        'tmdb',
                    sourceUrl:
                        'https://www.themoviedb.org/movie/78',
                    title:
                        'Blade Runner'
                }
            ]
        );

    }
);

test(
    'TmdbProvider falls back to original title and omits absent image and metadata',
    async () => {

        const provider =
            new TmdbProvider({
                fetchImpl:
                    async () => createJsonResponse({
                        results: [
                            {
                                id:
                                    'invalid-id',
                                original_title:
                                    'Original Only',
                                overview:
                                    '',
                                poster_path:
                                    null,
                                release_date:
                                    '',
                                title:
                                    ''
                            }
                        ]
                    }),
                readAccessToken:
                    'test-token'
            });

        const results =
            await provider.searchMovies(
                createSearchQuery({
                    query:
                        'Different title'
                })
            );

        assert.deepEqual(
            results,
            [
                {
                    confidence:
                        'medium',
                    description:
                        '',
                    images:
                        [],
                    metadata: {
                        originalTitle:
                            'Original Only'
                    },
                    provider:
                        'tmdb',
                    sourceUrl:
                        null,
                    title:
                        'Original Only'
                }
            ]
        );

    }
);

test(
    'TmdbProvider returns empty results when TMDb has no results',
    async () => {

        const provider =
            new TmdbProvider({
                fetchImpl:
                    async () => createJsonResponse({
                        results:
                            []
                    }),
                readAccessToken:
                    'test-token'
            });

        assert.deepEqual(
            await provider.searchMovies(
                createSearchQuery()
            ),
            []
        );

    }
);

test(
    'TmdbProvider treats malformed payloads as empty results',
    async () => {

        const provider =
            new TmdbProvider({
                fetchImpl:
                    async () => createJsonResponse({}),
                readAccessToken:
                    'test-token'
            });

        assert.deepEqual(
            await provider.searchMovies(
                createSearchQuery()
            ),
            []
        );

    }
);

test(
    'TmdbProvider converts timeout to provider_timeout',
    async () => {

        const provider =
            new TmdbProvider({
                fetchImpl:
                    async () => {

                        throw new DOMException(
                            'The operation was aborted.',
                            'AbortError'
                        );

                    },
                readAccessToken:
                    'test-token'
            });

        await assert.rejects(
            () => provider.searchMovies(
                createSearchQuery()
            ),
            {
                code:
                    'provider_timeout',
                statusCode:
                    504
            }
        );

    }
);

for (
    const status
    of [
        401,
        403,
        429,
        500,
        503
    ]
) {

    test(
        `TmdbProvider converts status ${status} to provider_error`,
        async () => {

            const provider =
                new TmdbProvider({
                    fetchImpl:
                        async () => createJsonResponse(
                            {},
                            {
                                ok:
                                    false,
                                status
                            }
                        ),
                    readAccessToken:
                        'test-token'
                });

            await assert.rejects(
                () => provider.searchMovies(
                    createSearchQuery()
                ),
                {
                    code:
                        'provider_error',
                    statusCode:
                        503
                }
            );

        }
    );

}

test(
    'TmdbProvider converts invalid JSON to provider_error',
    async () => {

        const provider =
            new TmdbProvider({
                fetchImpl:
                    async () => ({
                        ok:
                            true,
                        status:
                            200,
                        async json() {

                            throw new SyntaxError(
                                'Invalid JSON'
                            );

                        }
                    }),
                readAccessToken:
                    'test-token'
            });

        await assert.rejects(
            () => provider.searchMovies(
                createSearchQuery()
            ),
            {
                code:
                    'provider_error',
                statusCode:
                    503
            }
        );

    }
);

function createSearchQuery({
    language = 'fr-FR',
    query = 'Blade Runner',
    region = 'FR',
    year = '1982'
} = {}) {

    return {
        language,
        query,
        region,
        year
    };

}

function createJsonResponse(
    payload,
    {
        ok = true,
        status = 200
    } = {}
) {

    return {
        ok,
        status,
        async json() {

            return payload;

        }
    };

}
