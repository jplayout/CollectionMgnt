import {
    createProviderError,
    createProviderTimeoutError,
    createProviderUnavailableError
} from '../errors.js';

const TMDB_SEARCH_MOVIE_API_URL =
    'https://api.themoviedb.org/3/search/movie';

const TMDB_MOVIE_URL =
    'https://www.themoviedb.org/movie';

const TMDB_IMAGE_BASE_URL =
    'https://image.tmdb.org/t/p/w500';

const PROVIDER_ID =
    'tmdb';

const DEFAULT_TIMEOUT_MS =
    5000;

export class TmdbProvider {

    constructor({
        fetchImpl = globalThis.fetch,
        readAccessToken = process.env.TMDB_API_READ_ACCESS_TOKEN,
        timeoutMs = DEFAULT_TIMEOUT_MS
    } = {}) {

        this.fetchImpl =
            fetchImpl;

        this.readAccessToken =
            readAccessToken;

        this.timeoutMs =
            timeoutMs;

    }

    describe() {

        return {
            capabilities: [
                'movies/search'
            ],
            enabled:
                typeof this.fetchImpl === 'function' &&
                hasToken(
                    this.readAccessToken
                ),
            id:
                PROVIDER_ID,
            name:
                'The Movie Database (TMDb)',
            plugin:
                'movies',
            requiresConfiguration:
                true
        };

    }

    async searchMovies(searchQuery) {

        if (
            !hasToken(
                this.readAccessToken
            )
        ) {

            throw createProviderUnavailableError();

        }

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
                    buildSearchUrl(
                        searchQuery
                    ),
                    {
                        headers: {
                            Authorization:
                                `Bearer ${this.readAccessToken}`
                        },
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

            return mapTmdbResponse(
                searchQuery,
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

function hasToken(value) {

    return typeof value === 'string' &&
        value.trim().length > 0;

}

function buildSearchUrl(searchQuery) {

    const query =
        new URLSearchParams({
            include_adult:
                'false',
            query:
                searchQuery.query
        });

    if (
        searchQuery.language
    ) {

        query.set(
            'language',
            searchQuery.language
        );

    }

    if (
        searchQuery.region
    ) {

        query.set(
            'region',
            searchQuery.region
        );

    }

    if (
        searchQuery.year
    ) {

        query.set(
            'year',
            searchQuery.year
        );

    }

    return `${TMDB_SEARCH_MOVIE_API_URL}?${query.toString()}`;

}

function mapTmdbResponse(
    searchQuery,
    payload
) {

    if (
        !Array.isArray(
            payload?.results
        )
    ) {

        return [];

    }

    return payload.results
        .map(
            movie => mapMovie(
                searchQuery,
                movie
            )
        )
        .filter(
            result => result.title
        );

}

function mapMovie(
    searchQuery,
    movie
) {

    const title =
        normalizeText(
            movie?.title
        ) ??
        normalizeText(
            movie?.original_title
        );

    return {
        confidence:
            getConfidence(
                searchQuery.query,
                title
            ),
        description:
            normalizeText(
                movie?.overview
            ) ?? '',
        images:
            getImages(
                movie
            ),
        metadata:
            getMetadata(
                movie
            ),
        provider:
            PROVIDER_ID,
        sourceUrl:
            getSourceUrl(
                movie
            ),
        title
    };

}

function getConfidence(
    query,
    title
) {

    return normalizeForComparison(
        query
    ) ===
        normalizeForComparison(
            title
        )
        ? 'high'
        : 'medium';

}

function getImages(movie) {

    const posterPath =
        normalizeText(
            movie?.poster_path
        );

    if (
        !posterPath
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
                `${TMDB_IMAGE_BASE_URL}${posterPath}`
        }
    ];

}

function getMetadata(movie) {

    const metadata = {};

    setIfPresent(
        metadata,
        'tmdbId',
        Number.isInteger(
            movie?.id
        )
            ? movie.id
            : null
    );

    setIfPresent(
        metadata,
        'originalTitle',
        normalizeText(
            movie?.original_title
        )
    );

    const releaseDate =
        normalizeText(
            movie?.release_date
        );

    setIfPresent(
        metadata,
        'releaseDate',
        releaseDate
    );

    setIfPresent(
        metadata,
        'releaseYear',
        getReleaseYear(
            releaseDate
        )
    );

    setIfPresent(
        metadata,
        'originalLanguage',
        normalizeText(
            movie?.original_language
        )
    );

    return metadata;

}

function getSourceUrl(movie) {

    if (
        !Number.isInteger(
            movie?.id
        )
    ) {

        return null;

    }

    return `${TMDB_MOVIE_URL}/${movie.id}`;

}

function getReleaseYear(releaseDate) {

    if (
        typeof releaseDate !== 'string'
    ) {

        return null;

    }

    const match =
        releaseDate.match(
            /^\d{4}/
        );

    return match?.[0] ??
        null;

}

function setIfPresent(
    target,
    key,
    value
) {

    if (
        value === null ||
        value === undefined ||
        value === ''
    ) {

        return;

    }

    target[key] =
        value;

}

function normalizeText(value) {

    if (
        typeof value !== 'string'
    ) {

        return null;

    }

    const normalized =
        value.trim();

    return normalized ||
        null;

}

function normalizeForComparison(value) {

    return normalizeText(
        value
    )
        ?.toLocaleLowerCase('en-US')
        .normalize('NFKD')
        .replace(
            /[\u0300-\u036f]/g,
            ''
        ) ?? '';

}
