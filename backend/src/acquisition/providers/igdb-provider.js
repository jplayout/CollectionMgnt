import {
    createProviderError,
    createProviderTimeoutError,
    createProviderUnavailableError
} from '../errors.js';

const IGDB_TOKEN_URL =
    'https://id.twitch.tv/oauth2/token';

const IGDB_GAMES_API_URL =
    'https://api.igdb.com/v4/games';

const IGDB_IMAGE_BASE_URL =
    'https://images.igdb.com/igdb/image/upload/t_cover_big';

const PROVIDER_ID =
    'igdb';

const DEFAULT_TIMEOUT_MS =
    5000;

const DEFAULT_TOKEN_EXPIRY_SKEW_MS =
    60 * 1000;

const DEFAULT_LIMIT =
    10;

export class IgdbProvider {

    constructor({
        clientId = process.env.IGDB_CLIENT_ID,
        clientSecret = process.env.IGDB_CLIENT_SECRET,
        fetchImpl = globalThis.fetch,
        now = () => Date.now(),
        timeoutMs = DEFAULT_TIMEOUT_MS,
        tokenExpirySkewMs = DEFAULT_TOKEN_EXPIRY_SKEW_MS
    } = {}) {

        this.clientId =
            clientId;

        this.clientSecret =
            clientSecret;

        this.fetchImpl =
            fetchImpl;

        this.now =
            now;

        this.timeoutMs =
            timeoutMs;

        this.tokenExpirySkewMs =
            tokenExpirySkewMs;

        this.accessToken =
            null;

        this.accessTokenExpiresAtMs =
            0;

        this.accessTokenRequest =
            null;

    }

    describe() {

        return {
            capabilities: [
                'games/search'
            ],
            enabled:
                typeof this.fetchImpl === 'function' &&
                hasValue(
                    this.clientId
                ) &&
                hasValue(
                    this.clientSecret
                ),
            id:
                PROVIDER_ID,
            name:
                'IGDB',
            plugin:
                'games',
            requiresConfiguration:
                true,
            type:
                'metadata'
        };

    }

    async searchGames(searchQuery) {

        if (
            !this.describe().enabled
        ) {

            throw createProviderUnavailableError();

        }

        try {

            let response =
                await this.fetchGames(
                    searchQuery
                );

            if (
                response.status === 401
            ) {

                this.clearAccessToken();

                response =
                    await this.fetchGames(
                        searchQuery,
                        {
                            forceTokenRefresh:
                                true
                        }
                    );

            }

            if (
                !response.ok
            ) {

                throw createProviderError();

            }

            const payload =
                await response.json();

            return mapIgdbResponse(
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

        }

    }

    async getAccessToken() {

        if (
            this.accessToken &&
            this.now() + this.tokenExpirySkewMs <
                this.accessTokenExpiresAtMs
        ) {

            return this.accessToken;

        }

        if (
            this.accessTokenRequest
        ) {

            return this.accessTokenRequest;

        }

        this.accessTokenRequest =
            this.requestAccessToken();

        try {

            return await this.accessTokenRequest;

        } finally {

            this.accessTokenRequest =
                null;

        }

    }

    async requestAccessToken() {

        const body =
            new URLSearchParams({
                client_id:
                    this.clientId,
                client_secret:
                    this.clientSecret,
                grant_type:
                    'client_credentials'
            });

        const response =
            await this.fetchWithTimeout(
                IGDB_TOKEN_URL,
                {
                    body,
                    headers: {
                        Accept:
                            'application/json',
                        'Content-Type':
                            'application/x-www-form-urlencoded'
                    },
                    method:
                        'POST'
                }
            );

        if (
            !response.ok
        ) {

            throw createProviderError();

        }

        const payload =
            await response.json();

        const accessToken =
            normalizeText(
                payload?.access_token
            );

        const expiresInSeconds =
            Number(
                payload?.expires_in
            );

        if (
            !accessToken ||
            !Number.isFinite(
                expiresInSeconds
            ) ||
            expiresInSeconds <= 0
        ) {

            throw createProviderError();

        }

        this.accessToken =
            accessToken;

        this.accessTokenExpiresAtMs =
            this.now() +
            expiresInSeconds * 1000;

        return this.accessToken;

    }

    clearAccessToken() {

        this.accessToken =
            null;

        this.accessTokenExpiresAtMs =
            0;

        this.accessTokenRequest =
            null;

    }

    async fetchGames(
        searchQuery,
        {
            forceTokenRefresh = false
        } = {}
    ) {

        if (
            forceTokenRefresh
        ) {

            this.clearAccessToken();

        }

        const accessToken =
            await this.getAccessToken();

        return this.fetchWithTimeout(
            IGDB_GAMES_API_URL,
            {
                body:
                    buildSearchBody(
                        searchQuery
                    ),
                headers: {
                    Accept:
                        'application/json',
                    Authorization:
                        `Bearer ${accessToken}`,
                    'Client-ID':
                        this.clientId,
                    'Content-Type':
                        'text/plain'
                },
                method:
                    'POST'
            }
        );

    }

    async fetchWithTimeout(
        url,
        options
    ) {

        const controller =
            new AbortController();

        const timeout =
            setTimeout(
                () => controller.abort(),
                this.timeoutMs
            );

        try {

            return await this.fetchImpl(
                url,
                {
                    ...options,
                    signal:
                        controller.signal
                }
            );

        } finally {

            clearTimeout(
                timeout
            );

        }

    }

}

function buildSearchBody(searchQuery) {

    const fields = [
        'cover.image_id',
        'first_release_date',
        'genres.name',
        'id',
        'involved_companies.company.name',
        'involved_companies.developer',
        'involved_companies.publisher',
        'name',
        'platforms.name',
        'summary',
        'url'
    ].join(
        ','
    );

    const clauses = [
        'version_parent = null'
    ];

    const year =
        getSearchYear(
            searchQuery.year
        );

    if (
        year
    ) {

        clauses.push(
            `first_release_date >= ${getUtcUnixTimestamp(
                year,
                0,
                1
            )}`
        );

        clauses.push(
            `first_release_date < ${getUtcUnixTimestamp(
                year + 1,
                0,
                1
            )}`
        );

    }

    return [
        `search "${escapeSearchText(
            searchQuery.query
        )}";`,
        `fields ${fields};`,
        `where ${clauses.join(
            ' & '
        )};`,
        `limit ${DEFAULT_LIMIT};`
    ].join(
        '\n'
    );

}

function mapIgdbResponse(
    searchQuery,
    payload
) {

    if (
        !Array.isArray(
            payload
        )
    ) {

        return [];

    }

    return payload
        .map(
            game => mapGame(
                searchQuery,
                game
            )
        )
        .filter(
            result => result.title
        )
        .filter(
            result => matchesPlatform(
                searchQuery.platform,
                result.metadata.platforms
            )
        );

}

function mapGame(
    searchQuery,
    game
) {

    const title =
        normalizeText(
            game?.name
        );

    const releaseDate =
        getReleaseDate(
            game?.first_release_date
        );

    return {
        confidence:
            getConfidence(
                searchQuery.query,
                title
            ),
        description:
            normalizeText(
                game?.summary
            ) ?? '',
        images:
            getImages(
                game
            ),
        metadata:
            getMetadata(
                game,
                releaseDate
            ),
        provider:
            PROVIDER_ID,
        sourceUrl:
            normalizeText(
                game?.url
            ),
        title
    };

}

function getMetadata(
    game,
    releaseDate
) {

    const metadata = {};

    setIfPresent(
        metadata,
        'igdbId',
        Number.isInteger(
            game?.id
        )
            ? game.id
            : null
    );

    setIfPresent(
        metadata,
        'releaseDate',
        releaseDate
    );

    setIfPresent(
        metadata,
        'platforms',
        getNames(
            game?.platforms
        )
    );

    setIfPresent(
        metadata,
        'genres',
        getNames(
            game?.genres
        )
    );

    setIfPresent(
        metadata,
        'developer',
        getCompanyName(
            game?.involved_companies,
            'developer'
        )
    );

    setIfPresent(
        metadata,
        'publisher',
        getCompanyName(
            game?.involved_companies,
            'publisher'
        )
    );

    return metadata;

}

function getImages(game) {

    const imageId =
        normalizeText(
            game?.cover?.image_id
        );

    if (
        !imageId
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
                `${IGDB_IMAGE_BASE_URL}/${imageId}.jpg`
        }
    ];

}

function getCompanyName(
    involvedCompanies,
    role
) {

    if (
        !Array.isArray(
            involvedCompanies
        )
    ) {

        return null;

    }

    const company =
        involvedCompanies.find(
            item => item?.[role] === true &&
                normalizeText(
                    item?.company?.name
                )
        );

    return normalizeText(
        company?.company?.name
    );

}

function getNames(values) {

    if (
        !Array.isArray(
            values
        )
    ) {

        return null;

    }

    const names =
        values
            .map(
                value => normalizeText(
                    value?.name
                )
            )
            .filter(Boolean);

    return names.length > 0
        ? names
        : null;

}

function getReleaseDate(value) {

    if (
        !Number.isInteger(
            value
        )
    ) {

        return null;

    }

    return new Date(
        value * 1000
    )
        .toISOString()
        .slice(
            0,
            10
        );

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

function matchesPlatform(
    platform,
    platforms
) {

    const normalizedPlatform =
        normalizeForComparison(
            platform
        );

    if (
        !normalizedPlatform
    ) {

        return true;

    }

    if (
        !Array.isArray(
            platforms
        )
    ) {

        return false;

    }

    return platforms.some(
        candidate => normalizeForComparison(
            candidate
        ) === normalizedPlatform
    );

}

function getSearchYear(value) {

    const yearText =
        normalizeText(
            value
        );

    if (
        !yearText ||
        !/^\d{4}$/.test(
            yearText
        )
    ) {

        return null;

    }

    return Number(
        yearText
    );

}

function getUtcUnixTimestamp(
    year,
    month,
    day
) {

    return Math.floor(
        Date.UTC(
            year,
            month,
            day
        ) / 1000
    );

}

function escapeSearchText(value) {

    return String(
        value
    ).replace(
        /["\\]/g,
        match => `\\${match}`
    );

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

    if (
        Array.isArray(
            value
        ) &&
        value.length === 0
    ) {

        return;

    }

    target[key] =
        value;

}

function hasValue(value) {

    return typeof value === 'string' &&
        value.trim().length > 0;

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
