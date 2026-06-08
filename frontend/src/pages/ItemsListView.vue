<template>
    <main class="items-page">
        <header class="page-header">
            <RouterLink
                class="back-link"
                :to="{ name: 'collections' }"
            >
                Collections
            </RouterLink>

            <div>
                <p class="eyebrow">{{ pluginId }}</p>
                <h1>{{ pluginTitle }}</h1>
            </div>

            <RouterLink
                class="create-link"
                :to="{ name: 'item-create', params: { pluginId } }"
            >
                Nouvel item
            </RouterLink>
        </header>

        <section class="toolbar">
            <form
                class="search-panel"
                @submit.prevent="loadItems"
            >
                <div class="search-form">
                    <label>
                        Recherche
                        <input
                            v-model="searchQuery"
                            placeholder="Titre, description ou champs recherchables"
                            type="search"
                        >
                    </label>

                    <button type="submit">
                        Rechercher
                    </button>

                    <button
                        class="secondary-button"
                        type="button"
                        @click="resetFilters"
                    >
                        Réinitialiser
                    </button>
                </div>

                <section
                    v-if="filterableFields.length"
                    class="filters-section"
                >
                    <div class="filters-header">
                        <h2>Filtres</h2>

                        <p
                            v-if="activeFilters.length"
                            class="active-summary"
                        >
                            {{ activeFilters.length }} filtre{{ activeFilters.length > 1 ? 's' : '' }} actif{{ activeFilters.length > 1 ? 's' : '' }}
                        </p>
                    </div>

                    <div class="filters-grid">
                        <label
                            v-for="field in filterableFields"
                            :key="field.name"
                        >
                            {{ field.label ?? field.name }}

                            <select
                                v-if="field.type === 'checkbox'"
                                v-model="filterValues[field.name]"
                            >
                                <option value="">
                                    Tous
                                </option>
                                <option value="true">
                                    Oui
                                </option>
                                <option value="false">
                                    Non
                                </option>
                            </select>

                            <select
                                v-else-if="isSelectWithOptions(field)"
                                v-model="filterValues[field.name]"
                            >
                                <option value="">
                                    Tous
                                </option>

                                <option
                                    v-for="option in normalizedOptions(field)"
                                    :key="String(option.value)"
                                    :value="option.value"
                                >
                                    {{ option.label }}
                                </option>
                            </select>

                            <input
                                v-else-if="field.type === 'date'"
                                v-model="filterValues[field.name]"
                                type="date"
                            >

                            <input
                                v-else-if="field.type === 'number' || field.type === 'rating'"
                                v-model="filterValues[field.name]"
                                :max="getNumberMax(field)"
                                :min="getNumberMin(field)"
                                :step="getNumberStep(field)"
                                type="number"
                            >

                            <input
                                v-else
                                v-model="filterValues[field.name]"
                                :placeholder="field.type === 'select' ? 'Saisie libre' : ''"
                                type="text"
                            >
                        </label>
                    </div>

                    <div
                        v-if="activeFilters.length"
                        class="active-filters"
                    >
                        <span
                            v-for="filter in activeFilters"
                            :key="filter.key"
                        >
                            {{ filter.label }} : {{ filter.value }}
                        </span>
                    </div>
                </section>
            </form>
        </section>

        <p
            v-if="showDeletedMessage"
            class="success-message"
        >
            Item supprimé.
        </p>

        <section class="content-panel">
            <div
                v-if="loading"
                class="state-panel"
            >
                Chargement des items...
            </div>

            <div
                v-else-if="error"
                class="state-panel error"
            >
                {{ error }}
            </div>

            <div
                v-else-if="!items.length"
                class="state-panel"
            >
                Aucun item dans cette collection.
            </div>

            <div
                v-else
                class="items-grid"
            >
                <ItemCard
                    v-for="item in items"
                    :key="item.id"
                    :item="item"
                />
            </div>
        </section>
    </main>
</template>

<script setup>
import {
    computed,
    reactive,
    onMounted,
    ref,
    watch
} from 'vue';

import {
    useRoute
} from 'vue-router';

import {
    ApiError
} from '../services/api.js';

import {
    getItems
} from '../services/item-api.js';

import {
    getPluginSchema
} from '../services/plugin-api.js';

import ItemCard
from '../components/items/ItemCard.vue';

const route =
    useRoute();

const pluginId =
    computed(
        () => route.params.pluginId
    );

const pluginSchema =
    ref(null);

const items =
    ref([]);

const searchQuery =
    ref('');

const filterValues =
    reactive({});

const loading =
    ref(false);

const error =
    ref('');

const pluginTitle =
    computed(
        () => pluginSchema.value?.plugin?.name ??
            pluginSchema.value?.plugin?.id ??
            pluginId.value
    );

const showDeletedMessage =
    computed(
        () => route.query.deleted !== undefined
    );

const filterableFields =
    computed(
        () => pluginSchema.value?.fields?.filter(
            field => field.filterable
        ) ?? []
    );

const activeFilters =
    computed(
        () => filterableFields.value
            .map(
                field => ({
                    key:
                        field.name,
                    label:
                        field.label ?? field.name,
                    value:
                        formatFilterValue(
                            field,
                            filterValues[field.name]
                        )
                })
            )
            .filter(
                filter => filter.value !== ''
            )
    );

onMounted(
    loadPage
);

watch(
    pluginId,
    loadPage
);

async function loadPage() {

    await loadSchema();

    resetFilterValues();

    await loadItems();

}

async function loadSchema() {

    try {

        pluginSchema.value =
            await getPluginSchema(
                pluginId.value
            );

    } catch {

        pluginSchema.value =
            null;

    }

}

async function loadItems() {

    loading.value =
        true;

    error.value =
        '';

    try {

        const loadedItems =
            await getItems({
                plugin:
                    pluginId.value,
                search:
                    searchQuery.value.trim(),
                ...buildBackendFilterParams()
            });

        items.value =
            loadedItems.filter(
                item => itemMatchesFilters(
                    item
                )
            );

    } catch (loadError) {

        error.value =
            loadError instanceof ApiError
                ? loadError.message
                : 'Impossible de charger les items';

    } finally {

        loading.value =
            false;

    }

}

function resetFilters() {

    searchQuery.value =
        '';

    resetFilterValues();

    loadItems();

}

function resetFilterValues() {

    for (
        const key
        of Object.keys(
            filterValues
        )
    ) {

        delete filterValues[key];

    }

    for (
        const field
        of filterableFields.value
    ) {

        filterValues[field.name] =
            '';

    }

}

function buildBackendFilterParams() {

    const filters = {};

    for (
        const field
        of filterableFields.value
    ) {

        const value =
            normalizeFilterValue(
                field,
                filterValues[field.name]
            );

        if (
            value === undefined ||
            !canFilterOnBackend(
                field,
                value
            )
        ) {

            continue;

        }

        filters[field.name] =
            value;

    }

    return filters;

}

function itemMatchesFilters(
    item
) {

    return filterableFields.value.every(
        field => {

            const expectedValue =
                normalizeFilterValue(
                    field,
                    filterValues[field.name]
                );

            if (
                expectedValue === undefined
            ) {

                return true;

            }

            const actualValue =
                item.metadata?.[field.name];

            if (
                field.type === 'number' ||
                field.type === 'rating'
            ) {

                return Number(actualValue) === expectedValue;

            }

            if (
                field.type === 'checkbox'
            ) {

                return actualValue === expectedValue;

            }

            return String(actualValue ?? '') === String(expectedValue);

        }
    );

}

function canFilterOnBackend(
    field,
    value
) {

    if (
        field.type === 'checkbox' ||
        field.type === 'number' ||
        field.type === 'rating'
    ) {

        return false;

    }

    if (
        field.type === 'select'
    ) {

        return typeof value === 'string';

    }

    return true;

}

function normalizeFilterValue(
    field,
    value
) {

    if (
        value === undefined ||
        value === null ||
        value === ''
    ) {

        return undefined;

    }

    if (
        field.type === 'checkbox'
    ) {

        return value === true ||
            value === 'true';

    }

    if (
        field.type === 'number' ||
        field.type === 'rating'
    ) {

        const numberValue =
            Number(
                value
            );

        return Number.isFinite(
            numberValue
        )
            ? numberValue
            : undefined;

    }

    return value;

}

function formatFilterValue(
    field,
    value
) {

    const normalizedValue =
        normalizeFilterValue(
            field,
            value
        );

    if (
        normalizedValue === undefined
    ) {

        return '';

    }

    if (
        field.type === 'checkbox'
    ) {

        return normalizedValue
            ? 'Oui'
            : 'Non';

    }

    if (
        field.type === 'select'
    ) {

        const selectedOption =
            normalizedOptions(
                field
            ).find(
                option => option.value === normalizedValue
            );

        return selectedOption?.label ?? String(normalizedValue);

    }

    return String(
        normalizedValue
    );

}

function isSelectWithOptions(
    field
) {

    return field.type === 'select' &&
        normalizedOptions(
            field
        ).length > 0;

}

function normalizedOptions(
    field
) {

    if (
        !Array.isArray(field.options)
    ) {

        return [];

    }

    return field.options.map(
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
    );

}

function getNumberMin(
    field
) {

    return field.type === 'rating'
        ? field.min ?? 0
        : field.min;

}

function getNumberMax(
    field
) {

    return field.type === 'rating'
        ? field.max ?? 20
        : field.max;

}

function getNumberStep(
    field
) {

    return field.type === 'rating'
        ? field.step ?? 1
        : field.step ?? 'any';

}
</script>

<style scoped>
.items-page {
    background: #f5f7fa;
    color: #172033;
    min-height: 100vh;
    padding: 32px;
}

.page-header,
.toolbar,
.content-panel {
    margin: 0 auto;
    max-width: 1080px;
}

.page-header {
    align-items: end;
    display: flex;
    gap: 14px;
    justify-content: space-between;
    margin-bottom: 24px;
}

.back-link {
    color: #1f6feb;
    font-weight: 600;
    text-decoration: none;
}

.back-link:hover {
    text-decoration: underline;
}

.create-link {
    background: #172033;
    border-radius: 6px;
    color: #ffffff;
    font-weight: 600;
    padding: 10px 14px;
    text-decoration: none;
}

.create-link:hover {
    background: #26324a;
}

.eyebrow {
    color: #5f6f89;
    font-size: 0.85rem;
    margin: 0 0 4px;
}

h1 {
    margin: 0;
}

.toolbar {
    background: #ffffff;
    border: 1px solid #d8dee8;
    border-radius: 8px;
    margin-bottom: 18px;
    padding: 18px;
}

.success-message {
    background: #effaf2;
    border: 1px solid #a7d7b4;
    border-radius: 6px;
    color: #246b37;
    font-weight: 600;
    margin: 0 auto 18px;
    max-width: 1080px;
    padding: 12px 14px;
}

.search-panel {
    display: grid;
    gap: 18px;
}

.search-form {
    align-items: end;
    display: grid;
    gap: 12px;
    grid-template-columns: minmax(0, 1fr) auto auto;
}

label {
    color: #30394b;
    display: grid;
    font-size: 0.9rem;
    gap: 6px;
}

input {
    border: 1px solid #b8c2d1;
    border-radius: 6px;
    font: inherit;
    padding: 10px 12px;
}

select {
    background: #ffffff;
    border: 1px solid #b8c2d1;
    border-radius: 6px;
    font: inherit;
    padding: 10px 12px;
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

.secondary-button {
    background: #eef2f7;
    color: #172033;
}

.secondary-button:hover {
    background: #dde5f0;
}

.filters-section {
    border-top: 1px solid #e4e9f2;
    display: grid;
    gap: 14px;
    padding-top: 16px;
}

.filters-header {
    align-items: center;
    display: flex;
    gap: 12px;
    justify-content: space-between;
}

h2 {
    font-size: 1rem;
    margin: 0;
}

.active-summary {
    color: #5f6f89;
    font-size: 0.85rem;
    margin: 0;
}

.filters-grid {
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.active-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.active-filters span {
    background: #edf4ff;
    border: 1px solid #bfd6ff;
    border-radius: 999px;
    color: #1f4d8f;
    font-size: 0.85rem;
    padding: 6px 10px;
}

.items-grid {
    display: grid;
    gap: 16px;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
}

.state-panel {
    align-items: center;
    background: #ffffff;
    border: 1px solid #d8dee8;
    border-radius: 8px;
    color: #5f6f89;
    display: flex;
    justify-content: center;
    min-height: 160px;
    padding: 24px;
    text-align: center;
}

.state-panel.error {
    color: #b42318;
}

@media (max-width: 640px) {
    .page-header {
        align-items: start;
        display: grid;
    }

    .search-form {
        grid-template-columns: 1fr;
    }

    .filters-header {
        align-items: start;
        display: grid;
    }
}
</style>
