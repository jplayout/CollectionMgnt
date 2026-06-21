<template>
    <main class="item-details-page">
        <header class="item-header">
            <BreadcrumbTrail :items="breadcrumbItems" />

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
                        :to="editTarget"
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

                <section class="details-section">
                    <h2>Description</h2>

                    <p
                        class="description"
                        :class="{ muted: !hasDescription }"
                    >
                        {{ hasDescription ? item.description : 'Aucune description.' }}
                    </p>
                </section>

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
                    v-if="knownMetadataEntries.length"
                    class="details-section"
                >
                    <h2>Informations</h2>

                    <dl class="metadata-list">
                        <div
                            v-for="entry in knownMetadataEntries"
                            :key="entry.key"
                        >
                            <dt>{{ entry.label }}</dt>
                            <dd>{{ entry.value }}</dd>
                        </div>
                    </dl>
                </section>

                <section
                    v-if="unknownMetadataEntries.length"
                    class="details-section"
                >
                    <h2>Autres informations</h2>

                    <dl class="metadata-list">
                        <div
                            v-for="entry in unknownMetadataEntries"
                            :key="entry.key"
                        >
                            <dt>{{ entry.label }}</dt>
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

import BreadcrumbTrail
from '../components/navigation/BreadcrumbTrail.vue';

import {
    ApiError
} from '../services/api.js';

import {
    deleteItem,
    getItem
} from '../services/item-api.js';

import {
    getDisplayPreferences,
    getPluginSchema
} from '../services/plugin-api.js';

import {
    formatMetadataValue,
    isEmptyMetadataValue
} from '../utils/metadata-formatters.js';

import {
    getStringQueryParam,
    isValidReturnTo
} from '../utils/route-query.js';

const route =
    useRoute();

const router =
    useRouter();

const item =
    ref(null);

const schema =
    ref(null);

const displayPreferences =
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
            schema.value?.plugin?.name ??
            item.value?.plugin ??
            'Collection'
    );

const validReturnTo =
    computed(
        () => {

            const returnTo =
                getStringQueryParam(
                    route.query.returnTo
                );

            return isValidReturnTo(
                returnTo
            )
                ? returnTo
                : '';

        }
    );

const collectionBreadcrumbTarget =
    computed(
        () => {

            if (
                validReturnTo.value
            ) {

                return validReturnTo.value;

            }

            if (
                item.value?.plugin
            ) {

                return {
                    name:
                        'collection-items',
                    params: {
                        pluginId:
                            item.value.plugin
                    }
                };

            }

            return {
                name:
                    'collections'
            };

        }
    );

const editTarget =
    computed(
        () => {

            const target = {
                name:
                    'item-edit',
                params: {
                    id:
                        itemId.value
                }
            };

            if (
                validReturnTo.value
            ) {

                target.query = {
                    returnTo:
                        validReturnTo.value
                };

            }

            return target;

        }
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
                    pluginLabel.value,
                to:
                    collectionBreadcrumbTarget.value
            },
            {
                label:
                    itemTitle.value
            }
        ]
    );

const schemaFields =
    computed(
        () => schema.value?.fields ?? []
    );

const visibleSchemaFields =
    computed(
        () => {

            const hiddenFields =
                new Set(
                    displayPreferences.value?.details?.hiddenFields ?? []
                );

            return orderedSchemaFields.value.filter(
                field => !hiddenFields.has(
                    field.name
                )
            );

        }
    );

const orderedSchemaFields =
    computed(
        () => {

            const fieldsByName =
                new Map(
                    schemaFields.value.map(
                        field => [
                            field.name,
                            field
                        ]
                    )
                );

            const orderedFields = [];

            for (
                const fieldName
                of displayPreferences.value?.details?.fieldOrder ?? []
            ) {

                const field =
                    fieldsByName.get(
                        fieldName
                    );

                if (
                    !field
                ) {

                    continue;

                }

                orderedFields.push(
                    field
                );

                fieldsByName.delete(
                    fieldName
                );

            }

            return [
                ...orderedFields,
                ...fieldsByName.values()
            ];

        }
    );

const hasDescription =
    computed(
        () => !isEmptyMetadataValue(
            item.value?.description
        )
    );

const knownMetadataEntries =
    computed(
        () => visibleSchemaFields.value
            .map(
                field => {

                    const value =
                        item.value?.metadata?.[field.name];

                    if (
                        isEmptyMetadataValue(
                            value
                        )
                    ) {

                        return null;

                    }

                    return {
                        key:
                            field.name,
                        label:
                            field.label ?? field.name,
                        value:
                            formatMetadataValue(
                                field,
                                value
                            )
                    };

                }
            )
            .filter(
                entry => entry !== null
            )
    );

const unknownMetadataEntries =
    computed(
        () => {

            const knownFieldNames =
                new Set(
                    schemaFields.value.map(
                        field => field.name
                    )
                );

            return Object
                .entries(
                    item.value?.metadata ?? {}
                )
                .filter(
                    ([key, value]) => !knownFieldNames.has(key) &&
                        !isEmptyMetadataValue(value)
                )
                .map(
                    ([key, value]) => ({
                        key,
                        label:
                            key,
                        value:
                            formatMetadataValue(
                                null,
                                value
                            )
                    })
                );

        }
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

    item.value =
        null;

    schema.value =
        null;

    displayPreferences.value =
        null;

    try {

        const loadedItem =
            await getItem(
                itemId.value
            );

        item.value =
            loadedItem;

        if (
            loadedItem.plugin
        ) {

            await Promise.all([
                loadSchema(
                    loadedItem.plugin
                ),
                loadDisplayPreferences(
                    loadedItem.plugin
                )
            ]);

        }

    } catch (loadError) {

        item.value =
            null;

        schema.value =
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

async function loadSchema(
    pluginId
) {

    try {

        schema.value =
            await getPluginSchema(
                pluginId
            );

    } catch {

        schema.value =
            null;

    }

}

async function loadDisplayPreferences(
    pluginId
) {

    try {

        displayPreferences.value =
            await getDisplayPreferences(
                pluginId
            );

    } catch {

        displayPreferences.value =
            null;

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
            validReturnTo.value
        ) {

            await router.push(
                addDeletedMessageToReturnTo(
                    validReturnTo.value
                )
            );

            return;

        }

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

function addDeletedMessageToReturnTo(
    returnTo
) {

    const url =
        new URL(
            returnTo,
            window.location.origin
        );

    url.searchParams.set(
        'deleted',
        '1'
    );

    return `${url.pathname}${url.search}${url.hash}`;

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

.header-row > div:first-child {
    min-width: 0;
}

.header-actions {
    align-items: center;
    flex-shrink: 0;
    display: flex;
    gap: 10px;
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

h1 {
    overflow-wrap: anywhere;
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

.details-section {
    display: grid;
    gap: 12px;
    margin-bottom: 22px;
}

.description {
    color: #30394b;
    line-height: 1.6;
    margin: 0;
    white-space: pre-wrap;
}

.description.muted {
    color: #5f6f89;
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

.metadata-list {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
}

@media (max-width: 899px) {
    .header-row {
        align-items: start;
        display: grid;
    }
}

@media (max-width: 639px) {
    .item-summary,
    .state-panel {
        padding: 18px;
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
