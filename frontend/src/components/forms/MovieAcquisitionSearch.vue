<template>
    <section
        v-if="lookupEnabled"
        class="movie-acquisition"
    >
        <div class="lookup-row">
            <button
                class="lookup-button"
                :disabled="lookupLoading || !canLookup"
                type="button"
                @click="lookup"
            >
                {{ lookupLoading ? 'Recherche...' : 'Rechercher' }}
            </button>
        </div>

        <p
            v-if="lookupMessage"
            class="lookup-message"
            :class="{ error: lookupHasError }"
        >
            {{ lookupMessage }}
        </p>

        <div
            v-if="suggestions.length"
            class="suggestions"
        >
            <article
                v-for="suggestion in suggestions"
                :key="getSuggestionKey(suggestion)"
                class="suggestion"
            >
                <img
                    v-if="getPosterUrl(suggestion)"
                    alt=""
                    class="suggestion-poster"
                    :src="getPosterUrl(suggestion)"
                >

                <div class="suggestion-content">
                    <h3>{{ suggestion.title || 'Suggestion sans titre' }}</h3>

                    <p
                        v-if="getSuggestionSummary(suggestion)"
                        class="suggestion-summary"
                    >
                        {{ getSuggestionSummary(suggestion) }}
                    </p>

                    <p
                        v-if="suggestion.description"
                        class="suggestion-description"
                    >
                        {{ suggestion.description }}
                    </p>

                    <p
                        v-if="suggestion.provider"
                        class="suggestion-source"
                    >
                        Source : {{ suggestion.provider }}
                    </p>
                </div>

                <button
                    class="use-button"
                    type="button"
                    @click="useSuggestion(suggestion)"
                >
                    Utiliser
                </button>
            </article>
        </div>
    </section>
</template>

<script setup>
import {
    computed,
    onMounted,
    ref
} from 'vue';

import {
    ApiError
} from '../../services/api.js';

import {
    getAcquisitionProviders,
    searchMovies
} from '../../services/acquisition-api.js';

const props =
    defineProps({
        query: {
            default:
                '',
            type:
                String
        }
    });

const emit =
    defineEmits([
        'apply-suggestion'
    ]);

const lookupLoading =
    ref(false);

const lookupMessage =
    ref('');

const lookupHasError =
    ref(false);

const suggestions =
    ref([]);

const lookupEnabled =
    ref(true);

const canLookup =
    computed(
        () => lookupEnabled.value &&
            String(props.query ?? '').trim() !== ''
    );

onMounted(
    loadProviderCapabilities
);

async function loadProviderCapabilities() {

    try {

        const response =
            await getAcquisitionProviders();

        lookupEnabled.value =
            Boolean(
                response?.providers?.some(
                    provider => provider.enabled &&
                        provider.plugin === 'movies' &&
                        provider.capabilities?.includes(
                            'movies/search'
                        )
                )
            );

    } catch {

        lookupEnabled.value =
            true;

    }

}

async function lookup() {

    if (
        !canLookup.value
    ) {

        return;

    }

    lookupLoading.value =
        true;

    lookupMessage.value =
        '';

    lookupHasError.value =
        false;

    suggestions.value =
        [];

    try {

        const response =
            await searchMovies({
                query:
                    String(props.query).trim()
            });

        suggestions.value =
            response?.results ?? [];

        if (
            suggestions.value.length === 0
        ) {

            lookupMessage.value =
                'Aucun résultat trouvé. Vous pouvez continuer la saisie manuellement.';

        }

    } catch (error) {

        lookupHasError.value =
            true;

        lookupMessage.value =
            getLookupErrorMessage(
                error
            );

    } finally {

        lookupLoading.value =
            false;

    }

}

function useSuggestion(suggestion) {

    emit(
        'apply-suggestion',
        suggestion
    );

    lookupMessage.value =
        'Suggestion appliquée au formulaire.';

    lookupHasError.value =
        false;

}

function getLookupErrorMessage(error) {

    if (
        error instanceof ApiError
    ) {

        const code =
            error.payload?.code ??
            error.payload?.error;

        if (
            code === 'invalid_search_query'
        ) {

            return 'Recherche invalide. Vérifiez le titre puis réessayez.';

        }

        if (
            code === 'provider_unavailable' ||
            code === 'provider_unconfigured'
        ) {

            return 'Le service de recherche film est indisponible. Vous pouvez continuer la saisie manuellement.';

        }

        if (
            code === 'provider_timeout'
        ) {

            return 'La recherche a expiré. Vous pouvez réessayer ou continuer manuellement.';

        }

    }

    return 'Recherche impossible pour le moment. Vous pouvez continuer la saisie manuellement.';

}

function getSuggestionKey(suggestion) {

    return [
        suggestion.provider,
        suggestion.metadata?.tmdbId,
        suggestion.sourceUrl,
        suggestion.title
    ]
        .filter(Boolean)
        .join('-');

}

function getPosterUrl(suggestion) {

    return suggestion.images?.find(
        image => image.kind === 'cover' && image.url
    )?.url;

}

function getSuggestionSummary(suggestion) {

    return [
        suggestion.metadata?.releaseYear,
        suggestion.metadata?.originalTitle,
        suggestion.metadata?.originalLanguage
    ]
        .filter(Boolean)
        .join(' · ');

}
</script>

<style scoped>
.movie-acquisition {
    display: grid;
    gap: 8px;
    grid-column: 1 / -1;
}

.lookup-row {
    display: flex;
    justify-content: end;
}

.lookup-button,
.use-button {
    border: 1px solid #2357a4;
    border-radius: 6px;
    cursor: pointer;
    font: inherit;
    min-height: 44px;
}

.lookup-button {
    background: #2357a4;
    color: #ffffff;
    padding: 0 14px;
}

.lookup-button:disabled {
    background: #d8dee8;
    border-color: #b8c2d1;
    color: #5f6f89;
    cursor: not-allowed;
}

.lookup-message {
    color: #5f6f89;
    font-size: 0.85rem;
    margin: 0;
}

.lookup-message.error {
    color: #b42318;
}

.suggestions {
    display: grid;
    gap: 8px;
}

.suggestion {
    align-items: start;
    border: 1px solid #d8dee8;
    border-radius: 8px;
    display: grid;
    gap: 10px;
    grid-template-columns: auto minmax(0, 1fr) auto;
    padding: 10px;
}

.suggestion-poster {
    border-radius: 4px;
    height: 90px;
    object-fit: cover;
    width: 60px;
}

.suggestion-content {
    display: grid;
    gap: 4px;
}

.suggestion h3,
.suggestion p {
    margin: 0;
}

.suggestion h3 {
    color: #172033;
    font-size: 0.95rem;
}

.suggestion-summary,
.suggestion-description,
.suggestion-source {
    color: #5f6f89;
    font-size: 0.85rem;
}

.use-button {
    background: #ffffff;
    color: #2357a4;
    padding: 0 12px;
}

@media (max-width: 639px) {
    .lookup-row {
        display: grid;
    }

    .suggestion {
        grid-template-columns: 1fr;
    }

    .lookup-button,
    .use-button {
        width: 100%;
    }
}
</style>
