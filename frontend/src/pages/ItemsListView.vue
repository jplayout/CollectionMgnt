<template>
    <main class="items-page">
        <header class="page-header">
            <div class="header-main">
                <BreadcrumbTrail :items="breadcrumbItems" />
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
                @submit.prevent="searchItems"
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

                    <button
                        class="secondary-button"
                        type="button"
                        @click="toggleDisplayPanel"
                    >
                        Affichage
                    </button>

                    <button
                        class="secondary-button"
                        type="button"
                        @click="exportCollectionCsv"
                    >
                        Export CSV
                    </button>

                    <div
                        aria-label="Mode d’affichage"
                        class="view-toggle"
                    >
                        <button
                            :class="{ active: viewMode === 'cards' }"
                            :aria-pressed="viewMode === 'cards'"
                            type="button"
                            @click="changeViewMode('cards')"
                        >
                            Cartes
                        </button>

                        <button
                            :class="{ active: viewMode === 'list' }"
                            :aria-pressed="viewMode === 'list'"
                            type="button"
                            @click="changeViewMode('list')"
                        >
                            Liste
                        </button>
                    </div>

                    <label>
                        Trier par
                        <select
                            v-model="sort"
                            @change="changeSort"
                        >
                            <option
                                v-for="option in sortOptions"
                                :key="option.value"
                                :value="option.value"
                            >
                                {{ option.label }}
                            </option>
                        </select>
                    </label>

                    <label>
                        Ordre
                        <select
                            v-model="direction"
                            @change="changeSort"
                        >
                            <option value="asc">
                                Croissant
                            </option>

                            <option value="desc">
                                Décroissant
                            </option>
                        </select>
                    </label>
                </div>

                <section
                    v-if="filterableFields.length"
                    class="filters-section"
                    @change="changeFilters"
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

            <DisplayPreferencesPanel
                v-if="isDisplayPanelOpen"
                :error="displayPreferencesError"
                :fields="schemaFields"
                :preferences="displayPreferences"
                :saving="savingDisplayPreferences"
                @cancel="closeDisplayPanel"
                @reset="resetPreferences"
                @save="savePreferences"
            />
        </section>

        <p
            v-if="showDeletedMessage"
            class="success-message"
        >
            Item supprimé.
        </p>

        <p
            v-if="exportError"
            class="error-message"
        >
            {{ exportError }}
        </p>

        <section class="content-panel">
            <div
                v-if="!loading && !error && totalItems > 0"
                class="pagination-summary"
            >
                {{ totalItems }} item{{ totalItems > 1 ? 's' : '' }}
            </div>

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

            <div v-else>
                <div
                    v-if="viewMode === 'cards'"
                    class="items-grid"
                >
                    <ItemCard
                        v-for="item in items"
                        :key="item.id"
                        :display-preferences="displayPreferences"
                        :fields="schemaFields"
                        :item="item"
                    />
                </div>

                <ItemList
                    v-else
                    :display-preferences="displayPreferences"
                    :fields="schemaFields"
                    :items="items"
                />

                <nav
                    v-if="totalItems > 0"
                    aria-label="Pagination des items"
                    class="pagination-bar"
                >
                    <button
                        class="secondary-button"
                        :disabled="currentPage <= 1"
                        type="button"
                        @click="goToPreviousPage"
                    >
                        Précédent
                    </button>

                    <span>
                        Page {{ currentPage }} / {{ totalPages }}
                    </span>

                    <button
                        class="secondary-button"
                        :disabled="currentPage >= totalPages"
                        type="button"
                        @click="goToNextPage"
                    >
                        Suivant
                    </button>
                </nav>
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
    useRoute,
    useRouter
} from 'vue-router';

import {
    ApiError
} from '../services/api.js';

import BreadcrumbTrail
from '../components/navigation/BreadcrumbTrail.vue';

import {
    getItems
} from '../services/item-api.js';

import {
    downloadCollectionCsvExport
} from '../services/export-api.js';

import {
    getDisplayPreferences,
    getPluginSchema,
    resetDisplayPreferences,
    updateDisplayPreferences
} from '../services/plugin-api.js';

import DisplayPreferencesPanel
from '../components/display/DisplayPreferencesPanel.vue';

import ItemCard
from '../components/items/ItemCard.vue';

import ItemList
from '../components/items/ItemList.vue';

const route =
    useRoute();

const router =
    useRouter();

const defaultPage =
    1;

const defaultPageSize =
    24;

const defaultSort =
    'title';

const defaultDirection =
    'asc';

const defaultViewMode =
    'cards';

const pluginId =
    computed(
        () => route.params.pluginId
    );

const pluginSchema =
    ref(null);

const displayPreferences =
    ref(null);

const isDisplayPanelOpen =
    ref(false);

const savingDisplayPreferences =
    ref(false);

const displayPreferencesError =
    ref('');

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

const exportError =
    ref('');

const currentPage =
    ref(defaultPage);

const pageSize =
    ref(defaultPageSize);

const totalItems =
    ref(0);

const totalPages =
    ref(0);

const viewMode =
    ref(defaultViewMode);

const sort =
    ref(defaultSort);

const direction =
    ref(defaultDirection);

const pluginTitle =
    computed(
        () => pluginSchema.value?.plugin?.name ??
            pluginSchema.value?.plugin?.id ??
            pluginId.value
    );

const breadcrumbItems =
    computed(
        () => [
            {
                label:
                    'Collections',
                to: {
                    name:
                        'collections'
                }
            },
            {
                label:
                    pluginTitle.value
            }
        ]
    );

const showDeletedMessage =
    computed(
        () => route.query.deleted !== undefined
    );

const schemaFields =
    computed(
        () => pluginSchema.value?.fields ?? []
    );

const filterableFields =
    computed(
        () => schemaFields.value.filter(
            field => field.filterable
        )
    );

const sortableMetadataFields =
    computed(
        () => schemaFields.value.filter(
            field => isSortableMetadataField(
                field
            )
        )
    );

const sortOptions =
    computed(
        () => [
            {
                label:
                    'Date de création',
                value:
                    'created_at'
            },
            {
                label:
                    'Date de modification',
                value:
                    'updated_at'
            },
            {
                label:
                    'Titre',
                value:
                    'title'
            },
            ...sortableMetadataFields.value.map(
                field => ({
                    label:
                        field.label ?? field.name,
                    value:
                        field.name
                })
            )
        ]
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

    isDisplayPanelOpen.value =
        false;

    displayPreferencesError.value =
        '';

    await Promise.all([
        loadSchema(),
        loadDisplayPreferences()
    ]);

    applyStateFromQuery();

    ensureSelectedSortIsAvailable();

    await loadItems();

}

function ensureSelectedSortIsAvailable() {

    const isSortAvailable =
        sortOptions.value.some(
            option => option.value === sort.value
        );

    if (
        isSortAvailable
    ) {

        return;

    }

    sort.value =
        defaultSort;

    direction.value =
        defaultDirection;

}

function applyStateFromQuery() {

    searchQuery.value =
        getStringQueryParam(
            route.query.search,
            ''
        );

    currentPage.value =
        parseIntegerQueryParam(
            route.query.page,
            defaultPage,
            {
                min:
                    1
            }
        );

    pageSize.value =
        parseIntegerQueryParam(
            route.query.pageSize,
            defaultPageSize,
            {
                max:
                    100,
                min:
                    1
            }
        );

    const querySort =
        getStringQueryParam(
            route.query.sort,
            defaultSort
        );

    sort.value =
        querySort.trim() === ''
            ? defaultSort
            : querySort;

    const queryDirection =
        getStringQueryParam(
            route.query.direction,
            defaultDirection
        );

    direction.value =
        queryDirection === 'desc'
            ? 'desc'
            : defaultDirection;

    const queryView =
        getStringQueryParam(
            route.query.view,
            defaultViewMode
        );

    viewMode.value =
        queryView === 'list'
            ? 'list'
            : defaultViewMode;

    resetFilterValuesFromQuery();

}

function resetFilterValuesFromQuery() {

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
            getFilterValueFromQuery(
                field
            );

    }

}

function getFilterValueFromQuery(
    field
) {

    const queryValue =
        getStringQueryParam(
            route.query[field.name],
            ''
        );

    if (
        queryValue === ''
    ) {

        return '';

    }

    if (
        field.type === 'select'
    ) {

        const selectedOption =
            normalizedOptions(
                field
            ).find(
                option => String(option.value) === queryValue
            );

        return selectedOption?.value ?? queryValue;

    }

    return queryValue;

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

async function loadDisplayPreferences() {

    try {

        displayPreferences.value =
            await getDisplayPreferences(
                pluginId.value
            );

    } catch {

        displayPreferences.value =
            null;

    }

}

function toggleDisplayPanel() {

    displayPreferencesError.value =
        '';

    isDisplayPanelOpen.value =
        !isDisplayPanelOpen.value;

}

function closeDisplayPanel() {

    displayPreferencesError.value =
        '';

    isDisplayPanelOpen.value =
        false;

}

async function savePreferences(
    preferences
) {

    savingDisplayPreferences.value =
        true;

    displayPreferencesError.value =
        '';

    try {

        displayPreferences.value =
            await updateDisplayPreferences(
                pluginId.value,
                preferences
            );

        isDisplayPanelOpen.value =
            false;

    } catch (saveError) {

        displayPreferencesError.value =
            saveError instanceof ApiError
                ? saveError.message
                : 'Impossible d’enregistrer les préférences d’affichage';

    } finally {

        savingDisplayPreferences.value =
            false;

    }

}

async function resetPreferences() {

    const shouldReset =
        window.confirm(
            'Réinitialiser les préférences d’affichage de cette collection ?'
        );

    if (
        !shouldReset
    ) {

        return;

    }

    savingDisplayPreferences.value =
        true;

    displayPreferencesError.value =
        '';

    try {

        displayPreferences.value =
            await resetDisplayPreferences(
                pluginId.value
            );

        isDisplayPanelOpen.value =
            false;

    } catch (resetError) {

        displayPreferencesError.value =
            resetError instanceof ApiError
                ? resetError.message
                : 'Impossible de réinitialiser les préférences d’affichage';

    } finally {

        savingDisplayPreferences.value =
            false;

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
                sort:
                    sort.value,
                direction:
                    direction.value,
                page:
                    currentPage.value,
                pageSize:
                    pageSize.value,
                ...buildBackendFilterParams()
            });

        if (
            loadedItems.items.length === 0 &&
            loadedItems.total > 0 &&
            loadedItems.page > 1
        ) {

            currentPage.value =
                Math.max(
                    1,
                    Math.min(
                        loadedItems.totalPages,
                        loadedItems.page - 1
                    )
                );

            await loadItems();

            return;

        }

        items.value =
            loadedItems.items;

        totalItems.value =
            loadedItems.total;

        currentPage.value =
            loadedItems.page;

        pageSize.value =
            loadedItems.pageSize;

        totalPages.value =
            loadedItems.totalPages;

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

async function searchItems() {

    resetCurrentPage();

    await syncRouteQuery();

    loadItems();

}

async function resetFilters() {

    searchQuery.value =
        '';

    resetFilterValues();

    resetCurrentPage();

    await syncRouteQuery();

    loadItems();

}

async function changeFilters() {

    resetCurrentPage();

    await syncRouteQuery();

    loadItems();

}

function resetCurrentPage() {

    currentPage.value =
        defaultPage;

}

async function changeSort() {

    resetCurrentPage();

    await syncRouteQuery();

    loadItems();

}

async function changeViewMode(
    nextViewMode
) {

    if (
        viewMode.value === nextViewMode
    ) {

        return;

    }

    viewMode.value =
        nextViewMode;

    await syncRouteQuery();

}

async function exportCollectionCsv() {

    await runExport(
        () => downloadCollectionCsvExport(
            pluginId.value
        )
    );

}

async function runExport(exportAction) {

    exportError.value =
        '';

    try {

        await exportAction();

    } catch (downloadError) {

        exportError.value =
            downloadError instanceof ApiError
                ? downloadError.message
                : 'Export impossible';

    }

}

function goToPreviousPage() {

    if (
        currentPage.value <= 1
    ) {

        return;

    }

    currentPage.value -=
        1;

    syncRouteQuery()
        .then(
            loadItems
        );

}

function goToNextPage() {

    if (
        currentPage.value >= totalPages.value
    ) {

        return;

    }

    currentPage.value +=
        1;

    syncRouteQuery()
        .then(
            loadItems
        );

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

async function syncRouteQuery() {

    await router.replace({
        name:
            'collection-items',
        params: {
            pluginId:
                pluginId.value
        },
        query:
            buildListQuery()
    });

}

function buildListQuery() {

    const query = {};

    const search =
        searchQuery.value.trim();

    if (
        search
    ) {

        query.search =
            search;

    }

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

        query[field.name] =
            String(
                value
            );

    }

    if (
        currentPage.value !== defaultPage
    ) {

        query.page =
            String(
                currentPage.value
            );

    }

    if (
        pageSize.value !== defaultPageSize
    ) {

        query.pageSize =
            String(
                pageSize.value
            );

    }

    if (
        sort.value !== defaultSort
    ) {

        query.sort =
            sort.value;

    }

    if (
        direction.value !== defaultDirection
    ) {

        query.direction =
            direction.value;

    }

    if (
        viewMode.value !== defaultViewMode
    ) {

        query.view =
            viewMode.value;

    }

    return query;

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

function canFilterOnBackend(
    field
) {

    return [
        'text',
        'textarea',
        'select',
        'checkbox',
        'date',
        'number',
        'rating'
    ].includes(field.type);

}

function isSortableMetadataField(
    field
) {

    return [
        'text',
        'textarea',
        'select',
        'date',
        'number',
        'rating',
        'checkbox'
    ].includes(field.type);

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
            : value;

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

function getStringQueryParam(
    value,
    fallback
) {

    if (
        Array.isArray(
            value
        )
    ) {

        return value[0] ?? fallback;

    }

    return value === undefined ||
        value === null
        ? fallback
        : String(
            value
        );

}

function parseIntegerQueryParam(
    value,
    fallback,
    options = {}
) {

    const stringValue =
        getStringQueryParam(
            value,
            ''
        );

    if (
        !/^\d+$/.test(
            stringValue
        )
    ) {

        return fallback;

    }

    const numberValue =
        Number(
            stringValue
        );

    if (
        options.min !== undefined &&
        numberValue < options.min
    ) {

        return fallback;

    }

    if (
        options.max !== undefined &&
        numberValue > options.max
    ) {

        return fallback;

    }

    return numberValue;

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

.header-main {
    display: grid;
    gap: 8px;
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

.error-message {
    background: #fff4f2;
    border: 1px solid #f0b8ae;
    border-radius: 6px;
    color: #b42318;
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
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
}

.search-form label:first-child {
    grid-column: span 2;
}

.view-toggle {
    align-items: stretch;
    background: #eef2f7;
    border: 1px solid #d8dee8;
    border-radius: 6px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    min-height: 42px;
    padding: 3px;
}

.view-toggle button {
    background: transparent;
    border-radius: 4px;
    color: #172033;
    padding: 7px 10px;
}

.view-toggle button.active {
    background: #ffffff;
    box-shadow: 0 1px 2px rgb(23 32 51 / 0.14);
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
    align-items: start;
    display: grid;
    gap: 16px;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
}

.pagination-summary {
    color: #5f6f89;
    font-size: 0.9rem;
    margin-bottom: 14px;
}

.pagination-bar {
    align-items: center;
    display: flex;
    gap: 12px;
    justify-content: center;
    margin-top: 20px;
}

.pagination-bar span {
    color: #30394b;
    font-weight: 600;
}

button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
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

    .search-form label:first-child {
        grid-column: auto;
    }

    .filters-header {
        align-items: start;
        display: grid;
    }

    .pagination-bar {
        align-items: stretch;
        display: grid;
        text-align: center;
    }
}
</style>
