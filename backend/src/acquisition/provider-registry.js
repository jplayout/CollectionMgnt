import {
    createProviderNotFoundError,
    createProviderUnavailableError
} from './errors.js';

import {
    OpenLibraryProvider
} from './providers/open-library-provider.js';

import {
    GoogleBooksProvider
} from './providers/google-books-provider.js';

import {
    TmdbProvider
} from './providers/tmdb-provider.js';

import {
    IgdbProvider
} from './providers/igdb-provider.js';

export class AcquisitionProviderRegistry {

    constructor({
        fetchImpl = globalThis.fetch,
        googleBooksApiKey = process.env.GOOGLE_BOOKS_API_KEY,
        igdbClientId = process.env.IGDB_CLIENT_ID,
        igdbClientSecret = process.env.IGDB_CLIENT_SECRET,
        providers = null,
        tmdbApiReadAccessToken = process.env.TMDB_API_READ_ACCESS_TOKEN,
        timeoutMs
    } = {}) {

        this.providers =
            providers ??
            [
                new OpenLibraryProvider({
                    fetchImpl,
                    timeoutMs
                }),
                new GoogleBooksProvider({
                    apiKey:
                        googleBooksApiKey,
                    fetchImpl,
                    timeoutMs
                })
            ];

        if (
            !providers
        ) {

            this.providers.push(
                new TmdbProvider({
                    fetchImpl,
                    readAccessToken:
                        tmdbApiReadAccessToken,
                    timeoutMs
                }),
                new IgdbProvider({
                    clientId:
                        igdbClientId,
                    clientSecret:
                        igdbClientSecret,
                    fetchImpl,
                    timeoutMs
                })
            );

        }

    }

    listProviders() {

        return this.providers
            .map(
                provider => provider.describe()
            )
            .filter(
                description => description.enabled
            );

    }

    getProvider(id) {

        const provider =
            this.providers.find(
                candidate => candidate.describe().id === id
            );

        if (
            !provider
        ) {

            throw createProviderNotFoundError();

        }

        if (
            !provider.describe().enabled
        ) {

            throw createProviderUnavailableError();

        }

        return provider;

    }

    getDefaultProviderFor({
        capability,
        plugin
    }) {

        const provider =
            this.getProvidersFor({
                capability,
                plugin
            })[0];

        if (
            !provider
        ) {

            throw createProviderUnavailableError();

        }

        return provider;

    }

    getProvidersFor({
        capability,
        plugin
    }) {

        return this.providers.filter(
            candidate => {

                const description =
                    candidate.describe();

                return description.enabled &&
                    description.plugin === plugin &&
                    description.capabilities.includes(
                        capability
                    );

            }
        );

    }

}
