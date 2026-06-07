<template>
    <main class="item-details-page">
        <header class="item-header">
            <RouterLink
                class="back-link"
                :to="backTarget"
            >
                {{ backLabel }}
            </RouterLink>

            <div class="header-row">
                <div>
                    <p class="eyebrow">{{ pluginLabel }}</p>
                    <h1>{{ itemTitle }}</h1>
                </div>

                <div
                    v-if="item"
                    class="header-actions"
                >
                    <RouterLink
                        class="edit-link"
                        :to="{ name: 'item-edit', params: { id: itemId } }"
                    >
                        Modifier
                    </RouterLink>

                    <button
                        class="delete-button"
                        :disabled="deleting"
                        type="button"
                        @click="deleteCurrentItem"
                    >
                        {{ deleting ? 'Suppression...' : 'Supprimer' }}
                    </button>
                </div>
            </div>
        </header>

        <section class="details-panel">
            <div
                v-if="loading"
                class="state-panel"
            >
                Chargement de l’item...
            </div>

            <div
                v-else-if="error"
                class="state-panel error"
            >
                {{ error }}
            </div>

            <div
                v-else-if="item"
                class="item-summary"
            >
                <p
                    v-if="deleteError"
                    class="delete-error"
                >
                    {{ deleteError }}
                </p>

                <p
                    v-if="item.description"
                    class="description"
                >
                    {{ item.description }}
                </p>

                <dl class="info-list">
                    <div>
                        <dt>Plugin</dt>
                        <dd>{{ pluginLabel }}</dd>
                    </div>

                    <div>
                        <dt>Créé le</dt>
                        <dd>{{ formatDate(item.created_at) }}</dd>
                    </div>

                    <div>
                        <dt>Mis à jour le</dt>
                        <dd>{{ formatDate(item.updated_at) }}</dd>
                    </div>
                </dl>

                <section
                    v-if="metadataEntries.length"
                    class="metadata-section"
                >
                    <h2>Métadonnées</h2>

                    <dl class="metadata-list">
                        <div
                            v-for="entry in metadataEntries"
                            :key="entry.key"
                        >
                            <dt>{{ entry.key }}</dt>
                            <dd>{{ entry.value }}</dd>
                        </div>
                    </dl>
                </section>
            </div>
        </section>

        <MediaGallery
            v-if="item"
            :item-id="itemId"
        />
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

import MediaGallery
from '../components/media/MediaGallery.vue';

import {
    ApiError
} from '../services/api.js';

import {
    deleteItem,
    getItem
} from '../services/item-api.js';

const route =
    useRoute();

const router =
    useRouter();

const item =
    ref(null);

const loading =
    ref(false);

const error =
    ref('');

const deleting =
    ref(false);

const deleteError =
    ref('');

const itemId =
    computed(
        () => route.params.id
    );

const itemTitle =
    computed(
        () => item.value?.title ?? `Item #${itemId.value}`
    );

const pluginLabel =
    computed(
        () => item.value?.plugin_display_name ??
            item.value?.plugin ??
            'Item details'
    );

const backTarget =
    computed(
        () => item.value?.plugin
            ? {
                name:
                    'collection-items',
                params: {
                    pluginId:
                        item.value.plugin
                }
            }
            : {
                name:
                    'dashboard'
            }
    );

const backLabel =
    computed(
        () => item.value?.plugin
            ? 'Items'
            : 'Dashboard'
    );

const metadataEntries =
    computed(
        () => Object
            .entries(
                item.value?.metadata ?? {}
            )
            .filter(
                ([, value]) => value !== null &&
                    value !== undefined &&
                    value !== ''
            )
            .map(
                ([key, value]) => ({
                    key,
                    value:
                        formatMetadataValue(
                            value
                        )
                })
            )
    );

onMounted(
    loadItem
);

watch(
    itemId,
    loadItem
);

async function loadItem() {

    loading.value =
        true;

    error.value =
        '';

    deleteError.value =
        '';

    try {

        item.value =
            await getItem(
                itemId.value
            );

    } catch (loadError) {

        item.value =
            null;

        error.value =
            loadError instanceof ApiError
                ? loadError.message
                : 'Impossible de charger l’item';

    } finally {

        loading.value =
            false;

    }

}

async function deleteCurrentItem() {

    if (
        !item.value ||
        deleting.value
    ) {

        return;

    }

    const shouldDelete =
        window.confirm(
            `Supprimer définitivement "${item.value.title}" ? Cette action est irréversible.`
        );

    if (
        !shouldDelete
    ) {

        return;

    }

    deleting.value =
        true;

    deleteError.value =
        '';

    const plugin =
        item.value.plugin;

    try {

        await deleteItem(
            itemId.value
        );

        if (
            plugin
        ) {

            await router.push({
                name:
                    'collection-items',
                params: {
                    pluginId:
                        plugin
                },
                query: {
                    deleted:
                        '1'
                }
            });

            return;

        }

        await router.push({
            name:
                'collections'
        });

    } catch (deleteRequestError) {

        deleteError.value =
            deleteRequestError instanceof ApiError
                ? deleteRequestError.message
                : 'Impossible de supprimer l’item';

    } finally {

        deleting.value =
            false;

    }

}

function formatMetadataValue(
    value
) {

    if (
        typeof value === 'boolean'
    ) {

        return value ? 'Oui' : 'Non';

    }

    if (
        Array.isArray(value)
    ) {

        return value.join(
            ', '
        );

    }

    return String(
        value
    );

}

function formatDate(
    value
) {

    if (
        !value
    ) {

        return '-';

    }

    return new Intl.DateTimeFormat(
        'fr-FR',
        {
            dateStyle:
                'medium',
            timeStyle:
                'short'
        }
    ).format(
        new Date(value)
    );

}
</script>

<style scoped>
.item-details-page {
    background: #f5f7fa;
    color: #172033;
    min-height: 100vh;
    padding: 32px;
}

.item-header,
.details-panel {
    margin: 0 auto 24px;
    max-width: 1080px;
}

.item-header {
    display: grid;
    gap: 14px;
}

.header-row {
    align-items: end;
    display: flex;
    gap: 16px;
    justify-content: space-between;
}

.header-actions {
    align-items: center;
    display: flex;
    gap: 10px;
}

.back-link {
    color: #1f6feb;
    font-weight: 600;
    text-decoration: none;
}

.back-link:hover {
    text-decoration: underline;
}

.edit-link,
.delete-button {
    background: #172033;
    border: 0;
    border-radius: 6px;
    color: #ffffff;
    cursor: pointer;
    font: inherit;
    font-weight: 600;
    padding: 10px 14px;
    text-decoration: none;
}

.edit-link:hover {
    background: #26324a;
}

.delete-button {
    background: #b42318;
}

.delete-button:hover:not(:disabled) {
    background: #8f1d14;
}

.delete-button:disabled {
    cursor: not-allowed;
    opacity: 0.65;
}

.eyebrow {
    color: #5f6f89;
    font-size: 0.85rem;
    margin: 0 0 4px;
}

h1,
h2 {
    margin: 0;
}

h2 {
    font-size: 1.05rem;
}

.item-summary,
.state-panel {
    background: #ffffff;
    border: 1px solid #d8dee8;
    border-radius: 8px;
    padding: 22px;
}

.state-panel {
    align-items: center;
    color: #5f6f89;
    display: flex;
    justify-content: center;
    min-height: 120px;
    text-align: center;
}

.state-panel.error {
    color: #b42318;
}

.delete-error {
    background: #fff4f2;
    border: 1px solid #f3b4ac;
    border-radius: 6px;
    color: #b42318;
    margin: 0 0 18px;
    padding: 10px 12px;
}

.description {
    color: #30394b;
    margin: 0 0 18px;
    white-space: pre-wrap;
}

.info-list,
.metadata-list {
    display: grid;
    gap: 10px;
    margin: 0;
}

.info-list {
    grid-template-columns: repeat(3, minmax(0, 1fr));
}

.info-list div,
.metadata-list div {
    background: #f8fafc;
    border: 1px solid #e4e9f2;
    border-radius: 6px;
    padding: 10px 12px;
}

dt {
    color: #5f6f89;
    font-size: 0.78rem;
    margin-bottom: 4px;
}

dd {
    margin: 0;
    overflow-wrap: anywhere;
}

.metadata-section {
    display: grid;
    gap: 12px;
    margin-top: 22px;
}

.metadata-list {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
}

@media (max-width: 720px) {
    .header-row {
        align-items: start;
        display: grid;
    }

    .header-actions {
        align-items: stretch;
        display: grid;
    }

    .info-list {
        grid-template-columns: 1fr;
    }
}
</style>
