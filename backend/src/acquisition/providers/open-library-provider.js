import {
    createProviderError,
    createProviderTimeoutError
} from '../errors.js';

const OPEN_LIBRARY_BOOKS_API_URL =
    'https://openlibrary.org/api/books';

const PROVIDER_ID =
    'openlibrary';

const DEFAULT_TIMEOUT_MS =
    5000;

export class OpenLibraryProvider {

    constructor({
        fetchImpl = globalThis.fetch,
        timeoutMs = DEFAULT_TIMEOUT_MS
    } = {}) {

        this.fetchImpl =
            fetchImpl;

        this.timeoutMs =
            timeoutMs;

    }

    describe() {

        return {
            capabilities: [
                'isbnLookup'
            ],
            enabled:
                typeof this.fetchImpl === 'function',
            id:
                PROVIDER_ID,
            name:
                'Open Library',
            plugin:
                'books',
            requiresConfiguration:
                false
        };

    }

    async lookupIsbn(isbn) {

        const controller =
            new AbortController();

        const timeout =
            setTimeout(
                () => controller.abort(),
                this.timeoutMs
            );

        try {

            const response =
                await this.fetchImpl(
                    buildLookupUrl(
                        isbn
                    ),
                    {
                        signal:
                            controller.signal
                    }
                );

            if (
                !response.ok
            ) {

                if (
                    response.status === 404
                ) {

                    return [];

                }

                throw createProviderError();

            }

            const payload =
                await response.json();

            return mapOpenLibraryResponse(
                isbn,
                payload
            );

        } catch (error) {

            if (
                error?.name === 'AbortError'
            ) {

                throw createProviderTimeoutError();

            }

            if (
                error?.code &&
                error?.statusCode
            ) {

                throw error;

            }

            throw createProviderError();

        } finally {

            clearTimeout(
                timeout
            );

        }

    }

}

function buildLookupUrl(isbn) {

    const query =
        new URLSearchParams({
            bibkeys:
                `ISBN:${isbn}`,
            format:
                'json',
            jscmd:
                'data'
        });

    return `${OPEN_LIBRARY_BOOKS_API_URL}?${query.toString()}`;

}

function mapOpenLibraryResponse(
    isbn,
    payload
) {

    const book =
        payload?.[
            `ISBN:${isbn}`
        ];

    if (
        !book
    ) {

        return [];

    }

    return [
        {
            confidence:
                'high',
            description:
                getDescription(
                    book
                ),
            images:
                getImages(
                    book
                ),
            metadata:
                getMetadata(
                    isbn,
                    book
                ),
            provider:
                PROVIDER_ID,
            sourceUrl:
                getSourceUrl(
                    book
                ),
            title:
                getTitle(
                    book
                )
        }
    ];

}

function getTitle(book) {

    return [
        book.title,
        book.subtitle
    ]
        .filter(Boolean)
        .join(' - ');

}

function getDescription(book) {

    if (
        typeof book.description === 'string'
    ) {

        return book.description;

    }

    if (
        typeof book.description?.value === 'string'
    ) {

        return book.description.value;

    }

    return '';

}

function getMetadata(
    isbn,
    book
) {

    const metadata = {
        isbn
    };

    const author =
        getNames(
            book.authors
        ).join(', ');

    if (
        author
    ) {

        metadata.author =
            author;

    }

    const publisher =
        getNames(
            book.publishers
        )[0];

    if (
        publisher
    ) {

        metadata.publisher =
            publisher;

    }

    const publicationDate =
        normalizePublicationDate(
            book.publish_date
        );

    if (
        publicationDate
    ) {

        metadata.publication_date =
            publicationDate;

    }

    return metadata;

}

function getNames(values) {

    if (
        !Array.isArray(values)
    ) {

        return [];

    }

    return values
        .map(
            value => typeof value === 'string'
                ? value
                : value?.name
        )
        .filter(Boolean);

}

function normalizePublicationDate(value) {

    if (
        typeof value !== 'string'
    ) {

        return '';

    }

    const isoDateMatch =
        value.match(
            /\d{4}-\d{2}-\d{2}/
        );

    if (
        isoDateMatch
    ) {

        return isoDateMatch[0];

    }

    const yearMatch =
        value.match(
            /\d{4}/
        );

    return yearMatch
        ? `${yearMatch[0]}-01-01`
        : '';

}

function getImages(book) {

    const coverUrl =
        book.cover?.large ??
        book.cover?.medium ??
        book.cover?.small ??
        book.thumbnail_url;

    if (
        !coverUrl
    ) {

        return [];

    }

    return [
        {
            kind:
                'cover',
            source:
                PROVIDER_ID,
            url:
                coverUrl
        }
    ];

}

function getSourceUrl(book) {

    return book.url ??
        book.info_url ??
        '';

}

