import assert from 'node:assert/strict';
import {
    test
} from 'node:test';

import { GoogleBooksProvider } from '../../src/acquisition/providers/google-books-provider.js';

test(
    'GoogleBooksProvider builds the lookup URL without an API key',
    async () => {

        const calls =
            [];

        const provider =
            new GoogleBooksProvider({
                apiKey:
                    '',
                fetchImpl:
                    async url => {

                        calls.push(
                            String(
                                url
                            )
                        );

                        return createJsonResponse({
                            items:
                                []
                        });

                    }
            });

        await provider.lookupIsbn(
            '9780140328721'
        );

        const url =
            new URL(
                calls[0]
            );

        assert.equal(
            url.origin + url.pathname,
            'https://www.googleapis.com/books/v1/volumes'
        );

        assert.equal(
            url.searchParams.get(
                'q'
            ),
            'isbn:9780140328721'
        );

        assert.equal(
            url.searchParams.get(
                'printType'
            ),
            'books'
        );

        assert.equal(
            url.searchParams.get(
                'projection'
            ),
            'lite'
        );

        assert.equal(
            url.searchParams.get(
                'maxResults'
            ),
            '5'
        );

        assert.equal(
            url.searchParams.has(
                'key'
            ),
            false
        );

    }
);

test(
    'GoogleBooksProvider includes the optional API key when configured',
    async () => {

        let requestedUrl =
            '';

        const provider =
            new GoogleBooksProvider({
                apiKey:
                    'test-api-key',
                fetchImpl:
                    async url => {

                        requestedUrl =
                            String(
                                url
                            );

                        return createJsonResponse({
                            items:
                                []
                        });

                    }
            });

        await provider.lookupIsbn(
            '9780140328721'
        );

        assert.equal(
            new URL(
                requestedUrl
            ).searchParams.get(
                'key'
            ),
            'test-api-key'
        );

    }
);

test(
    'GoogleBooksProvider maps a Google Books fixture',
    async () => {

        const provider =
            new GoogleBooksProvider({
                fetchImpl:
                    async () => createJsonResponse({
                        items: [
                            {
                                volumeInfo: {
                                    authors: [
                                        'Roald Dahl',
                                        'Quentin Blake'
                                    ],
                                    canonicalVolumeLink:
                                        'https://books.google.com/books/about/Fantastic_Mr_Fox.html',
                                    description:
                                        '<p>A clever fox outwits three farmers.</p>',
                                    imageLinks: {
                                        thumbnail:
                                            'http://books.google.com/books/content?id=abc&printsec=frontcover&img=1'
                                    },
                                    industryIdentifiers: [
                                        {
                                            identifier:
                                                '0-14-032872-6',
                                            type:
                                                'ISBN_10'
                                        },
                                        {
                                            identifier:
                                                '9780140328721',
                                            type:
                                                'ISBN_13'
                                        }
                                    ],
                                    infoLink:
                                        'https://books.google.com/books?id=abc',
                                    publishedDate:
                                        '1988-10',
                                    publisher:
                                        'Puffin',
                                    subtitle:
                                        'A Tale',
                                    title:
                                        'Fantastic Mr. Fox'
                                }
                            }
                        ]
                    })
            });

        const results =
            await provider.lookupIsbn(
                '9780140328721'
            );

        assert.deepEqual(
            results,
            [
                {
                    confidence:
                        'medium',
                    description:
                        'A clever fox outwits three farmers.',
                    images: [
                        {
                            kind:
                                'cover',
                            source:
                                'googlebooks',
                            url:
                                'http://books.google.com/books/content?id=abc&printsec=frontcover&img=1'
                        }
                    ],
                    metadata: {
                        author:
                            'Roald Dahl, Quentin Blake',
                        isbn:
                            '9780140328721',
                        publication_date:
                            '1988-10-01',
                        publisher:
                            'Puffin'
                    },
                    provider:
                        'googlebooks',
                    sourceUrl:
                        'https://books.google.com/books?id=abc',
                    title:
                        'Fantastic Mr. Fox - A Tale'
                }
            ]
        );

    }
);

test(
    'GoogleBooksProvider cleans simple HTML and common entities from descriptions',
    async () => {

        const provider =
            new GoogleBooksProvider({
                fetchImpl:
                    async () => createJsonResponse({
                        items: [
                            {
                                volumeInfo: {
                                    description:
                                        '<p>A <b>clever</b>&nbsp;fox<br>uses &quot;tricks&quot; &amp; charm &#33;</p>',
                                    title:
                                        'Fantastic Mr. Fox'
                                }
                            }
                        ]
                    })
            });

        const results =
            await provider.lookupIsbn(
                '9780140328721'
            );

        assert.equal(
            results[0].description,
            'A clever fox uses "tricks" & charm !'
        );

    }
);

test(
    'GoogleBooksProvider selects ISBN-13 matching the query before other identifiers',
    async () => {

        const provider =
            new GoogleBooksProvider({
                fetchImpl:
                    async () => createJsonResponse({
                        items: [
                            {
                                volumeInfo: {
                                    industryIdentifiers: [
                                        {
                                            identifier:
                                                '0-14-032872-6',
                                            type:
                                                'ISBN_10'
                                        },
                                        {
                                            identifier:
                                                '9789999999999',
                                            type:
                                                'ISBN_13'
                                        },
                                        {
                                            identifier:
                                                '9780140328721',
                                            type:
                                                'ISBN_13'
                                        }
                                    ],
                                    title:
                                        'Fantastic Mr. Fox'
                                }
                            }
                        ]
                    })
            });

        const results =
            await provider.lookupIsbn(
                '9780140328721'
            );

        assert.equal(
            results[0].metadata.isbn,
            '9780140328721'
        );

    }
);

test(
    'GoogleBooksProvider selects ISBN-13 before ISBN-10 when the query is not listed',
    async () => {

        const provider =
            new GoogleBooksProvider({
                fetchImpl:
                    async () => createJsonResponse({
                        items: [
                            {
                                volumeInfo: {
                                    industryIdentifiers: [
                                        {
                                            identifier:
                                                '0-14-032872-6',
                                            type:
                                                'ISBN_10'
                                        },
                                        {
                                            identifier:
                                                '9780140328721',
                                            type:
                                                'ISBN_13'
                                        }
                                    ],
                                    title:
                                        'Fantastic Mr. Fox'
                                }
                            }
                        ]
                    })
            });

        const results =
            await provider.lookupIsbn(
                '9780306406157'
            );

        assert.equal(
            results[0].metadata.isbn,
            '9780140328721'
        );

    }
);

test(
    'GoogleBooksProvider omits metadata ISBN when no supported identifier exists',
    async () => {

        const provider =
            new GoogleBooksProvider({
                fetchImpl:
                    async () => createJsonResponse({
                        items: [
                            {
                                volumeInfo: {
                                    industryIdentifiers: [
                                        {
                                            identifier:
                                                'google-id',
                                            type:
                                                'OTHER'
                                        }
                                    ],
                                    title:
                                        'Untyped Book'
                                }
                            }
                        ]
                    })
            });

        const results =
            await provider.lookupIsbn(
                '9780140328721'
            );

        assert.equal(
            Object.hasOwn(
                results[0].metadata,
                'isbn'
            ),
            false
        );

    }
);

test(
    'GoogleBooksProvider selects ISBN-10 when no ISBN-13 exists',
    async () => {

        const provider =
            new GoogleBooksProvider({
                fetchImpl:
                    async () => createJsonResponse({
                        items: [
                            {
                                volumeInfo: {
                                    industryIdentifiers: [
                                        {
                                            identifier:
                                                '0-14-032872-6',
                                            type:
                                                'ISBN_10'
                                        }
                                    ],
                                    title:
                                        'Fantastic Mr. Fox'
                                }
                            }
                        ]
                    })
            });

        const results =
            await provider.lookupIsbn(
                '9780140328721'
            );

        assert.equal(
            results[0].metadata.isbn,
            '0140328726'
        );

    }
);

test(
    'GoogleBooksProvider returns one cover URL and prefers thumbnail when available',
    async () => {

        const provider =
            new GoogleBooksProvider({
                fetchImpl:
                    async () => createJsonResponse({
                        items: [
                            {
                                volumeInfo: {
                                    imageLinks: {
                                        extraLarge:
                                            'https://example.test/extra-large.jpg',
                                        large:
                                            'https://example.test/large.jpg',
                                        small:
                                            'https://example.test/small.jpg',
                                        thumbnail:
                                            'https://example.test/thumbnail.jpg'
                                    },
                                    title:
                                        'Fantastic Mr. Fox'
                                }
                            }
                        ]
                    })
            });

        const results =
            await provider.lookupIsbn(
                '9780140328721'
            );

        assert.deepEqual(
            results[0].images,
            [
                {
                    kind:
                        'cover',
                    source:
                        'googlebooks',
                    url:
                        'https://example.test/thumbnail.jpg'
                }
            ]
        );

    }
);

test(
    'GoogleBooksProvider returns empty results when there are no items',
    async () => {

        const provider =
            new GoogleBooksProvider({
                fetchImpl:
                    async () => createJsonResponse({
                        totalItems:
                            0
                    })
            });

        assert.deepEqual(
            await provider.lookupIsbn(
                '9780140328721'
            ),
            []
        );

    }
);

test(
    'GoogleBooksProvider converts timeout to provider_timeout',
    async () => {

        const provider =
            new GoogleBooksProvider({
                fetchImpl:
                    async () => {

                        throw new DOMException(
                            'The operation was aborted.',
                            'AbortError'
                        );

                    }
            });

        await assert.rejects(
            () => provider.lookupIsbn(
                '9780140328721'
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

test(
    'GoogleBooksProvider converts network errors to provider_error',
    async () => {

        const provider =
            new GoogleBooksProvider({
                fetchImpl:
                    async () => {

                        throw new TypeError(
                            'fetch failed'
                        );

                    }
            });

        await assert.rejects(
            () => provider.lookupIsbn(
                '9780140328721'
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

for (
    const status
    of [
        403,
        429,
        500
    ]
) {

    test(
        `GoogleBooksProvider converts status ${status} to provider_error`,
        async () => {

            const provider =
                new GoogleBooksProvider({
                    fetchImpl:
                        async () => createJsonResponse(
                            {},
                            {
                                ok:
                                    false,
                                status
                            }
                        )
                });

            await assert.rejects(
                () => provider.lookupIsbn(
                    '9780140328721'
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
    'GoogleBooksProvider converts invalid JSON to provider_error',
    async () => {

        const provider =
            new GoogleBooksProvider({
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
                    })
            });

        await assert.rejects(
            () => provider.lookupIsbn(
                '9780140328721'
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
