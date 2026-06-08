<template>
    <article
        class="item-card"
        :class="{ compact: isCompact }"
    >
        <div class="thumb-frame">
            <img
                v-if="thumbUrl"
                alt=""
                :src="thumbUrl"
            >

            <div
                v-else-if="loadingThumb"
                class="thumb-state"
            >
                Chargement...
            </div>

            <div
                v-else
                class="thumb-state"
            >
                Aucune image
            </div>
        </div>

        <div class="item-body">
            <h2>{{ item.title }}</h2>

            <dl
                v-if="metadataEntries.length"
                class="metadata-list"
            >
                <div
                    v-for="entry in metadataEntries"
                    :key="entry.key"
                >
                    <dt>{{ entry.label }}</dt>
                    <dd>{{ entry.value }}</dd>
                </div>
            </dl>

            <RouterLink
                class="open-link"
                :to="{ name: 'item-details', params: { id: item.id } }"
            >
                Ouvrir
            </RouterLink>
        </div>
    </article>
</template>

<script setup>
import {
    computed,
    onBeforeUnmount,
    ref,
    watch
} from 'vue';

import {
    getItemMedia,
    getMediaThumbBlob
} from '../../services/media-api.js';

import {
    formatMetadataValue,
    isEmptyMetadataValue
} from '../../utils/metadata-formatters.js';

const props =
    defineProps({
        item: {
            required:
                true,
            type:
                Object
        },
        fields: {
            default:
                () => [],
            type:
                Array
        },
        displayPreferences: {
            default:
                null,
            type:
                Object
        }
    });

const thumbUrl =
    ref('');

const loadingThumb =
    ref(false);

let requestId =
    0;

const metadataEntries =
    computed(
        () => canUseDisplayPreferences.value
            ? getPreferredMetadataEntries()
            : getFallbackMetadataEntries()
    );

const isCompact =
    computed(
        () => props.displayPreferences?.list?.density === 'compact'
    );

const canUseDisplayPreferences =
    computed(
        () => props.fields.length > 0 &&
            Array.isArray(
                props.displayPreferences?.list?.highlightedFields
            )
    );

watch(
    () => props.item.id,
    loadPrimaryThumb,
    {
        immediate:
            true
    }
);

onBeforeUnmount(
    cleanupThumb
);

async function loadPrimaryThumb() {

    const currentRequestId =
        requestId + 1;

    requestId =
        currentRequestId;

    revokeThumbUrl();

    loadingThumb.value =
        true;

    try {

        const mediaList =
            await getItemMedia(
                props.item.id
            );

        const primaryMedia =
            mediaList.find(
                media => media.is_primary
            ) ?? mediaList[0];

        if (
            !primaryMedia
        ) {

            return;

        }

        const blob =
            await getMediaThumbBlob(
                primaryMedia.id
            );

        if (
            requestId !== currentRequestId
        ) {

            return;

        }

        thumbUrl.value =
            URL.createObjectURL(
                blob
            );

    } catch {

        if (
            requestId === currentRequestId
        ) {

            thumbUrl.value =
                '';

        }

    } finally {

        if (
            requestId === currentRequestId
        ) {

            loadingThumb.value =
                false;

        }

    }

}

function getPreferredMetadataEntries() {

    const fieldsByName =
        new Map(
            props.fields.map(
                field => [
                    field.name,
                    field
                ]
            )
        );

    return props.displayPreferences.list.highlightedFields
        .map(
            fieldName => {

                const field =
                    fieldsByName.get(
                        fieldName
                    );

                if (!field) {
                    return null;
                }

                const value =
                    props.item.metadata?.[field.name];

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
        );

}

function getFallbackMetadataEntries() {

    return Object
        .entries(
            props.item.metadata ?? {}
        )
        .filter(
            ([, value]) => !isEmptyMetadataValue(value)
        )
        .slice(
            0,
            3
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

function cleanupThumb() {

    requestId +=
        1;

    revokeThumbUrl();

}

function revokeThumbUrl() {

    if (
        thumbUrl.value
    ) {

        URL.revokeObjectURL(
            thumbUrl.value
        );

        thumbUrl.value =
            '';

    }

}
</script>

<style scoped>
.item-card {
    background: #ffffff;
    border: 1px solid #d8dee8;
    border-radius: 8px;
    display: grid;
    grid-template-rows: auto 1fr;
    min-height: 0;
    overflow: visible;
}

.thumb-frame {
    aspect-ratio: 4 / 3;
    background: #eef2f7;
    border-radius: 8px 8px 0 0;
    overflow: hidden;
}

img {
    display: block;
    height: 100%;
    object-fit: contain;
    object-position: center center;
    width: 100%;
}

.thumb-state {
    align-items: center;
    color: #5f6f89;
    display: flex;
    height: 100%;
    justify-content: center;
    padding: 18px;
    text-align: center;
}

.item-body {
    display: grid;
    gap: 14px;
    grid-template-rows: auto auto auto;
    min-height: 0;
    padding: 16px;
}

.item-card.compact .item-body {
    gap: 10px;
    padding: 12px;
}

.item-card.compact .thumb-frame {
    aspect-ratio: 16 / 9;
}

h2 {
    font-size: 1.1rem;
    margin: 0;
}

.metadata-list {
    display: grid;
    gap: 8px;
    margin: 0;
    min-height: 0;
}

.item-card.compact .metadata-list {
    gap: 6px;
}

.metadata-list div {
    display: grid;
    gap: 2px;
}

dt {
    color: #5f6f89;
    font-size: 0.78rem;
}

dd {
    margin: 0;
    overflow-wrap: anywhere;
}

.open-link {
    background: #172033;
    border-radius: 6px;
    color: #ffffff;
    font-weight: 700;
    justify-self: start;
    margin-top: 2px;
    padding: 9px 12px;
    text-decoration: none;
}
</style>
