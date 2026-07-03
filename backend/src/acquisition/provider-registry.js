import {
    createProviderNotFoundError,
    createProviderUnavailableError
} from './errors.js';

import {
    OpenLibraryProvider
} from './providers/open-library-provider.js';

export class AcquisitionProviderRegistry {

    constructor({
        fetchImpl = globalThis.fetch,
        providers = null,
        timeoutMs
    } = {}) {

        this.providers =
            providers ??
            [
                new OpenLibraryProvider({
                    fetchImpl,
                    timeoutMs
                })
            ];

    }

    listProviders() {

        return this.providers.map(
            provider => provider.describe()
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
