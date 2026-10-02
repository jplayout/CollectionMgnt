<template>
    <div class="acquisition-field">
        <div class="field-row">
            <DynamicField
                :model-value="modelValue"
                :error="error"
                :field="field"
                @update:model-value="updateValue"
            />

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
                :key="getSuggestionKey(suggestion)"
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

                    <p v-if="suggestion.provider" class="suggestion-summary">
                        Source : {{ getProviderName(suggestion.provider) }}
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
                    :disabled="disabled"
                    :model-value="mediaSelections[getSuggestionKey(suggestion)]"
                    @update:model-value="selectMedia(suggestion, $event)"
                />
            </article>
        </div>
    </div>
</template>

<script setup>
import {
    computed,
    onMounted,
    onBeforeUnmount,
    ref
} from 'vue';

import AcquisitionMediaPicker from '../acquisition/AcquisitionMediaPicker.vue';
import { normalizeAcquisitionMediaCandidates, buildAcquisitionMediaQuery } from '../../services/acquisition-media.js';

import DynamicField
from './DynamicField.vue';

import {
    ApiError
} from '../../services/api.js';

import {
    getAcquisitionProviders,
    lookupBookByIsbn
} from '../../services/acquisition-api.js';

const props =
    defineProps({
        disabled: { type: Boolean, default: false },
        field: {
            required:
                true,
            type:
                Object
        },
        modelValue: {
            default:
                '',
            type: [
                String,
                Number,
                Boolean
            ]
        },
        error: {
            default:
                '',
            type:
                String
        }
    });

const emit =
    defineEmits([
        'apply-suggestion',
        'media-selected',
        'update:modelValue'
    ]);

const lookupLoading =
    ref(false);

const lookupMessage =
    ref('');

const lookupHasError =
    ref(false);

const suggestions =
    ref([]);

const mediaSelections = ref({});
const appliedSuggestionKey = ref(null);
let lookupGeneration = 0;
onBeforeUnmount(() => { lookupGeneration += 1; });

const lookupEnabled =
    ref(true);

const providers = ref([]);

const canLookup =
    computed(
        () => lookupEnabled.value &&
            String(props.modelValue ?? '').trim() !== ''
    );

onMounted(
    loadProviderCapabilities
);

async function loadProviderCapabilities() {

    try {

        const response =
            await getAcquisitionProviders();

        providers.value = response?.providers ?? [];

        lookupEnabled.value =
            Boolean(
                response?.providers?.some(
                    provider => provider.enabled &&
                        provider.plugin === 'books' &&
                        provider.capabilities?.includes(
                            'isbnLookup'
                        )
                )
            );

    } catch {

        lookupEnabled.value =
            true;

    }

}

function updateValue(value) {

    lookupGeneration += 1;
    lookupLoading.value = false;

    lookupMessage.value =
        '';

    lookupHasError.value =
        false;

    suggestions.value =
        [];

    mediaSelections.value = {};
    appliedSuggestionKey.value = null;
    emit('media-selected', { mode: 'none' });

    emit(
        'update:modelValue',
        value
    );

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
            await lookupBookByIsbn({
                isbn:
                    String(props.modelValue).trim()
            });

        if (generation !== lookupGeneration) return;

        suggestions.value =
            (response?.results ?? []).map((suggestion, index) => ({
                ...suggestion,
                mediaKey: `${generation}:${index}`,
                mediaCandidates: normalizeAcquisitionMediaCandidates(suggestion),
                mediaSearchQuery: buildAcquisitionMediaQuery('books', suggestion)
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
    const key = getSuggestionKey(suggestion);
    mediaSelections.value[key] = selection;
    if (appliedSuggestionKey.value === key) emit('media-selected', selection);
}

function useSuggestion(suggestion) {

    const key = getSuggestionKey(suggestion);
    if (appliedSuggestionKey.value !== null && appliedSuggestionKey.value !== key) {
        mediaSelections.value[appliedSuggestionKey.value] = { mode: 'none' };
    }
    appliedSuggestionKey.value = key;

    emit(
        'apply-suggestion',
        { ...suggestion, mediaSelection: mediaSelections.value[appliedSuggestionKey.value] ?? { mode: 'none' } }
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
            code === 'invalid_isbn'
        ) {

            return 'ISBN invalide. Vérifiez la saisie puis réessayez.';

        }

        if (
            code === 'provider_unavailable' ||
            code === 'provider_unconfigured'
        ) {

            return 'Le service de recherche est indisponible. Vous pouvez continuer la saisie manuellement.';

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

    if (suggestion.mediaKey !== undefined) return suggestion.mediaKey;

    return [
        suggestion.provider,
        suggestion.sourceUrl,
        suggestion.title,
        suggestion.metadata?.isbn
    ]
        .filter(Boolean)
        .join('-');

}

function getSuggestionSummary(suggestion) {

    return [
        suggestion.metadata?.author,
        suggestion.metadata?.publisher,
        suggestion.metadata?.publication_date
    ]
        .filter(Boolean)
        .join(' · ');

}

function getProviderName(providerId) {
    return providers.value.find(provider => provider.id === providerId)?.name ?? providerId;
}
</script>

<style scoped>
.acquisition-field {
    display: grid;
    gap: 8px;
}

.field-row {
    align-items: end;
    display: grid;
    gap: 8px;
    grid-template-columns: minmax(0, 1fr) auto;
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
.suggestion-description {
    color: #5f6f89;
    font-size: 0.85rem;
}

.use-button {
    background: #ffffff;
    color: #2357a4;
    padding: 0 12px;
}

@media (max-width: 639px) {
    .field-row,
    .suggestion {
        grid-template-columns: 1fr;
    }

    .lookup-button,
    .use-button {
        width: 100%;
    }
}
</style>

