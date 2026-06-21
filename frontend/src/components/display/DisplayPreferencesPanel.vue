<template>
    <section class="display-panel">
        <header class="panel-header">
            <div>
                <h2>Affichage</h2>
                <p>Personnaliser les cartes et la fiche détail de cette collection.</p>
            </div>
        </header>

        <p
            v-if="error"
            class="panel-error"
        >
            {{ error }}
        </p>

        <div class="panel-grid">
            <section class="panel-section">
                <div class="section-heading">
                    <h3>Cartes</h3>
                </div>

                <fieldset class="density-group">
                    <legend>Densité</legend>

                    <label>
                        <input
                            v-model="draft.list.density"
                            name="card-density"
                            type="radio"
                            value="comfortable"
                        >
                        Confortable
                    </label>

                    <label>
                        <input
                            v-model="draft.list.density"
                            name="card-density"
                            type="radio"
                            value="compact"
                        >
                        Compact
                    </label>
                </fieldset>

                <div class="field-list">
                    <div
                        v-for="field in cardFields"
                        :key="field.name"
                        class="field-row"
                    >
                        <label class="field-toggle">
                            <input
                                :checked="isHighlighted(field.name)"
                                type="checkbox"
                                @change="toggleHighlightedField(field.name)"
                            >
                            {{ field.label ?? field.name }}
                        </label>

                        <div class="order-actions">
                            <button
                                :disabled="!canMoveHighlightedField(field.name, -1)"
                                type="button"
                                @click="moveHighlightedField(field.name, -1)"
                            >
                                Monter
                            </button>

                            <button
                                :disabled="!canMoveHighlightedField(field.name, 1)"
                                type="button"
                                @click="moveHighlightedField(field.name, 1)"
                            >
                                Descendre
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <section class="panel-section">
                <div class="section-heading">
                    <h3>Fiche détail</h3>
                </div>

                <div class="field-list">
                    <div
                        v-for="field in detailFields"
                        :key="field.name"
                        class="field-row"
                    >
                        <label class="field-toggle">
                            <input
                                :checked="isDetailFieldVisible(field.name)"
                                type="checkbox"
                                @change="toggleDetailFieldVisibility(field.name)"
                            >
                            {{ field.label ?? field.name }}
                        </label>

                        <div class="order-actions">
                            <button
                                :disabled="!canMoveDetailField(field.name, -1)"
                                type="button"
                                @click="moveDetailField(field.name, -1)"
                            >
                                Monter
                            </button>

                            <button
                                :disabled="!canMoveDetailField(field.name, 1)"
                                type="button"
                                @click="moveDetailField(field.name, 1)"
                            >
                                Descendre
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </div>

        <footer class="panel-actions">
            <button
                class="danger-button"
                :disabled="saving"
                type="button"
                @click="emit('reset')"
            >
                Réinitialiser
            </button>

            <div class="primary-actions">
                <button
                    class="secondary-button"
                    :disabled="saving"
                    type="button"
                    @click="emit('cancel')"
                >
                    Annuler
                </button>

                <button
                    :disabled="saving || !hasChanges"
                    type="button"
                    @click="emit('save', normalizedDraft)"
                >
                    {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
                </button>
            </div>
        </footer>
    </section>
</template>

<script setup>
import {
    computed,
    reactive,
    watch
} from 'vue';

const props =
    defineProps({
        fields: {
            default:
                () => [],
            type:
                Array
        },
        preferences: {
            default:
                null,
            type:
                Object
        },
        saving: {
            default:
                false,
            type:
                Boolean
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
        'save',
        'cancel',
        'reset'
    ]);

const draft =
    reactive(
        buildDefaultPreferences()
    );

const fieldNames =
    computed(
        () => props.fields.map(
            field => field.name
        )
    );

const normalizedOriginal =
    computed(
        () => normalizePreferences(
            props.preferences,
            props.fields
        )
    );

const normalizedDraft =
    computed(
        () => normalizePreferences(
            draft,
            props.fields
        )
    );

const hasChanges =
    computed(
        () => JSON.stringify(normalizedDraft.value) !==
            JSON.stringify(normalizedOriginal.value)
    );

const cardFields =
    computed(
        () => {

            const fieldsByName =
                getFieldsByName();

            return [
                ...draft.list.highlightedFields
                    .map(
                        fieldName => fieldsByName.get(fieldName)
                    )
                    .filter(Boolean),
                ...props.fields.filter(
                    field => !draft.list.highlightedFields.includes(field.name)
                )
            ];

        }
    );

const detailFields =
    computed(
        () => draft.details.fieldOrder
            .map(
                fieldName => getFieldsByName().get(fieldName)
            )
            .filter(Boolean)
    );

watch(
    [
        () => props.preferences,
        fieldNames
    ],
    resetDraft,
    {
        immediate:
            true
    }
);

function resetDraft() {

    assignPreferences(
        draft,
        normalizedOriginal.value
    );

}

function toggleHighlightedField(fieldName) {

    const index =
        draft.list.highlightedFields.indexOf(
            fieldName
        );

    if (
        index === -1
    ) {

        draft.list.highlightedFields.push(
            fieldName
        );

        return;

    }

    draft.list.highlightedFields.splice(
        index,
        1
    );

}

function isHighlighted(fieldName) {

    return draft.list.highlightedFields.includes(
        fieldName
    );

}

function moveHighlightedField(
    fieldName,
    direction
) {

    moveFieldName(
        draft.list.highlightedFields,
        fieldName,
        direction
    );

}

function canMoveHighlightedField(
    fieldName,
    direction
) {

    return canMoveFieldName(
        draft.list.highlightedFields,
        fieldName,
        direction
    );

}

function toggleDetailFieldVisibility(fieldName) {

    const index =
        draft.details.hiddenFields.indexOf(
            fieldName
        );

    if (
        index === -1
    ) {

        draft.details.hiddenFields.push(
            fieldName
        );

        return;

    }

    draft.details.hiddenFields.splice(
        index,
        1
    );

}

function isDetailFieldVisible(fieldName) {

    return !draft.details.hiddenFields.includes(
        fieldName
    );

}

function moveDetailField(
    fieldName,
    direction
) {

    moveFieldName(
        draft.details.fieldOrder,
        fieldName,
        direction
    );

}

function canMoveDetailField(
    fieldName,
    direction
) {

    return canMoveFieldName(
        draft.details.fieldOrder,
        fieldName,
        direction
    );

}

function moveFieldName(
    fieldNames,
    fieldName,
    direction
) {

    if (
        !canMoveFieldName(
            fieldNames,
            fieldName,
            direction
        )
    ) {

        return;

    }

    const currentIndex =
        fieldNames.indexOf(
            fieldName
        );

    const targetIndex =
        currentIndex + direction;

    const [
        movedFieldName
    ] =
        fieldNames.splice(
            currentIndex,
            1
        );

    fieldNames.splice(
        targetIndex,
        0,
        movedFieldName
    );

}

function canMoveFieldName(
    fieldNames,
    fieldName,
    direction
) {

    const currentIndex =
        fieldNames.indexOf(
            fieldName
        );

    const targetIndex =
        currentIndex + direction;

    return currentIndex !== -1 &&
        targetIndex >= 0 &&
        targetIndex < fieldNames.length;

}

function normalizePreferences(
    preferences,
    fields
) {

    const knownFieldNames =
        fields.map(
            field => field.name
        );

    const fieldNameSet =
        new Set(
            knownFieldNames
        );

    const highlightedFields =
        normalizeFieldNames(
            preferences?.list?.highlightedFields,
            fieldNameSet,
            knownFieldNames.slice(
                0,
                3
            ),
            false
        );

    const density =
        preferences?.list?.density === 'compact'
            ? 'compact'
            : 'comfortable';

    const fieldOrder =
        normalizeFieldNames(
            preferences?.details?.fieldOrder,
            fieldNameSet,
            knownFieldNames,
            true
        );

    const hiddenFields =
        normalizeFieldNames(
            preferences?.details?.hiddenFields,
            fieldNameSet,
            [],
            false
        );

    return {
        list: {
            highlightedFields,
            density
        },
        details: {
            fieldOrder,
            hiddenFields
        }
    };

}

function normalizeFieldNames(
    value,
    knownFieldNames,
    fallback,
    appendFallback
) {

    const normalizedFieldNames = [];
    const source =
        Array.isArray(value)
            ? value
            : fallback;

    for (
        const fieldName
        of source
    ) {

        if (
            knownFieldNames.has(fieldName) &&
            !normalizedFieldNames.includes(fieldName)
        ) {

            normalizedFieldNames.push(
                fieldName
            );

        }

    }

    if (
        appendFallback &&
        source !== fallback
    ) {

        for (
            const fieldName
            of fallback
        ) {

            if (
                knownFieldNames.has(fieldName) &&
                !normalizedFieldNames.includes(fieldName)
            ) {

                normalizedFieldNames.push(
                    fieldName
                );

            }

        }

    }

    return normalizedFieldNames;

}

function assignPreferences(
    target,
    source
) {

    target.list.highlightedFields.splice(
        0,
        target.list.highlightedFields.length,
        ...source.list.highlightedFields
    );

    target.list.density =
        source.list.density;

    target.details.fieldOrder.splice(
        0,
        target.details.fieldOrder.length,
        ...source.details.fieldOrder
    );

    target.details.hiddenFields.splice(
        0,
        target.details.hiddenFields.length,
        ...source.details.hiddenFields
    );

}

function buildDefaultPreferences() {

    return {
        list: {
            highlightedFields:
                [],
            density:
                'comfortable'
        },
        details: {
            fieldOrder:
                [],
            hiddenFields:
                []
        }
    };

}

function getFieldsByName() {

    return new Map(
        props.fields.map(
            field => [
                field.name,
                field
            ]
        )
    );

}
</script>

<style scoped>
.display-panel {
    border-top: 1px solid #e4e9f2;
    display: grid;
    gap: 18px;
    padding-top: 18px;
}

.panel-header {
    display: flex;
    justify-content: space-between;
    gap: 16px;
}

h2,
h3,
p {
    margin: 0;
}

.panel-header p {
    color: #5f6f89;
    margin-top: 4px;
}

.panel-error {
    background: #fff4f2;
    border: 1px solid #f4b8b1;
    border-radius: 6px;
    color: #b42318;
    padding: 10px 12px;
}

.panel-grid {
    display: grid;
    gap: 16px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
}

.panel-section {
    border: 1px solid #d8dee8;
    border-radius: 8px;
    display: grid;
    gap: 14px;
    padding: 14px;
}

.section-heading {
    display: flex;
    justify-content: space-between;
}

.density-group {
    border: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin: 0;
    padding: 0;
}

legend {
    color: #5f6f89;
    font-size: 0.85rem;
    margin-bottom: 8px;
    width: 100%;
}

.density-group label,
.field-toggle {
    align-items: center;
    display: flex;
    gap: 8px;
}

.field-list {
    display: grid;
    gap: 10px;
}

.field-row {
    align-items: center;
    display: grid;
    gap: 10px;
    grid-template-columns: minmax(0, 1fr) auto;
}

.order-actions {
    display: flex;
    gap: 6px;
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
    padding: 8px 10px;
}

button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
}

.secondary-button {
    background: #eef2f7;
    color: #172033;
}

.danger-button {
    background: #fff4f2;
    color: #b42318;
}

.panel-actions {
    align-items: center;
    display: flex;
    justify-content: space-between;
    gap: 12px;
}

.primary-actions {
    display: flex;
    gap: 10px;
}

@media (max-width: 899px) {
    .panel-grid {
        grid-template-columns: 1fr;
    }

    .field-row,
    .panel-actions {
        align-items: stretch;
        grid-template-columns: 1fr;
    }

    .field-row {
        display: grid;
    }

    .order-actions,
    .primary-actions {
        flex-wrap: wrap;
    }
}

@media (max-width: 639px) {
    .order-actions,
    .panel-actions,
    .primary-actions {
        display: grid;
        grid-template-columns: 1fr;
    }

    button {
        width: 100%;
    }
}
</style>
