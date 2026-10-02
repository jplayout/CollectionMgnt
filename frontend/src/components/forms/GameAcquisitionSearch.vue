<template>
    <section
        v-if="lookupEnabled"
        class="game-acquisition"
    >
        <div class="lookup-row">
            <label for="game-acquisition-platform">
                Plateforme recherchée
                <input
                    id="game-acquisition-platform"
                    v-model="platformInput"
                    type="text"
                >
            </label>

            <label for="game-acquisition-year">
                Année
                <input
                    id="game-acquisition-year"
                    v-model="yearInput"
                    inputmode="numeric"
                    type="text"
                >
            </label>

            <button
                class="lookup-button"
                :disabled="disabled || lookupLoading || !canLookup"
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
                :key="suggestion.mediaKey"
                class="suggestion"
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

                    <dl class="suggestion-metadata">
                        <template v-if="suggestion.metadata?.developer">
                            <dt>Développeur</dt>
                            <dd>{{ suggestion.metadata.developer }}</dd>
                        </template>

                        <template v-if="suggestion.metadata?.publisher">
                            <dt>Éditeur</dt>
                            <dd>{{ suggestion.metadata.publisher }}</dd>
                        </template>
                    </dl>

                    <p
                        v-if="suggestion.provider"
                        class="suggestion-source"
                    >
                        Source : {{ getSourceLabel(suggestion) }}
                    </p>
                </div>

                <button
                    class="use-button"
                    :disabled="disabled"
                    type="button"
                    @click="useSuggestion(suggestion)"
                >
                    Utiliser
                </button>
                <AcquisitionMediaPicker
                    :candidates="suggestion.mediaCandidates"
                    :search-query="suggestion.mediaSearchQuery"
                    :model-value="mediaSelections[suggestion.mediaKey]"
                    :disabled="disabled"
                    @update:model-value="selectMedia(suggestion, $event)"
                />
            </article>
        </div>
    </section>
</template>

<script setup>
import AcquisitionMediaPicker from '../acquisition/AcquisitionMediaPicker.vue';
import { normalizeAcquisitionMediaCandidates, buildAcquisitionMediaQuery } from '../../services/acquisition-media.js';
import {
    computed,
    onMounted,
    ref,
    watch
} from 'vue';

import {
    ApiError
} from '../../services/api.js';

import {
    getAcquisitionProviders,
    searchGames
} from '../../services/acquisition-api.js';

const props =
    defineProps({
        disabled: { type: Boolean, default: false },
        platform: {
            default:
                '',
            type: [
                String,
                Number
            ]
        },
        query: {
            default:
                '',
            type:
                String
        },
        year: {
            default:
                '',
            type: [
                String,
                Number
            ]
        }
    });

const emit =
    defineEmits([
        'media-selected',
        'apply-suggestion'
    ]);

const lookupLoading =
    ref(false);

const lookupMessage =
    ref('');

const lookupHasError =
    ref(false);

const mediaSelections = ref({});
const appliedSuggestionKey = ref(null);
let lookupGeneration = 0;

const suggestions =
    ref([]);

const lookupEnabled =
    ref(true);

const platformInput =
    ref('');

const yearInput =
    ref('');

const canLookup =
    computed(
        () => lookupEnabled.value &&
            String(props.query ?? '').trim() !== ''
    );

watch(
    () => props.platform,
    value => {

        if (
            !platformInput.value
        ) {

            platformInput.value =
                normalizeOptionalText(value);

        }

    },
    {
        immediate:
            true
    }
);

watch(
    () => props.year,
    value => {

        if (
            !yearInput.value
        ) {

            yearInput.value =
                normalizeOptionalText(value);

        }

    },
    {
        immediate:
            true
    }
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
                        provider.plugin === 'games' &&
                        provider.capabilities?.includes(
                            'games/search'
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
        props.disabled || lookupLoading.value || !canLookup.value
    ) {

        return;

    }

    const generation = ++lookupGeneration;

    lookupLoading.value =
        true;

    lookupMessage.value =
        '';

    lookupHasError.value =
        false;

    suggestions.value =
        [];
    mediaSelections.value = {};
    appliedSuggestionKey.value = null;
    emit('media-selected', { mode: 'none' });

    try {

        const response =
            await searchGames({
                platform:
                    normalizeOptionalText(
                        platformInput.value
                    ),
                query:
                    String(props.query).trim(),
                year:
                    normalizeOptionalText(
                        yearInput.value
                    )
            });

        if (generation !== lookupGeneration) return;

        suggestions.value =
            (response?.results ?? []).map((suggestion, index) => ({
                ...suggestion, mediaKey: `${generation}:${index}`,
                mediaCandidates: normalizeAcquisitionMediaCandidates(suggestion),
                mediaSearchQuery: buildAcquisitionMediaQuery('games', suggestion)
            }));

        if (
            suggestions.value.length === 0
        ) {

            lookupMessage.value =
                'Aucun résultat trouvé. Vous pouvez continuer la saisie manuellement.';

        }

    } catch (error) {

        if (generation !== lookupGeneration) return;

        lookupHasError.value =
            true;

        lookupMessage.value =
            getLookupErrorMessage(
                error
            );

    } finally {

        if (generation === lookupGeneration) lookupLoading.value = false;

    }

}

function selectMedia(suggestion, selection) {
    mediaSelections.value[suggestion.mediaKey] = selection;
    if (appliedSuggestionKey.value === suggestion.mediaKey) emit('media-selected', selection);
}

function useSuggestion(suggestion) {
    if (appliedSuggestionKey.value !== null && appliedSuggestionKey.value !== suggestion.mediaKey) {
        mediaSelections.value[appliedSuggestionKey.value] = { mode: 'none' };
    }
    appliedSuggestionKey.value = suggestion.mediaKey;

    emit(
        'apply-suggestion',
        { ...suggestion, mediaSelection: mediaSelections.value[suggestion.mediaKey] ?? { mode: 'none' } }
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

            return 'Le service de recherche jeu est indisponible. Vous pouvez continuer la saisie manuellement.';

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
        suggestion.metadata?.igdbId,
        suggestion.sourceUrl,
        suggestion.title
    ]
        .filter(Boolean)
        .join('-');

}

function getCoverUrl(suggestion) {

    return suggestion.images?.find(
        image => image.kind === 'cover' && image.url
    )?.url;

}

function getSuggestionSummary(suggestion) {

    return [
        getReleaseYear(
            suggestion.metadata?.releaseDate
        ),
        getPrimaryPlatforms(
            suggestion.metadata?.platforms
        )
    ]
        .filter(Boolean)
        .join(' · ');

}

function getReleaseYear(value) {

    return typeof value === 'string'
        ? value.slice(
            0,
            4
        )
        : '';

}

function getPrimaryPlatforms(platforms) {

    if (
        !Array.isArray(platforms)
    ) {

        return '';

    }

    return platforms
        .slice(
            0,
            3
        )
        .join(', ');

}

function getSourceLabel(suggestion) {

    return suggestion.provider === 'igdb'
        ? 'IGDB'
        : suggestion.provider;

}

function normalizeOptionalText(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return '';

    }

    return String(value).trim();

}
</script>

<style scoped>
.game-acquisition {
    display: grid;
    gap: 8px;
    grid-column: 1 / -1;
}

.lookup-row {
    align-items: end;
    display: grid;
    gap: 8px;
    grid-template-columns: minmax(0, 1fr) 120px auto;
}

.lookup-row label {
    color: #172033;
    display: grid;
    font-size: 0.85rem;
    gap: 4px;
}

.lookup-row input {
    border: 1px solid #d8dee8;
    border-radius: 6px;
    font: inherit;
    min-height: 42px;
    padding: 0 10px;
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
    grid-template-columns: minmax(0, 1fr) auto;
    padding: 10px;
}

.suggestion-cover {
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
.suggestion p,
.suggestion dl {
    margin: 0;
}

.suggestion h3 {
    color: #172033;
    font-size: 0.95rem;
}

.suggestion-summary,
.suggestion-description,
.suggestion-source,
.suggestion-metadata {
    color: #5f6f89;
    font-size: 0.85rem;
}

.suggestion-metadata {
    display: grid;
    gap: 2px 8px;
    grid-template-columns: auto minmax(0, 1fr);
}

.suggestion-metadata dt {
    font-weight: 700;
}

.suggestion-metadata dd {
    margin: 0;
}

.use-button {
    background: #ffffff;
    color: #2357a4;
    padding: 0 12px;
}

@media (max-width: 639px) {
    .lookup-row,
    .suggestion {
        grid-template-columns: 1fr;
    }

    .lookup-button,
    .use-button {
        width: 100%;
    }
}
</style>
