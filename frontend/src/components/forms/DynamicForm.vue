<template>
    <form
        class="dynamic-form"
        @submit.prevent="submitForm"
    >
        <div class="form-grid">
            <div class="field">
                <label for="item-title">
                    <span>Titre <strong>*</strong></span>
                    <input
                        id="item-title"
                        v-model="title"
                        type="text"
                    >
                </label>

                <p
                    v-if="frontendErrors.title"
                    class="field-error"
                >
                    {{ frontendErrors.title }}
                </p>
            </div>

            <div class="field full-width">
                <label for="item-description">
                    Description
                    <textarea
                        id="item-description"
                        v-model="description"
                        rows="4"
                    />
                </label>
            </div>

            <MovieAcquisitionSearch
                v-if="isMovieAcquisitionSearchEnabled"
                :query="title"
                @apply-suggestion="applyMovieAcquisitionSuggestion"
            />

            <GameAcquisitionSearch
                v-if="isGameAcquisitionSearchEnabled"
                :platform="metadata.platform"
                :query="title"
                :year="getReleaseYear(metadata.release_date)"
                @apply-suggestion="applyGameAcquisitionSuggestion"
            />

            <template
                v-for="field in supportedFields"
                :key="field.name"
            >
                <div
                    v-if="isScannerEnabled(field)"
                    class="scanner-field-row"
                >
                    <AcquisitionLookupField
                        v-if="isAcquisitionLookupField(field)"
                        :error="frontendErrors[field.name]"
                        :field="field"
                        :model-value="metadata[field.name]"
                        @apply-suggestion="applyAcquisitionSuggestion"
                        @update:model-value="updateMetadataValue(field, $event)"
                    />

                    <DynamicField
                        v-else
                        :error="frontendErrors[field.name]"
                        :field="field"
                        :model-value="metadata[field.name]"
                        @update:model-value="updateMetadataValue(field, $event)"
                    />

                    <button
                        :aria-label="`Scanner le champ ${field.label ?? field.name}`"
                        class="scanner-button"
                        :disabled="submitting || scannerOpen"
                        type="button"
                        @click="openScanner(field, $event.currentTarget)"
                    >
                        Scanner
                    </button>
                </div>

                <AcquisitionLookupField
                    v-else-if="isAcquisitionLookupField(field)"
                    :error="frontendErrors[field.name]"
                    :field="field"
                    :model-value="metadata[field.name]"
                    @apply-suggestion="applyAcquisitionSuggestion"
                    @update:model-value="updateMetadataValue(field, $event)"
                />

                <DynamicField
                    v-else
                    :error="frontendErrors[field.name]"
                    :field="field"
                    :model-value="metadata[field.name]"
                    @update:model-value="updateMetadataValue(field, $event)"
                />
            </template>
        </div>

        <CameraScanner
            :open="scannerOpen"
            :scanner-factory="scannerFactory"
            :trigger-element="scannerTriggerElement"
            @close="closeScanner"
            @error="handleScannerError"
            @result="applyScannerResult"
        />

        <div
            v-if="backendMessages.length"
            class="backend-errors"
        >
            <p
                v-for="message in backendMessages"
                :key="message"
            >
                {{ message }}
            </p>
        </div>

        <div class="actions">
            <button
                :disabled="submitting"
                type="submit"
            >
                {{ submitting ? submittingLabel : submitLabel }}
            </button>
        </div>
    </form>
</template>

<script setup>
import {
    computed,
    reactive,
    ref,
    watch
} from 'vue';

import DynamicField
from './DynamicField.vue';

import CameraScanner
from './CameraScanner.vue';

import AcquisitionLookupField
from './AcquisitionLookupField.vue';

import MovieAcquisitionSearch
from './MovieAcquisitionSearch.vue';

import GameAcquisitionSearch
from './GameAcquisitionSearch.vue';

const SUPPORTED_TYPES =
    new Set([
        'text',
        'textarea',
        'select',
        'checkbox',
        'date',
        'number',
        'rating',
        'isbn',
        'barcode'
    ]);

const DEFAULT_RATING_MIN =
    0;

const DEFAULT_RATING_MAX =
    20;

const props =
    defineProps({
        pluginId: {
            required:
                true,
            type:
                String
        },
        fields: {
            default:
                () => [],
            type:
                Array
        },
        submitting: {
            default:
                false,
            type:
                Boolean
        },
        initialValue: {
            default:
                null,
            type:
                Object
        },
        submitLabel: {
            default:
                'Créer l’item',
            type:
                String
        },
        submittingLabel: {
            default:
                'Création...',
            type:
                String
        },
        fallbackErrorMessage: {
            default:
                'Impossible d’enregistrer l’item',
            type:
                String
        },
        backendError: {
            default:
                null,
            type: [
                Object,
                String,
                Array
            ]
        },
        enableAcquisitionSearch: {
            default:
                false,
            type:
                Boolean
        },
        scannerFactory: {
            default:
                undefined,
            type:
                Function
        }
    });

const emit =
    defineEmits([
        'acquisition-image-selected',
        'submit'
    ]);

const title =
    ref('');

const description =
    ref('');

const metadata =
    reactive({});

const extraMetadata =
    reactive({});

const frontendErrors =
    reactive({});

const scannerOpen =
    ref(false);

const scannerField =
    ref(null);

const scannerTriggerElement =
    ref(null);

const supportedFields =
    computed(
        () => props.fields.filter(
            field => SUPPORTED_TYPES.has(
                field.type
            )
        )
    );

const backendMessages =
    computed(
        () => {

            const error =
                props.backendError;

            if (
                !error
            ) {

                return [];

            }

            if (
                Array.isArray(error)
            ) {

                return error.map(
                    message => String(message)
                );

            }

            if (
                typeof error === 'string'
            ) {

                return [
                    error
                ];

            }

            if (
                Array.isArray(error.errors)
            ) {

                return error.errors.map(
                    message => String(message)
                );

            }

            if (
                error.error
            ) {

                return [
                    String(error.error)
                ];

            }

            if (
                error.message
            ) {

                return [
                    String(error.message)
                ];

            }

            return [
                props.fallbackErrorMessage
            ];

        }
    );

const isMovieAcquisitionSearchEnabled =
    computed(
        () => props.enableAcquisitionSearch &&
            props.pluginId === 'movies'
    );

const isGameAcquisitionSearchEnabled =
    computed(
        () => props.enableAcquisitionSearch &&
            props.pluginId === 'games'
    );

watch(
    [
        supportedFields,
        () => props.initialValue
    ],
    resetForm,
    {
        immediate:
            true
    }
);

function resetForm() {

    title.value =
        props.initialValue?.title ?? '';

    description.value =
        props.initialValue?.description ?? '';

    clearMetadata();
    clearExtraMetadata();

    const initialMetadata =
        props.initialValue?.metadata ?? {};

    for (
        const field
        of supportedFields.value
    ) {

        if (
            initialMetadata[field.name] !== undefined
        ) {

            metadata[field.name] =
                initialMetadata[field.name];

            continue;

        }

        metadata[field.name] =
            field.type === 'checkbox'
                ? false
                : '';

    }

    clearFrontendErrors();

}

function clearMetadata() {

    for (
        const key
        of Object.keys(
            metadata
        )
    ) {

        delete metadata[key];

    }

}

function clearExtraMetadata() {

    for (
        const key
        of Object.keys(
            extraMetadata
        )
    ) {

        delete extraMetadata[key];

    }

}

function submitForm() {

    clearFrontendErrors();

    const payload =
        buildPayload();

    const errors =
        validatePayload(
            payload
        );

    Object.assign(
        frontendErrors,
        errors
    );

    if (
        Object.keys(errors).length > 0
    ) {

        return;

    }

    emit(
        'submit',
        payload
    );

}

function buildPayload() {

    const payloadMetadata = {
        ...extraMetadata
    };

    for (
        const field
        of supportedFields.value
    ) {

        const value =
            normalizeValue(
                field,
                metadata[field.name]
            );

        if (
            value === undefined
        ) {

            continue;

        }

        payloadMetadata[field.name] =
            value;

    }

    return {
        plugin:
            props.pluginId,
        title:
            title.value.trim(),
        description:
            description.value.trim(),
        metadata:
            payloadMetadata
    };

}

function isAcquisitionLookupField(field) {

    return props.pluginId === 'books' &&
        field.name === 'isbn' &&
        field.type === 'isbn';

}

function isScannerEnabled(field) {

    return field.type === 'isbn' ||
        field.type === 'barcode';

}

function updateMetadataValue(field, value) {

    metadata[field.name] =
        value;

    delete frontendErrors[field.name];

}

function openScanner(field, triggerElement) {

    if (
        !isScannerEnabled(
            field
        )
    ) {

        return;

    }

    scannerField.value =
        field;

    scannerTriggerElement.value =
        triggerElement;

    scannerOpen.value =
        true;

}

function closeScanner() {

    scannerOpen.value =
        false;

}

function handleScannerError() {

    // CameraScanner renders the user-facing camera error. Manual input remains available.

}

function applyScannerResult(result) {

    const field =
        scannerField.value;

    if (
        !field
    ) {

        return;

    }

    const normalizedValue =
        normalizeIdentifier(
            result?.rawValue ?? ''
        );

    const scannedErrors =
        getFieldValidationErrors(
        field,
        normalizedValue
    );

    if (
        scannedErrors[field.name] &&
        hasValidCurrentIdentifierValue(
            field
        )
    ) {

        frontendErrors[field.name] =
            'Code scanné invalide, valeur existante conservée';

        scannerOpen.value =
            false;

        return;

    }

    metadata[field.name] =
        normalizedValue;

    setFieldErrors(
        field,
        scannedErrors
    );

    scannerOpen.value =
        false;

}

function getFieldValidationErrors(field, value) {

    const errors = {};

    validateFieldValue(
        field,
        value,
        errors
    );

    return errors;

}

function setFieldErrors(field, errors) {

    delete frontendErrors[field.name];

    if (
        errors[field.name]
    ) {

        frontendErrors[field.name] =
            errors[field.name];

    }

}

function hasValidCurrentIdentifierValue(field) {

    const currentValue =
        metadata[field.name];

    if (
        isEmptyValue(
            currentValue
        )
    ) {

        return false;

    }

    const currentErrors =
        getFieldValidationErrors(
        field,
        currentValue
    );

    return !currentErrors[field.name];

}

function applyAcquisitionSuggestion(suggestion) {

    if (
        !isEmptyValue(suggestion?.title) &&
        isEmptyValue(title.value)
    ) {

        title.value =
            suggestion.title;

    }

    if (
        !isEmptyValue(suggestion?.description) &&
        isEmptyValue(description.value)
    ) {

        description.value =
            suggestion.description;

    }

    applyMetadataSuggestion(
        'isbn',
        suggestion?.metadata?.isbn,
        {
            replace:
                true
        }
    );

    applyMetadataSuggestion(
        'author',
        suggestion?.metadata?.author
    );

    applyMetadataSuggestion(
        'publisher',
        suggestion?.metadata?.publisher
    );

    applyMetadataSuggestion(
        'publication_date',
        suggestion?.metadata?.publication_date
    );

    const coverImage =
        getCoverImage(
            suggestion
        );

    if (
        coverImage
    ) {

        emit(
            'acquisition-image-selected',
            {
                imageUrl:
                    coverImage.url,
                provider:
                    suggestion.provider ?? null,
                source:
                    coverImage.source ?? suggestion.provider ?? null
            }
        );

    }

}

function applyMovieAcquisitionSuggestion(suggestion) {

    if (
        !isEmptyValue(suggestion?.title) &&
        isEmptyValue(title.value)
    ) {

        title.value =
            suggestion.title;

    }

    if (
        !isEmptyValue(suggestion?.description) &&
        isEmptyValue(description.value)
    ) {

        description.value =
            suggestion.description;

    }

    applyMetadataSuggestion(
        'release_date',
        suggestion?.metadata?.releaseDate
    );

    applyExtraMetadataSuggestion(
        'tmdbId',
        suggestion?.metadata?.tmdbId
    );

    applyExtraMetadataSuggestion(
        'originalTitle',
        suggestion?.metadata?.originalTitle
    );

    applyExtraMetadataSuggestion(
        'originalLanguage',
        suggestion?.metadata?.originalLanguage
    );

    const coverImage =
        getCoverImage(
            suggestion
        );

    if (
        coverImage
    ) {

        emit(
            'acquisition-image-selected',
            {
                imageUrl:
                    coverImage.url,
                provider:
                    suggestion.provider ?? null,
                source:
                    coverImage.source ?? suggestion.provider ?? null
            }
        );

    }

}

function applyGameAcquisitionSuggestion(suggestion) {

    if (
        !isEmptyValue(suggestion?.title) &&
        isEmptyValue(title.value)
    ) {

        title.value =
            suggestion.title;

    }

    if (
        !isEmptyValue(suggestion?.description) &&
        isEmptyValue(description.value)
    ) {

        description.value =
            suggestion.description;

    }

    applyMetadataSuggestion(
        'release_date',
        suggestion?.metadata?.releaseDate
    );

    applyMetadataSuggestion(
        'developer',
        suggestion?.metadata?.developer
    );

    applyMetadataSuggestion(
        'publisher',
        suggestion?.metadata?.publisher
    );

    applyMetadataSuggestion(
        'platform',
        joinSuggestionList(
            suggestion?.metadata?.platforms
        )
    );

    applyMetadataSuggestion(
        'genre',
        joinSuggestionList(
            suggestion?.metadata?.genres
        )
    );

    applyExtraMetadataSuggestion(
        'igdbId',
        suggestion?.metadata?.igdbId
    );

    const coverImage =
        getCoverImage(
            suggestion
        );

    if (
        coverImage
    ) {

        emit(
            'acquisition-image-selected',
            {
                imageUrl:
                    coverImage.url,
                provider:
                    suggestion.provider ?? null,
                source:
                    coverImage.source ?? suggestion.provider ?? null
            }
        );

    }

}

function getCoverImage(suggestion) {

    return suggestion?.images?.find(
        image => image.kind === 'cover' && image.url
    ) ?? null;

}

function joinSuggestionList(value) {

    if (
        !Array.isArray(value)
    ) {

        return value;

    }

    return value
        .filter(
            item => !isEmptyValue(item)
        )
        .join(', ');

}

function getReleaseYear(value) {

    if (
        typeof value !== 'string'
    ) {

        return null;

    }

    const match =
        value.match(
            /^\d{4}/
        );

    return match?.[0] ?? null;

}

function applyExtraMetadataSuggestion(
    fieldName,
    value
) {

    if (
        isEmptyValue(value)
    ) {

        return;

    }

    extraMetadata[fieldName] =
        value;

}

function applyMetadataSuggestion(
    fieldName,
    value,
    {
        replace = false
    } = {}
) {

    if (
        isEmptyValue(value) ||
        !hasSupportedField(
            fieldName
        )
    ) {

        return;

    }

    if (
        replace ||
        isEmptyValue(
            metadata[fieldName]
        )
    ) {

        metadata[fieldName] =
            value;

    }

}

function hasSupportedField(fieldName) {

    return supportedFields.value.some(
        field => field.name === fieldName
    );

}

function normalizeValue(
    field,
    value
) {

    if (
        field.type === 'checkbox'
    ) {

        return Boolean(value);

    }

    if (
        field.type === 'number' ||
        field.type === 'rating'
    ) {

        if (
            value === undefined ||
            value === null ||
            value === ''
        ) {

            return undefined;

        }

        return Number(value);

    }

    if (
        typeof value === 'string'
    ) {

        const trimmedValue =
            value.trim();

        return trimmedValue === ''
            ? undefined
            : trimmedValue;

    }

    return value;

}

function normalizeIdentifier(value) {

    return String(value)
        .replaceAll(
            /[\s-]/g,
            ''
        )
        .toUpperCase();

}

function validatePayload(
    payload
) {

    const errors = {};

    if (
        isEmptyValue(payload.title)
    ) {

        errors.title =
            'Le titre est obligatoire';

    }

    for (
        const field
        of supportedFields.value
    ) {

        const value =
            payload.metadata[field.name];

        if (
            field.required &&
            isEmptyValue(value)
        ) {

            errors[field.name] =
                'Ce champ est obligatoire';

            continue;

        }

        if (
            isEmptyValue(value)
        ) {

            continue;

        }

        validateFieldValue(
            field,
            value,
            errors
        );

    }

    return errors;

}

function validateFieldValue(
    field,
    value,
    errors
) {

    if (
        field.type === 'isbn' &&
        !isValidIsbn(
            value
        )
    ) {

        errors[field.name] =
            'ISBN invalide';

        return;

    }

    if (
        field.type === 'barcode' &&
        !isValidBarcode(
            value
        )
    ) {

        errors[field.name] =
            'Code-barres invalide';

        return;

    }

    if (
        field.type === 'number' ||
        field.type === 'rating'
    ) {

        if (
            !Number.isFinite(value)
        ) {

            errors[field.name] =
                'La valeur doit être un nombre';

            return;

        }

        const min =
            getNumberMin(
                field
            );

        const max =
            getNumberMax(
                field
            );

        if (
            min !== undefined &&
            value < min
        ) {

            errors[field.name] =
                `La valeur minimale est ${min}`;

            return;

        }

        if (
            max !== undefined &&
            value > max
        ) {

            errors[field.name] =
                `La valeur maximale est ${max}`;

            return;

        }

    }

    if (
        field.type === 'select' &&
        Array.isArray(field.options) &&
        field.options.length > 0
    ) {

        const allowedValues =
            field.options.map(
                option => getOptionValue(option)
            );

        if (
            !allowedValues.includes(value)
        ) {

            errors[field.name] =
                'La valeur doit faire partie des options';

            return;

        }

    }

    if (
        field.pattern !== undefined &&
        (
            field.type === 'text' ||
            field.type === 'textarea' ||
            field.type === 'select' ||
            field.type === 'isbn' ||
            field.type === 'barcode'
        )
    ) {

        validatePattern(
            field,
            value,
            errors
        );

    }

}

function isValidIsbn(value) {

    const normalizedValue =
        normalizeIdentifier(
            value
        );

    if (
        /^[0-9]{9}[0-9X]$/.test(
            normalizedValue
        )
    ) {

        return hasValidIsbn10Checksum(
            normalizedValue
        );

    }

    if (
        /^[0-9]{13}$/.test(
            normalizedValue
        )
    ) {

        return hasValidEan13Checksum(
            normalizedValue
        );

    }

    return false;

}

function isValidBarcode(value) {

    const normalizedValue =
        normalizeIdentifier(
            value
        );

    if (
        /^[0-9]{12}$/.test(
            normalizedValue
        )
    ) {

        return hasValidUpcAChecksum(
            normalizedValue
        );

    }

    if (
        /^[0-9]{13}$/.test(
            normalizedValue
        )
    ) {

        return hasValidEan13Checksum(
            normalizedValue
        );

    }

    return false;

}

function hasValidIsbn10Checksum(value) {

    let sum =
        0;

    for (
        let index = 0;
        index < 10;
        index += 1
    ) {

        const character =
            value[index];

        const digit =
            character === 'X'
                ? 10
                : Number(character);

        sum += digit * (10 - index);

    }

    return sum % 11 === 0;

}

function hasValidEan13Checksum(value) {

    let sum =
        0;

    for (
        let index = 0;
        index < 12;
        index += 1
    ) {

        const digit =
            Number(
                value[index]
            );

        sum += index % 2 === 0
            ? digit
            : digit * 3;

    }

    const checksum =
        (10 - sum % 10) % 10;

    return checksum === Number(
        value[12]
    );

}

function hasValidUpcAChecksum(value) {

    let sum =
        0;

    for (
        let index = 0;
        index < 11;
        index += 1
    ) {

        const digit =
            Number(
                value[index]
            );

        sum += index % 2 === 0
            ? digit * 3
            : digit;

    }

    const checksum =
        (10 - sum % 10) % 10;

    return checksum === Number(
        value[11]
    );

}

function getNumberMin(
    field
) {

    return field.type === 'rating'
        ? field.min ?? DEFAULT_RATING_MIN
        : field.min;

}

function getNumberMax(
    field
) {

    return field.type === 'rating'
        ? field.max ?? DEFAULT_RATING_MAX
        : field.max;

}

function validatePattern(
    field,
    value,
    errors
) {

    try {

        const regex =
            new RegExp(
                field.pattern
            );

        if (
            !regex.test(
                String(value)
            )
        ) {

            errors[field.name] =
                'La valeur ne respecte pas le format attendu';

        }

    } catch {

        errors[field.name] =
            'Le format attendu est invalide';

    }

}

function clearFrontendErrors() {

    for (
        const key
        of Object.keys(
            frontendErrors
        )
    ) {

        delete frontendErrors[key];

    }

}

function getOptionValue(
    option
) {

    if (
        option !== null &&
        typeof option === 'object' &&
        option.value !== undefined
    ) {

        return option.value;

    }

    return option;

}

function isEmptyValue(
    value
) {

    return (
        value === undefined ||
        value === null ||
        (
            typeof value === 'string' &&
            value.trim() === ''
        )
    );

}
</script>

<style scoped>
.dynamic-form {
    background: #ffffff;
    border: 1px solid #d8dee8;
    border-radius: 8px;
    display: grid;
    gap: 22px;
    padding: 22px;
}

.form-grid {
    display: grid;
    gap: 16px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
}

.field {
    display: grid;
    gap: 6px;
}

.full-width {
    grid-column: 1 / -1;
}

.scanner-field-row {
    align-items: end;
    display: grid;
    gap: 8px;
    grid-template-columns: minmax(0, 1fr) auto;
}

label {
    color: #30394b;
    display: grid;
    font-size: 0.9rem;
    gap: 6px;
}

strong {
    color: #b42318;
}

input,
textarea {
    border: 1px solid #b8c2d1;
    border-radius: 6px;
    color: #172033;
    font: inherit;
    min-height: 44px;
    padding: 10px 12px;
}

textarea {
    resize: vertical;
}

.field-error,
.backend-errors {
    color: #b42318;
}

.field-error {
    font-size: 0.85rem;
    margin: 0;
}

.backend-errors {
    background: #fff4f2;
    border: 1px solid #f4b8b1;
    border-radius: 6px;
    display: grid;
    gap: 4px;
    padding: 12px;
}

.backend-errors p {
    margin: 0;
}

.actions {
    display: flex;
    justify-content: end;
}

button {
    background: #172033;
    border: 0;
    border-radius: 6px;
    color: #ffffff;
    cursor: pointer;
    font: inherit;
    font-weight: 600;
    min-height: 44px;
    padding: 10px 14px;
}

button:disabled {
    cursor: wait;
    opacity: 0.7;
}

.scanner-button {
    background: #2357a4;
}

@media (max-width: 899px) {
    .form-grid {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 639px) {
    .dynamic-form {
        gap: 20px;
        padding: 18px;
    }

    .actions {
        display: grid;
    }

    button {
        width: 100%;
    }

    .scanner-field-row {
        grid-template-columns: 1fr;
    }
}
</style>
