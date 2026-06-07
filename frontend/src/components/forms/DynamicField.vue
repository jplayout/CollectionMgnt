<template>
    <div class="field">
        <label :for="fieldId">
            <span>
                {{ fieldLabel }}
                <strong v-if="field.required">*</strong>
            </span>

            <textarea
                v-if="field.type === 'textarea'"
                :id="fieldId"
                :value="modelValue"
                rows="4"
                @input="updateValue($event.target.value)"
            />

            <select
                v-else-if="isSelectWithOptions"
                :id="fieldId"
                :value="modelValue"
                @change="updateSelectValue($event.target.value)"
            >
                <option value="">
                    Choisir...
                </option>

                <option
                    v-for="option in normalizedOptions"
                    :key="String(option.value)"
                    :value="option.value"
                >
                    {{ option.label }}
                </option>
            </select>

            <span
                v-else-if="field.type === 'checkbox'"
                class="checkbox-control"
            >
                <input
                    :id="fieldId"
                    :checked="Boolean(modelValue)"
                    type="checkbox"
                    @change="updateValue($event.target.checked)"
                >
            </span>

            <input
                v-else
                :id="fieldId"
                :max="numberMax"
                :min="numberMin"
                :pattern="textPattern"
                :step="numberStep"
                :type="inputType"
                :value="modelValue ?? ''"
                @input="updateValue($event.target.value)"
            >
        </label>

        <p
            v-if="showSelectFallback"
            class="field-note"
        >
            Aucune option déclarée, saisie libre.
        </p>

        <p
            v-if="error"
            class="field-error"
        >
            {{ error }}
        </p>
    </div>
</template>

<script setup>
import {
    computed
} from 'vue';

const props =
    defineProps({
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
        'update:modelValue'
    ]);

const fieldId =
    computed(
        () => `field-${props.field.name}`
    );

const fieldLabel =
    computed(
        () => props.field.label ?? props.field.name
    );

const normalizedOptions =
    computed(
        () => Array.isArray(props.field.options)
            ? props.field.options.map(
                option => {

                    if (
                        option !== null &&
                        typeof option === 'object' &&
                        option.value !== undefined
                    ) {

                        return {
                            label:
                                option.label ?? String(option.value),
                            value:
                                option.value
                        };

                    }

                    return {
                        label:
                            String(option),
                        value:
                            option
                    };

                }
            )
            : []
    );

const isSelectWithOptions =
    computed(
        () => props.field.type === 'select' &&
            normalizedOptions.value.length > 0
    );

const showSelectFallback =
    computed(
        () => props.field.type === 'select' &&
            normalizedOptions.value.length === 0
    );

const inputType =
    computed(
        () => {

            if (
                props.field.type === 'date'
            ) {

                return 'date';

            }

            if (
                props.field.type === 'number' ||
                props.field.type === 'rating'
            ) {

                return 'number';

            }

            return 'text';

        }
    );

const numberMin =
    computed(
        () => isNumberField.value
            ? props.field.min
            : undefined
    );

const numberMax =
    computed(
        () => isNumberField.value
            ? props.field.max
            : undefined
    );

const numberStep =
    computed(
        () => isNumberField.value
            ? props.field.step ?? 'any'
            : undefined
    );

const textPattern =
    computed(
        () => props.field.type === 'text' ||
            props.field.type === 'textarea' ||
            props.field.type === 'select'
            ? props.field.pattern
            : undefined
    );

const isNumberField =
    computed(
        () => props.field.type === 'number' ||
            props.field.type === 'rating'
    );

function updateValue(
    value
) {

    emit(
        'update:modelValue',
        value
    );

}

function updateSelectValue(
    value
) {

    const selectedOption =
        normalizedOptions.value.find(
            option => String(option.value) === value
        );

    updateValue(
        selectedOption
            ? selectedOption.value
            : value
    );

}
</script>

<style scoped>
.field {
    display: grid;
    gap: 6px;
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
select,
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

.checkbox-control {
    align-items: center;
    border: 1px solid #b8c2d1;
    border-radius: 6px;
    display: flex;
    min-height: 40px;
    padding: 0 12px;
}

.checkbox-control input {
    height: 18px;
    width: 18px;
}

.field-note {
    color: #5f6f89;
    font-size: 0.8rem;
    margin: 0;
}

.field-error {
    color: #b42318;
    font-size: 0.85rem;
    margin: 0;
}
</style>
