<template>
    <main class="collections-page">
        <header class="page-header">
            <RouterLink
                class="back-link"
                :to="{ name: 'dashboard' }"
            >
                Dashboard
            </RouterLink>

            <div>
                <p class="eyebrow">Collections</p>
                <h1>Collections</h1>
            </div>
        </header>

        <section class="content-panel">
            <div
                v-if="loading"
                class="state-panel"
            >
                Chargement des collections...
            </div>

            <div
                v-else-if="error"
                class="state-panel error"
            >
                {{ error }}
            </div>

            <div
                v-else-if="!enabledPlugins.length"
                class="state-panel"
            >
                Aucune collection active.
            </div>

            <div
                v-else
                class="collections-grid"
            >
                <CollectionCard
                    v-for="plugin in enabledPlugins"
                    :key="plugin.code"
                    :collection="plugin"
                />
            </div>
        </section>
    </main>
</template>

<script setup>
import {
    computed,
    onMounted,
    ref
} from 'vue';

import {
    ApiError
} from '../services/api.js';

import {
    getPlugins
} from '../services/plugin-api.js';

import CollectionCard
from '../components/collections/CollectionCard.vue';

const plugins =
    ref([]);

const loading =
    ref(false);

const error =
    ref('');

const enabledPlugins =
    computed(
        () => plugins.value.filter(
            plugin => plugin.enabled
        )
    );

onMounted(
    loadPlugins
);

async function loadPlugins() {

    loading.value =
        true;

    error.value =
        '';

    try {

        plugins.value =
            await getPlugins();

    } catch (loadError) {

        error.value =
            loadError instanceof ApiError
                ? loadError.message
                : 'Impossible de charger les collections';

    } finally {

        loading.value =
            false;

    }

}
</script>

<style scoped>
.collections-page {
    background: #f5f7fa;
    color: #172033;
    min-height: 100vh;
    padding: 32px;
}

.page-header,
.content-panel {
    margin: 0 auto;
    max-width: 1080px;
}

.page-header {
    display: grid;
    gap: 14px;
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

.eyebrow {
    color: #5f6f89;
    font-size: 0.85rem;
    margin: 0 0 4px;
}

h1 {
    margin: 0;
}

.collections-grid {
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
    min-height: 160px;
    justify-content: center;
    padding: 24px;
    text-align: center;
}

.state-panel.error {
    color: #b42318;
}
</style>
