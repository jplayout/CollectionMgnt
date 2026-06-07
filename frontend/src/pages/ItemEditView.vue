<template>
    <main class="item-edit-page">
        <header class="page-header">
            <RouterLink
                class="back-link"
                :to="{ name: 'item-details', params: { id: itemId } }"
            >
                Détail item
            </RouterLink>

            <div>
                <p class="eyebrow">{{ pluginName }}</p>
                <h1>Modifier {{ itemTitle }}</h1>
            </div>
        </header>

        <section class="content-panel">
            <div
                v-if="loading"
                class="state-panel"
            >
                Chargement du formulaire...
            </div>

            <div
                v-else-if="loadError"
                class="state-panel error"
            >
                {{ loadError }}
            </div>

            <DynamicForm
                v-else
                :key="`${itemId}-${pluginId}`"
                :backend-error="submitError"
                fallback-error-message="Impossible de modifier l’item"
                :fields="schemaFields"
                :initial-value="initialValue"
                :plugin-id="pluginId"
                submit-label="Sauvegarder"
                :submitting="submitting"
                submitting-label="Sauvegarde..."
                @submit="submitItem"
            />
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
    useRoute,
    useRouter
} from 'vue-router';

import DynamicForm
from '../components/forms/DynamicForm.vue';

import {
    ApiError
} from '../services/api.js';

import {
    getItem,
    updateItem
} from '../services/item-api.js';

import {
    getPluginSchema
} from '../services/plugin-api.js';

const route =
    useRoute();

const router =
    useRouter();

const item =
    ref(null);

const schema =
    ref(null);

const loading =
    ref(false);

const submitting =
    ref(false);

const loadError =
    ref('');

const submitError =
    ref(null);

const itemId =
    computed(
        () => route.params.id
    );

const pluginId =
    computed(
        () => item.value?.plugin ?? ''
    );

const pluginName =
    computed(
        () => item.value?.plugin_display_name ??
            schema.value?.plugin?.name ??
            pluginId.value
    );

const itemTitle =
    computed(
        () => item.value?.title ?? `Item #${itemId.value}`
    );

const schemaFields =
    computed(
        () => schema.value?.fields ?? []
    );

const initialValue =
    computed(
        () => item.value
            ? {
                title:
                    item.value.title,
                description:
                    item.value.description ?? '',
                metadata:
                    item.value.metadata ?? {}
            }
            : null
    );

onMounted(
    loadPage
);

watch(
    itemId,
    loadPage
);

async function loadPage() {

    loading.value =
        true;

    loadError.value =
        '';

    submitError.value =
        null;

    item.value =
        null;

    schema.value =
        null;

    try {

        const loadedItem =
            await getItem(
                itemId.value
            );

        item.value =
            loadedItem;

        schema.value =
            await getPluginSchema(
                loadedItem.plugin
            );

    } catch (error) {

        loadError.value =
            error instanceof ApiError
                ? error.message
                : 'Impossible de charger l’item';

    } finally {

        loading.value =
            false;

    }

}

async function submitItem(
    payload
) {

    submitting.value =
        true;

    submitError.value =
        null;

    try {

        await updateItem(
            itemId.value,
            payload
        );

        await router.push({
            name:
                'item-details',
            params: {
                id:
                    itemId.value
            }
        });

    } catch (error) {

        submitError.value =
            error instanceof ApiError
                ? error.payload ?? error.message
                : 'Impossible de modifier l’item';

    } finally {

        submitting.value =
            false;

    }

}
</script>

<style scoped>
.item-edit-page {
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
</style>
