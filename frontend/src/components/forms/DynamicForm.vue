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

            <DynamicField
                v-for="field in supportedFields"
                :key="field.name"
                v-model="metadata[field.name]"
                :error="frontendErrors[field.name]"
                :field="field"
            />
        </div>

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
                {{ submitting ? 'Création...' : 'Créer l’item' }}
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

const SUPPORTED_TYPES =
    new Set([
        'text',
        'textarea',
        'select',
        'checkbox',
        'date',
        'number',
        'rating'
    ]);

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
        backendError: {
            default:
                null,
            type: [
                Object,
                String,
                Array
            ]
        }
    });

const emit =
    defineEmits([
        'submit'
    ]);

const title =
    ref('');

const description =
    ref('');

const metadata =
    reactive({});

const frontendErrors =
    reactive({});

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
                'Impossible de créer l’item'
            ];

        }
    );

watch(
    supportedFields,
    initializeMetadata,
    {
        immediate:
            true
    }
);

function initializeMetadata(
    fields
) {

    for (
        const field
        of fields
    ) {

        if (
            metadata[field.name] !== undefined
        ) {

            continue;

        }

        metadata[field.name] =
            field.type === 'checkbox'
                ? false
                : '';

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

    const payloadMetadata = {};

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

        if (
            field.min !== undefined &&
            value < field.min
        ) {

            errors[field.name] =
                `La valeur minimale est ${field.min}`;

            return;

        }

        if (
            field.max !== undefined &&
            value > field.max
        ) {

            errors[field.name] =
                `La valeur maximale est ${field.max}`;

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
            field.type === 'select'
        )
    ) {

        validatePattern(
            field,
            value,
            errors
        );

    }

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
    padding: 10px 14px;
}

button:disabled {
    cursor: wait;
    opacity: 0.7;
}

@media (max-width: 720px) {
    .form-grid {
        grid-template-columns: 1fr;
    }
}
</style>
