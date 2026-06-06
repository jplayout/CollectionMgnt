<template>
    <article class="item-card">
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
                    <dt>{{ entry.key }}</dt>
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

const props =
    defineProps({
        item: {
            required:
                true,
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
        () => Object
            .entries(
                props.item.metadata ?? {}
            )
            .filter(
                ([, value]) => value !== null &&
                    value !== undefined &&
                    value !== ''
            )
            .slice(
                0,
                3
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
    overflow: hidden;
}

.thumb-frame {
    aspect-ratio: 4 / 3;
    background: #eef2f7;
}

img {
    display: block;
    height: 100%;
    object-fit: cover;
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
    padding: 16px;
}

h2 {
    font-size: 1.1rem;
    margin: 0;
}

.metadata-list {
    display: grid;
    gap: 8px;
    margin: 0;
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
    padding: 9px 12px;
    text-decoration: none;
}
</style>
