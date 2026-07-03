import assert from 'node:assert/strict';
import {
    after,
    before,
    test
} from 'node:test';

import { createTestApp } from '../helpers/test-app.js';

const originalFetch =
    globalThis.fetch;

let context;
let token;
let fetchHandler;

before(async () => {

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

    token =
        await context.login();

});

after(async () => {

    globalThis.fetch =
        originalFetch;

    await context.close();

});

test(
    'GET /api/acquisition/providers returns Open Library and Google Books enabled',
    async () => {

        fetchHandler =
            createJsonResponseHandler({});

        const response =
            await context.app.inject({
                headers:
                    authHeaders(),
                method:
                    'GET',
                url:
                    '/api/acquisition/providers'
            });

        assert.equal(
            response.statusCode,
            200
        );

        assert.deepEqual(
            response.json(),
            {
                providers: [
                    {
                        capabilities: [
                            'isbnLookup'
                        ],
                        enabled:
                            true,
                        id:
                            'openlibrary',
                        name:
                            'Open Library',
                        plugin:
                            'books',
                        requiresConfiguration:
                            false
                    },
                    {
                        capabilities: [
                            'isbnLookup'
                        ],
                        enabled:
                            true,
                        id:
                            'googlebooks',
                        name:
                            'Google Books',
                        plugin:
                            'books',
                        requiresConfiguration:
                            false
                    }
                ]
            }
        );

    }
);

test(
    'POST /api/acquisition/books/isbn/lookup falls back to Google Books when Open Library is empty',
    async () => {

        const calls =
            [];

        fetchHandler =
            async url => {

                calls.push(
                    String(
                        url
                    )
                );

                if (
                    String(
                        url
                    ).includes(
                        'openlibrary.org'
                    )
                ) {

                    return createJsonResponse({});

                }

                return createJsonResponse(
                    googleBooksFixture(
                        '9780140328721'
                    )
                );

            };

        const response =
            await lookupIsbn(
                '9780140328721'
            );

        assert.equal(
            response.statusCode,
            200
        );

        assert.equal(
            response.json().results[0].provider,
            'googlebooks'
        );

        assert.equal(
            calls.length,
            2
        );

        assert.match(
            calls[0],
            /openlibrary\.org/
        );

        assert.match(
            calls[1],
            /googleapis\.com\/books\/v1\/volumes/
        );

    }
);

test(
    'POST /api/acquisition/books/isbn/lookup does not call Google Books when Open Library returns a result',
    async () => {

        const calls =
            [];

        fetchHandler =
            async url => {

                calls.push(
                    String(
                        url
                    )
                );

                return createJsonResponse(
                    openLibraryFixture(
                        '9780131103627'
                    )
                );

            };

        const response =
            await lookupIsbn(
                '9780131103627'
            );

        assert.equal(
            response.statusCode,
            200
        );

        assert.equal(
            response.json().results[0].provider,
            'openlibrary'
        );

        assert.equal(
            calls.length,
            1
        );

    }
);

test(
    'POST /api/acquisition/books/isbn/lookup uses explicit Google Books without calling Open Library',
    async () => {

        let requestedUrl =
            '';

        fetchHandler =
            async url => {

                requestedUrl =
                    String(
                        url
                    );

                return createJsonResponse(
                    googleBooksFixture(
                        '9780132350884'
                    )
                );

            };

        const response =
            await lookupIsbn(
                '9780132350884',
                'googlebooks'
            );

        assert.equal(
            response.statusCode,
            200
        );

        assert.equal(
            response.json().results[0].provider,
            'googlebooks'
        );

        assert.match(
            requestedUrl,
            /googleapis\.com\/books\/v1\/volumes/
        );

        assert.doesNotMatch(
            requestedUrl,
            /openlibrary\.org/
        );

    }
);

test(
    'POST /api/acquisition/books/isbn/lookup requires authentication',
    async () => {

        fetchHandler =
            createJsonResponseHandler({});

        const response =
            await context.app.inject({
                method:
                    'POST',
                payload: {
                    isbn:
                        '9780140328721'
                },
                url:
                    '/api/acquisition/books/isbn/lookup'
            });

        assert.equal(
            response.statusCode,
            401
        );

    }
);

test(
    'POST /api/acquisition/books/isbn/lookup rejects invalid ISBN',
    async () => {

        fetchHandler =
            async () => {

                throw new Error(
                    'fetch should not be called'
                );

            };

        const response =
            await lookupIsbn(
                '9780140328722'
            );

        assert.equal(
            response.statusCode,
            400
        );

        assert.equal(
            response.json().code,
            'invalid_isbn'
        );

    }
);

test(
    'POST /api/acquisition/books/isbn/lookup returns empty results when Open Library has no match',
    async () => {

        fetchHandler =
            createJsonResponseHandler({});

        const response =
            await lookupIsbn(
                '9780306406157'
            );

        assert.equal(
            response.statusCode,
            200
        );

        assert.deepEqual(
            response.json(),
            {
                query: {
                    plugin:
                        'books',
                    type:
                        'isbn',
                    value:
                        '9780306406157'
                },
                results: []
            }
        );

    }
);

test(
    'POST /api/acquisition/books/isbn/lookup keeps the public response unchanged on cache hit',
    async () => {

        let calls =
            0;

        fetchHandler =
            async url => {

                calls += 1;

                assert.match(
                    String(url),
                    /bibkeys=ISBN%3A9780590353427/
                );

                return createJsonResponse({
                    'ISBN:9780590353427': {
                        authors: [
                            {
                                name:
                                    'J. K. Rowling'
                            }
                        ],
                        publish_date:
                            'September 1, 1998',
                        publishers: [
                            {
                                name:
                                    'Scholastic'
                            }
                        ],
                        title:
                            'Harry Potter and the Sorcerer\'s Stone'
                    }
                });

            };

        const firstResponse =
            await lookupIsbn(
                '9780590353427'
            );

        fetchHandler =
            async () => {

                throw new Error(
                    'fetch should not be called on cache hit'
                );

            };

        const secondResponse =
            await lookupIsbn(
                '9780590353427'
            );

        assert.equal(
            firstResponse.statusCode,
            200
        );

        assert.equal(
            secondResponse.statusCode,
            200
        );

        assert.equal(
            calls,
            1
        );

        assert.deepEqual(
            secondResponse.json(),
            firstResponse.json()
        );

        assert.equal(
            Object.hasOwn(
                secondResponse.json(),
                'cached'
            ),
            false
        );

    }
);

test(
    'POST /api/acquisition/books/isbn/lookup maps an Open Library fixture',
    async () => {

        fetchHandler =
            async url => {

                assert.match(
                    String(url),
                    /openlibrary\.org\/api\/books/
                );

                assert.match(
                    String(url),
                    /bibkeys=ISBN%3A9780201633610/
                );

                return createJsonResponse({
                    'ISBN:9780201633610': {
                        authors: [
                            {
                                name:
                                    'Roald Dahl'
                            }
                        ],
                        cover: {
                            large:
                                'https://covers.openlibrary.org/b/id/123-L.jpg'
                        },
                        publish_date:
                            'October 1, 1988',
                        publishers: [
                            {
                                name:
                                    'Puffin'
                            }
                        ],
                        title:
                            'Fantastic Mr. Fox',
                        url:
                            'https://openlibrary.org/books/OL7353617M/Fantastic_Mr._Fox'
                    }
                });

            };

        const response =
            await lookupIsbn(
                '978-0-201-63361-0'
            );

        assert.equal(
            response.statusCode,
            200
        );

        assert.deepEqual(
            response.json(),
            {
                query: {
                    plugin:
                        'books',
                    type:
                        'isbn',
                        value:
                            '9780201633610'
                },
                results: [
                    {
                        confidence:
                            'high',
                        description:
                            '',
                        images: [
                            {
                                kind:
                                    'cover',
                                source:
                                    'openlibrary',
                                url:
                                    'https://covers.openlibrary.org/b/id/123-L.jpg'
                            }
                        ],
                        metadata: {
                            author:
                                'Roald Dahl',
                            isbn:
                                '9780201633610',
                            publication_date:
                                '1988-01-01',
                            publisher:
                                'Puffin'
                        },
                        provider:
                            'openlibrary',
                        sourceUrl:
                            'https://openlibrary.org/books/OL7353617M/Fantastic_Mr._Fox',
                        title:
                            'Fantastic Mr. Fox'
                    }
                ]
            }
        );

    }
);

test(
    'POST /api/acquisition/books/isbn/lookup handles provider timeout',
    async () => {

        fetchHandler =
            async () => {

                throw new DOMException(
                    'The operation was aborted.',
                    'AbortError'
                );

            };

        const response =
            await lookupIsbn(
                '9783161484100'
            );

        assert.equal(
            response.statusCode,
            504
        );

        assert.equal(
            response.json().code,
            'provider_timeout'
        );

    }
);

async function lookupIsbn(
    isbn,
    provider = null
) {

    const payload = {
        isbn
    };

    if (
        provider
    ) {

        payload.provider =
            provider;

    }

    return context.app.inject({
        headers:
            authHeaders(),
        method:
            'POST',
        payload,
        url:
            '/api/acquisition/books/isbn/lookup'
    });

}

function openLibraryFixture(isbn) {

    return {
        [`ISBN:${isbn}`]: {
            authors: [
                {
                    name:
                        'Roald Dahl'
                }
            ],
            publish_date:
                'October 1, 1988',
            publishers: [
                {
                    name:
                        'Puffin'
                }
            ],
            title:
                'Fantastic Mr. Fox'
        }
    };

}

function googleBooksFixture(isbn) {

    return {
        items: [
            {
                volumeInfo: {
                    authors: [
                        'Roald Dahl'
                    ],
                    description:
                        '<p>A clever fox outwits three farmers.</p>',
                    imageLinks: {
                        thumbnail:
                            'http://books.google.com/books/content?id=abc&img=1'
                    },
                    industryIdentifiers: [
                        {
                            identifier:
                                isbn,
                            type:
                                'ISBN_13'
                        }
                    ],
                    infoLink:
                        'https://books.google.com/books?id=abc',
                    publishedDate:
                        '1988',
                    publisher:
                        'Puffin',
                    title:
                        'Fantastic Mr. Fox'
                }
            }
        ]
    };

}

function createJsonResponseHandler(payload) {

    return async () => createJsonResponse(
        payload
    );

}

function createJsonResponse(payload) {

    return {
        ok:
            true,
        status:
            200,
        async json() {

            return payload;

        }
    };

}

function authHeaders() {

    return {
        authorization:
            `Bearer ${token}`
    };

}
