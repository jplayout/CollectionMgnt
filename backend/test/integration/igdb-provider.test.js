import assert from 'node:assert/strict';
import {
    test
} from 'node:test';

import { AcquisitionCache } from '../../src/acquisition/acquisition-cache.js';
import { AcquisitionService } from '../../src/acquisition/acquisition-service.js';
import { AcquisitionProviderRegistry } from '../../src/acquisition/provider-registry.js';
import { IgdbProvider } from '../../src/acquisition/providers/igdb-provider.js';

test(
    'IgdbProvider describes the games search capability when configured',
    () => {

        const provider =
            new IgdbProvider({
                clientId:
                    'client-id',
                clientSecret:
                    'client-secret'
            });

        assert.deepEqual(
            provider.describe(),
            {
                capabilities: [
                    'games/search'
                ],
                enabled:
                    true,
                id:
                    'igdb',
                name:
                    'IGDB',
                plugin:
                    'games',
                requiresConfiguration:
                    true,
                type:
                    'metadata'
            }
        );

    }
);

test(
    'IgdbProvider is disabled and rejects searches when configuration is missing',
    async () => {

        const provider =
            new IgdbProvider({
                clientId:
                    '',
                clientSecret:
                    ''
            });

        assert.equal(
            provider.describe().enabled,
            false
        );

        await assert.rejects(
            () => provider.searchGames(
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
    'IgdbProvider retrieves an OAuth token and builds the IGDB search request',
    async () => {

        const calls =
            [];

        const provider =
            new IgdbProvider({
                clientId:
                    'client-id',
                clientSecret:
                    'client-secret',
                fetchImpl:
                    async (
                        url,
                        options
                    ) => {

                        calls.push({
                            body:
                                String(
                                    options.body
                                ),
                            headers:
                                options.headers,
                            method:
                                options.method,
                            url:
                                String(
                                    url
                                )
                        });

                        if (
                            String(
                                url
                            ) ===
                            'https://id.twitch.tv/oauth2/token'
                        ) {

                            return createJsonResponse({
                                access_token:
                                    'access-token',
                                expires_in:
                                    3600
                            });

                        }

                        return createJsonResponse([]);

                    }
            });

        await provider.searchGames(
            createSearchQuery({
                platform:
                    'PlayStation 5',
                query:
                    'Elden Ring',
                year:
                    '2022'
            })
        );

        assert.equal(
            calls.length,
            2
        );

        assert.equal(
            calls[0].url,
            'https://id.twitch.tv/oauth2/token'
        );

        assert.equal(
            calls[0].method,
            'POST'
        );

        assert.equal(
            calls[0].body,
            'client_id=client-id&client_secret=client-secret&grant_type=client_credentials'
        );

        assert.equal(
            calls[1].url,
            'https://api.igdb.com/v4/games'
        );

        assert.equal(
            calls[1].method,
            'POST'
        );

        assert.equal(
            calls[1].headers.Authorization,
            'Bearer access-token'
        );

        assert.equal(
            calls[1].headers['Client-ID'],
            'client-id'
        );

        assert.match(
            calls[1].body,
            /search "Elden Ring";/
        );

        assert.match(
            calls[1].body,
            /fields cover\.image_id,first_release_date,genres\.name,id,/
        );

        assert.match(
            calls[1].body,
            /first_release_date >= 1640995200/
        );

        assert.match(
            calls[1].body,
            /first_release_date < 1672531200/
        );

    }
);

test(
    'IgdbProvider escapes user search text in the APICalypse body',
    async () => {

        let gamesBody =
            '';

        const provider =
            createProviderWithFetch(
                async (
                    url,
                    options
                ) => {

                    if (
                        String(
                            url
                        ) ===
                        'https://id.twitch.tv/oauth2/token'
                    ) {

                        return createJsonResponse({
                            access_token:
                                'access-token',
                            expires_in:
                                3600
                        });

                    }

                    gamesBody =
                        String(
                            options.body
                        );

                    return createJsonResponse([]);

                }
            );

        await provider.searchGames(
            createSearchQuery({
                query:
                    'Legend "Hero" \\ test'
            })
        );

        assert.match(
            gamesBody,
            /search "Legend \\"Hero\\" \\\\ test";/
        );

    }
);

test(
    'IgdbProvider caches OAuth tokens between searches',
    async () => {

        const calls =
            [];

        const provider =
            createProviderWithFetch(
                async (
                    url,
                    options
                ) => {

                    calls.push(
                        String(
                            url
                        )
                    );

                    if (
                        String(
                            url
                        ) ===
                        'https://id.twitch.tv/oauth2/token'
                    ) {

                        return createJsonResponse({
                            access_token:
                                'cached-token',
                            expires_in:
                                3600
                        });

                    }

                    assert.equal(
                        options.headers.Authorization,
                        'Bearer cached-token'
                    );

                    return createJsonResponse([]);

                }
            );

        await provider.searchGames(
            createSearchQuery({
                query:
                    'Halo'
            })
        );

        await provider.searchGames(
            createSearchQuery({
                query:
                    'Halo 2'
            })
        );

        assert.deepEqual(
            calls.filter(
                url => url ===
                    'https://id.twitch.tv/oauth2/token'
            ),
            [
                'https://id.twitch.tv/oauth2/token'
            ]
        );

    }
);

test(
    'IgdbProvider shares one OAuth request across concurrent searches',
    async () => {

        let tokenCalls =
            0;

        const provider =
            createProviderWithFetch(
                async url => {

                    if (
                        String(
                            url
                        ) ===
                        'https://id.twitch.tv/oauth2/token'
                    ) {

                        tokenCalls +=
                            1;

                        await Promise.resolve();

                        return createJsonResponse({
                            access_token:
                                'shared-token',
                            expires_in:
                                3600
                        });

                    }

                    return createJsonResponse([]);

                }
            );

        await Promise.all([
            provider.searchGames(
                createSearchQuery({
                    query:
                        'Halo'
                })
            ),
            provider.searchGames(
                createSearchQuery({
                    query:
                        'Halo 2'
                })
            )
        ]);

        assert.equal(
            tokenCalls,
            1
        );

    }
);

test(
    'IgdbProvider renews OAuth tokens before expiration',
    async () => {

        let now =
            0;

        let tokenCalls =
            0;

        const provider =
            createProviderWithFetch(
                async url => {

                    if (
                        String(
                            url
                        ) ===
                        'https://id.twitch.tv/oauth2/token'
                    ) {

                        tokenCalls +=
                            1;

                        return createJsonResponse({
                            access_token:
                                `token-${tokenCalls}`,
                            expires_in:
                                100
                        });

                    }

                    return createJsonResponse([]);

                },
                {
                    now:
                        () => now,
                    tokenExpirySkewMs:
                        60 * 1000
                }
            );

        await provider.searchGames(
            createSearchQuery()
        );

        now =
            41 * 1000;

        await provider.searchGames(
            createSearchQuery({
                query:
                    'Chrono Trigger'
            })
        );

        assert.equal(
            tokenCalls,
            2
        );

    }
);

test(
    'IgdbProvider does not cache failed OAuth responses',
    async () => {

        let tokenCalls =
            0;

        const provider =
            createProviderWithFetch(
                async url => {

                    if (
                        String(
                            url
                        ) ===
                        'https://id.twitch.tv/oauth2/token'
                    ) {

                        tokenCalls +=
                            1;

                        if (
                            tokenCalls === 1
                        ) {

                            return createJsonResponse(
                                {},
                                {
                                    ok:
                                        false,
                                    status:
                                        401
                                }
                            );

                        }

                        return createJsonResponse({
                            access_token:
                                'valid-token',
                            expires_in:
                                3600
                        });

                    }

                    return createJsonResponse([]);

                }
            );

        await assert.rejects(
            () => provider.searchGames(
                createSearchQuery()
            ),
            {
                code:
                    'provider_error',
                statusCode:
                    503
            }
        );

        await provider.searchGames(
            createSearchQuery()
        );

        assert.equal(
            tokenCalls,
            2
        );

    }
);

test(
    'IgdbProvider refreshes the OAuth token once when IGDB returns 401',
    async () => {

        let tokenCalls =
            0;

        let gamesCalls =
            0;

        const provider =
            createProviderWithFetch(
                async (
                    url,
                    options
                ) => {

                    if (
                        String(
                            url
                        ) ===
                        'https://id.twitch.tv/oauth2/token'
                    ) {

                        tokenCalls +=
                            1;

                        return createJsonResponse({
                            access_token:
                                `token-${tokenCalls}`,
                            expires_in:
                                3600
                        });

                    }

                    gamesCalls +=
                        1;

                    if (
                        gamesCalls === 1
                    ) {

                        assert.equal(
                            options.headers.Authorization,
                            'Bearer token-1'
                        );

                        return createJsonResponse(
                            {},
                            {
                                ok:
                                    false,
                                status:
                                    401
                            }
                        );

                    }

                    assert.equal(
                        options.headers.Authorization,
                        'Bearer token-2'
                    );

                    return createJsonResponse([]);

                }
            );

        await provider.searchGames(
            createSearchQuery()
        );

        assert.equal(
            tokenCalls,
            2
        );

        assert.equal(
            gamesCalls,
            2
        );

    }
);

test(
    'IgdbProvider maps IGDB game results to normalized suggestions',
    async () => {

        const provider =
            createProviderWithIgdbPayload([
                createIgdbGame()
            ]);

        const results =
            await provider.searchGames(
                createSearchQuery({
                    platform:
                        'PlayStation 5',
                    query:
                        'Elden Ring',
                    year:
                        '2022'
                })
            );

        assert.deepEqual(
            results,
            [
                {
                    confidence:
                        'high',
                    description:
                        'Become an Elden Lord.',
                    images: [
                        {
                            kind:
                                'cover',
                            source:
                                'igdb',
                            url:
                                'https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.jpg'
                        }
                    ],
                    metadata: {
                        developer:
                            'FromSoftware',
                        genres: [
                            'Role-playing (RPG)',
                            'Adventure'
                        ],
                        igdbId:
                            119133,
                        platforms: [
                            'PlayStation 5',
                            'Windows PC'
                        ],
                        publisher:
                            'Bandai Namco Entertainment',
                        releaseDate:
                            '2022-02-25'
                    },
                    provider:
                        'igdb',
                    sourceUrl:
                        'https://www.igdb.com/games/elden-ring',
                    title:
                        'Elden Ring'
                }
            ]
        );

    }
);

test(
    'IgdbProvider maps developer and publisher from IGDB roles',
    async () => {

        const provider =
            createProviderWithIgdbPayload([
                {
                    ...createIgdbGame(),
                    involved_companies: [
                        {
                            company: {
                                name:
                                    'Publisher First'
                            },
                            developer:
                                false,
                            publisher:
                                true
                        },
                        {
                            company: {
                                name:
                                    'Developer Second'
                            },
                            developer:
                                true,
                            publisher:
                                false
                        }
                    ]
                }
            ]);

        const results =
            await provider.searchGames(
                createSearchQuery()
            );

        assert.equal(
            results[0].metadata.developer,
            'Developer Second'
        );

        assert.equal(
            results[0].metadata.publisher,
            'Publisher First'
        );

    }
);

test(
    'IgdbProvider returns only cover image URLs without downloading media',
    async () => {

        const provider =
            createProviderWithIgdbPayload([
                createIgdbGame()
            ]);

        const results =
            await provider.searchGames(
                createSearchQuery()
            );

        assert.deepEqual(
            results[0].images,
            [
                {
                    kind:
                        'cover',
                    source:
                        'igdb',
                    url:
                        'https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.jpg'
                }
            ]
        );

    }
);

test(
    'IgdbProvider filters mapped results by platform when provided',
    async () => {

        const provider =
            createProviderWithIgdbPayload([
                createIgdbGame(),
                {
                    ...createIgdbGame({
                        id:
                            2,
                        name:
                            'Elden Ring Mobile'
                    }),
                    platforms: [
                        {
                            name:
                                'Android'
                        }
                    ]
                }
            ]);

        const results =
            await provider.searchGames(
                createSearchQuery({
                    platform:
                        'PlayStation 5'
                })
            );

        assert.deepEqual(
            results.map(
                result => result.title
            ),
            [
                'Elden Ring'
            ]
        );

    }
);

test(
    'IgdbProvider returns empty results when IGDB has no results',
    async () => {

        const provider =
            createProviderWithIgdbPayload([]);

        assert.deepEqual(
            await provider.searchGames(
                createSearchQuery()
            ),
            []
        );

    }
);

test(
    'IgdbProvider treats malformed payloads as empty results',
    async () => {

        const provider =
            createProviderWithIgdbPayload({});

        assert.deepEqual(
            await provider.searchGames(
                createSearchQuery()
            ),
            []
        );

    }
);

test(
    'IgdbProvider converts timeout to provider_timeout',
    async () => {

        const provider =
            createProviderWithFetch(
                async () => {

                    throw new DOMException(
                        'The operation was aborted.',
                        'AbortError'
                    );

                }
            );

        await assert.rejects(
            () => provider.searchGames(
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
        `IgdbProvider converts IGDB status ${status} to provider_error`,
        async () => {

            const provider =
                createProviderWithFetch(
                    async url => {

                        if (
                            String(
                                url
                            ) ===
                            'https://id.twitch.tv/oauth2/token'
                        ) {

                            return createJsonResponse({
                                access_token:
                                    'access-token',
                                expires_in:
                                    3600
                            });

                        }

                        return createJsonResponse(
                            {},
                            {
                                ok:
                                    false,
                                status
                            }
                        );

                    }
                );

            await assert.rejects(
                () => provider.searchGames(
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
    'IgdbProvider converts invalid JSON to provider_error',
    async () => {

        const provider =
            createProviderWithFetch(
                async url => {

                    if (
                        String(
                            url
                        ) ===
                        'https://id.twitch.tv/oauth2/token'
                    ) {

                        return createJsonResponse({
                            access_token:
                                'access-token',
                            expires_in:
                                3600
                        });

                    }

                    return {
                        ok:
                            true,
                        status:
                            200,
                        async json() {

                            throw new SyntaxError(
                                'Invalid JSON'
                            );

                        }
                    };

                }
            );

        await assert.rejects(
            () => provider.searchGames(
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

test(
    'AcquisitionService can use IGDB as an explicit game search provider',
    async () => {

        const service =
            createConfiguredIgdbService({
                fetchImpl:
                    createIgdbFetch([
                        createIgdbGame()
                    ])
            });

        const result =
            await service.searchGames({
                providerId:
                    'igdb',
                query:
                    'Elden Ring'
            });

        assert.equal(
            result.results[0].provider,
            'igdb'
        );

        assert.equal(
            result.results[0].metadata.igdbId,
            119133
        );

    }
);

test(
    'AcquisitionService can use IGDB as the implicit game search provider',
    async () => {

        let gamesCalls =
            0;

        const service =
            createConfiguredIgdbService({
                fetchImpl:
                    createIgdbFetch(
                        [
                            createIgdbGame()
                        ],
                        {
                            onGamesRequest() {

                                gamesCalls +=
                                    1;

                            }
                        }
                    )
            });

        const result =
            await service.searchGames({
                query:
                    'Elden Ring'
            });

        assert.equal(
            result.results[0].provider,
            'igdb'
        );

        assert.equal(
            gamesCalls,
            1
        );

    }
);

test(
    'AcquisitionService rejects explicit IGDB searches when IGDB is not configured',
    async () => {

        const service =
            new AcquisitionService({
                providerRegistry:
                    new AcquisitionProviderRegistry({
                        fetchImpl:
                            async () => {

                                throw new Error(
                                    'Unexpected network call'
                                );

                            },
                        igdbClientId:
                            '',
                        igdbClientSecret:
                            ''
                    })
            });

        await assert.rejects(
            () => service.searchGames({
                providerId:
                    'igdb',
                query:
                    'Elden Ring'
            }),
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
    'AcquisitionService caches IGDB game search responses without another fetch',
    async () => {

        let gamesCalls =
            0;

        let tokenCalls =
            0;

        const {
            cache,
            repository
        } =
            createCache();

        const service =
            createConfiguredIgdbService({
                acquisitionCache:
                    cache,
                fetchImpl:
                    createIgdbFetch(
                        [
                            createIgdbGame()
                        ],
                        {
                            onGamesRequest() {

                                gamesCalls +=
                                    1;

                            },
                            onTokenRequest() {

                                tokenCalls +=
                                    1;

                            }
                        }
                    )
            });

        await service.searchGames({
            language:
                'en-US',
            platform:
                'PlayStation 5',
            query:
                'Elden Ring',
            year:
                '2022'
        });

        await service.searchGames({
            language:
                'en-US',
            platform:
                'PlayStation 5',
            query:
                'Elden Ring',
            year:
                '2022'
        });

        assert.equal(
            gamesCalls,
            1
        );

        assert.equal(
            tokenCalls,
            1
        );

        assert.deepEqual(
            [
                ...repository.rows.keys()
            ],
            [
                'games:games/search:igdb:mapping_v1:language=en-US&platform=PlayStation+5&query=Elden+Ring&year=2022'
            ]
        );

    }
);

function createProviderWithIgdbPayload(payload) {

    return createProviderWithFetch(
        createIgdbFetch(
            payload
        )
    );

}

function createProviderWithFetch(
    fetchImpl,
    options = {}
) {

    return new IgdbProvider({
        clientId:
            'client-id',
        clientSecret:
            'client-secret',
        fetchImpl,
        ...options
    });

}

function createConfiguredIgdbService({
    acquisitionCache = null,
    fetchImpl
}) {

    return new AcquisitionService({
        acquisitionCache,
        providerRegistry:
            new AcquisitionProviderRegistry({
                fetchImpl,
                igdbClientId:
                    'client-id',
                igdbClientSecret:
                    'client-secret',
                tmdbApiReadAccessToken:
                    ''
            })
    });

}

function createIgdbFetch(
    gamesPayload,
    {
        onGamesRequest = () => {},
        onTokenRequest = () => {}
    } = {}
) {

    return async url => {

        if (
            String(
                url
            ) ===
            'https://id.twitch.tv/oauth2/token'
        ) {

            onTokenRequest();

            return createJsonResponse({
                access_token:
                    'access-token',
                expires_in:
                    3600
            });

        }

        onGamesRequest();

        return createJsonResponse(
            gamesPayload
        );

    };

}

function createSearchQuery({
    language = null,
    platform = null,
    query = 'Elden Ring',
    year = null
} = {}) {

    return {
        language,
        platform,
        query,
        year
    };

}

function createIgdbGame({
    id = 119133,
    name = 'Elden Ring'
} = {}) {

    return {
        cover: {
            image_id:
                'co4jni'
        },
        first_release_date:
            1645747200,
        genres: [
            {
                name:
                    'Role-playing (RPG)'
            },
            {
                name:
                    'Adventure'
            }
        ],
        id,
        involved_companies: [
            {
                company: {
                    name:
                        'FromSoftware'
                },
                developer:
                    true,
                publisher:
                    false
            },
            {
                company: {
                    name:
                        'Bandai Namco Entertainment'
                },
                developer:
                    false,
                publisher:
                    true
            }
        ],
        name,
        platforms: [
            {
                name:
                    'PlayStation 5'
            },
            {
                name:
                    'Windows PC'
            }
        ],
        summary:
            'Become an Elden Lord.',
        url:
            'https://www.igdb.com/games/elden-ring'
    };

}

function createCache() {

    const repository =
        new MemoryAcquisitionCacheRepository();

    return {
        cache:
            new AcquisitionCache({
                repository
            }),
        repository
    };

}

class MemoryAcquisitionCacheRepository {

    constructor() {

        this.rows =
            new Map();

    }

    getByKey(cacheKey) {

        return this.rows.get(
            cacheKey
        ) ?? null;

    }

    upsert(row) {

        this.rows.set(
            row.cacheKey,
            {
                capability:
                    row.capability,
                cache_key:
                    row.cacheKey,
                created_at:
                    row.createdAt,
                expires_at:
                    row.expiresAt,
                identifier:
                    row.identifier,
                mapping_version:
                    row.mappingVersion,
                plugin:
                    row.plugin,
                provider_id:
                    row.providerId,
                response_json:
                    row.responseJson,
                status:
                    row.status
            }
        );

    }

    deleteByKey(cacheKey) {

        this.rows.delete(
            cacheKey
        );

    }

    deleteExpired() {}

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
