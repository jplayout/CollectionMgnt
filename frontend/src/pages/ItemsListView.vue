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
                class="search-form"
                @submit.prevent="loadItems"
            >
                <label>
                    Recherche
                    <input
                        v-model="searchTitle"
                        placeholder="Titre"
                        type="search"
                    >
                </label>

                <button type="submit">
                    Rechercher
                </button>
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

const searchTitle =
    ref('');

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

onMounted(
    loadPage
);

watch(
    pluginId,
    loadPage
);

async function loadPage() {

    await Promise.all([
        loadSchema(),
        loadItems()
    ]);

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

        items.value =
            await getItems({
                plugin:
                    pluginId.value,
                title:
                    searchTitle.value.trim()
            });

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

.search-form {
    align-items: end;
    display: grid;
    gap: 12px;
    grid-template-columns: minmax(0, 1fr) auto;
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
}
</style>
