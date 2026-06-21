<template>
    <main class="item-create-page">
        <header class="page-header">
            <BreadcrumbTrail :items="breadcrumbItems" />

            <div>
                <p class="eyebrow">{{ pluginName }}</p>
                <h1>Nouvel item</h1>
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
                :key="pluginId"
                :backend-error="submitError"
                :fields="schemaFields"
                :plugin-id="pluginId"
                :submitting="submitting"
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

import BreadcrumbTrail
from '../components/navigation/BreadcrumbTrail.vue';

import {
    ApiError
} from '../services/api.js';

import {
    createItem
} from '../services/item-api.js';

import {
    getPluginSchema
} from '../services/plugin-api.js';

const route =
    useRoute();

const router =
    useRouter();

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

const pluginId =
    computed(
        () => route.params.pluginId
    );

const pluginName =
    computed(
        () => schema.value?.plugin?.name ??
            schema.value?.plugin?.id ??
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
                    pluginName.value,
                to: {
                    name:
                        'collection-items',
                    params: {
                        pluginId:
                            pluginId.value
                    }
                }
            },
            {
                label:
                    'Nouvel item'
            }
        ]
    );

const schemaFields =
    computed(
        () => schema.value?.fields ?? []
    );

onMounted(
    loadSchema
);

watch(
    pluginId,
    loadSchema
);

async function loadSchema() {

    loading.value =
        true;

    loadError.value =
        '';

    submitError.value =
        null;

    try {

        schema.value =
            await getPluginSchema(
                pluginId.value
            );

    } catch (error) {

        schema.value =
            null;

        loadError.value =
            error instanceof ApiError
                ? error.message
                : 'Impossible de charger le schéma du plugin';

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

        const createdItem =
            await createItem(
                payload
            );

        await router.push({
            name:
                'item-details',
            params: {
                id:
                    createdItem.id
            }
        });

    } catch (error) {

        submitError.value =
            error instanceof ApiError
                ? error.payload ?? error.message
                : 'Impossible de créer l’item';

    } finally {

        submitting.value =
            false;

    }

}
</script>

<style scoped>
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

.eyebrow {
    color: #5f6f89;
    font-size: 0.85rem;
    margin: 0 0 4px;
}

h1 {
    margin: 0;
    overflow-wrap: anywhere;
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

@media (max-width: 639px) {
    .state-panel {
        padding: 20px;
    }
}
</style>
