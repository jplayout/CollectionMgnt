import {
    createProviderError,
    createProviderTimeoutError
} from '../errors.js';

const GOOGLE_BOOKS_VOLUMES_API_URL =
    'https://www.googleapis.com/books/v1/volumes';

const PROVIDER_ID =
    'googlebooks';

const DEFAULT_TIMEOUT_MS =
    5000;

const MAX_RESULTS =
    '5';

const HTML_ENTITIES = {
    amp:
        '&',
    apos:
        "'",
    gt:
        '>',
    lt:
        '<',
    nbsp:
        ' ',
    quot:
        '"'
};

export class GoogleBooksProvider {

    constructor({
        apiKey = process.env.GOOGLE_BOOKS_API_KEY,
        fetchImpl = globalThis.fetch,
        timeoutMs = DEFAULT_TIMEOUT_MS
    } = {}) {

        this.apiKey =
            apiKey;

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
                'Google Books',
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
                    buildLookupUrl({
                        apiKey:
                            this.apiKey,
                        isbn
                    }),
                    {
                        signal:
                            controller.signal
                    }
                );

            if (
                !response.ok
            ) {

                throw createProviderError();

            }

            const payload =
                await response.json();

            return mapGoogleBooksResponse(
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

function buildLookupUrl({
    apiKey,
    isbn
}) {

    const query =
        new URLSearchParams({
            maxResults:
                MAX_RESULTS,
            printType:
                'books',
            projection:
                'lite',
            q:
                `isbn:${isbn}`
        });

    if (
        apiKey
    ) {

        query.set(
            'key',
            apiKey
        );

    }

    return `${GOOGLE_BOOKS_VOLUMES_API_URL}?${query.toString()}`;

}

function mapGoogleBooksResponse(
    isbn,
    payload
) {

    if (
        !Array.isArray(
            payload?.items
        )
    ) {

        return [];

    }

    return payload.items
        .map(
            item => mapVolume(
                isbn,
                item
            )
        )
        .filter(
            result => result.title
        );

}

function mapVolume(
    isbn,
    item
) {

    const volumeInfo =
        item?.volumeInfo ?? {};

    return {
        confidence:
            'medium',
        description:
            normalizeDescription(
                volumeInfo.description
            ),
        images:
            getImages(
                volumeInfo
            ),
        metadata:
            getMetadata(
                isbn,
                volumeInfo
            ),
        provider:
            PROVIDER_ID,
        sourceUrl:
            getSourceUrl(
                volumeInfo
            ),
        title:
            getTitle(
                volumeInfo
            )
    };

}

function getTitle(volumeInfo) {

    return [
        volumeInfo.title,
        volumeInfo.subtitle
    ]
        .filter(Boolean)
        .join(' - ');

}

function normalizeDescription(value) {

    if (
        typeof value !== 'string'
    ) {

        return '';

    }

    return value
        .replace(
            /<br\s*\/?>/gi,
            ' '
        )
        .replace(
            /<[^>]*>/g,
            ' '
        )
        .replace(
            /&(#\d+|#x[\da-f]+|[a-z]+);/gi,
            decodeHtmlEntity
        )
        .replace(
            /\s+/g,
            ' '
        )
        .trim();

}

function getMetadata(
    isbn,
    volumeInfo
) {

    const metadata = {};

    const selectedIsbn =
        getIsbn(
            isbn,
            volumeInfo.industryIdentifiers
        );

    if (
        selectedIsbn
    ) {

        metadata.isbn =
            selectedIsbn;

    }

    if (
        Array.isArray(
            volumeInfo.authors
        ) &&
        volumeInfo.authors.length > 0
    ) {

        metadata.author =
            volumeInfo.authors
                .filter(
                    author => typeof author === 'string' &&
                        author.trim()
                )
                .join(', ');

    }

    if (
        typeof volumeInfo.publisher === 'string' &&
        volumeInfo.publisher.trim()
    ) {

        metadata.publisher =
            volumeInfo.publisher.trim();

    }

    const publicationDate =
        normalizePublicationDate(
            volumeInfo.publishedDate
        );

    if (
        publicationDate
    ) {

        metadata.publication_date =
            publicationDate;

    }

    return metadata;

}

function getIsbn(
    requestedIsbn,
    industryIdentifiers
) {

    if (
        !Array.isArray(
            industryIdentifiers
        )
    ) {

        return '';

    }

    const normalizedRequestedIsbn =
        normalizeIdentifier(
            requestedIsbn
        );

    const identifiers =
        industryIdentifiers
            .filter(
                identifier => [
                    'ISBN_13',
                    'ISBN_10'
                ].includes(
                    identifier?.type
                ) &&
                    typeof identifier.identifier === 'string'
            )
            .map(
                identifier => ({
                    type:
                        identifier.type,
                    value:
                        normalizeIdentifier(
                            identifier.identifier
                        )
                })
            );

    return identifiers.find(
        identifier => identifier.type === 'ISBN_13' &&
            identifier.value === normalizedRequestedIsbn
    )?.value ??
        identifiers.find(
            identifier => identifier.type === 'ISBN_13'
        )?.value ??
        identifiers.find(
            identifier => identifier.type === 'ISBN_10'
        )?.value ??
        '';

}

function normalizePublicationDate(value) {

    if (
        typeof value !== 'string'
    ) {

        return '';

    }

    if (
        /^\d{4}-\d{2}-\d{2}$/.test(
            value
        )
    ) {

        return value;

    }

    if (
        /^\d{4}-\d{2}$/.test(
            value
        )
    ) {

        return `${value}-01`;

    }

    const yearMatch =
        value.match(
            /^\d{4}/
        );

    return yearMatch
        ? `${yearMatch[0]}-01-01`
        : '';

}

function getImages(volumeInfo) {

    const imageLinks =
        volumeInfo.imageLinks ?? {};

    const coverUrl =
        imageLinks.thumbnail ??
        imageLinks.small ??
        imageLinks.medium ??
        imageLinks.large ??
        imageLinks.extraLarge ??
        imageLinks.smallThumbnail;

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

function getSourceUrl(volumeInfo) {

    return volumeInfo.infoLink ??
        volumeInfo.canonicalVolumeLink ??
        '';

}

function decodeHtmlEntity(
    entity,
    value
) {

    const namedEntity =
        HTML_ENTITIES[
            value.toLowerCase()
        ];

    if (
        namedEntity
    ) {

        return namedEntity;

    }

    if (
        value.startsWith(
            '#x'
        )
    ) {

        return decodeCodePoint(
            Number.parseInt(
                value.slice(
                    2
                ),
                16
            ),
            entity
        );

    }

    if (
        value.startsWith(
            '#'
        )
    ) {

        return decodeCodePoint(
            Number.parseInt(
                value.slice(
                    1
                ),
                10
            ),
            entity
        );

    }

    return entity;

}

function decodeCodePoint(
    codePoint,
    fallback
) {

    if (
        !Number.isSafeInteger(
            codePoint
        )
    ) {

        return fallback;

    }

    try {

        return String.fromCodePoint(
            codePoint
        );

    } catch {

        return fallback;

    }

}

function normalizeIdentifier(value) {

    return value
        .replace(
            /[\s-]/g,
            ''
        )
        .toUpperCase();

}
