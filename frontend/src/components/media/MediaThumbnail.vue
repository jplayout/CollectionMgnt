<template>
    <article class="media-thumbnail">
        <div class="thumb-frame">
            <img
                v-if="thumbUrl"
                alt=""
                :src="thumbUrl"
            >

            <div
                v-else-if="loading"
                class="thumb-state"
            >
                Chargement...
            </div>

            <div
                v-else
                class="thumb-state error"
            >
                Apercu indisponible
            </div>

            <span
                v-if="media.is_primary"
                class="primary-badge"
            >
                Principale
            </span>
        </div>

        <footer class="thumbnail-actions">
            <button
                v-if="!media.is_primary"
                :disabled="busy"
                type="button"
                @click="$emit('set-primary', media)"
            >
                Definir principale
            </button>

            <button
                class="danger"
                :disabled="busy"
                type="button"
                @click="$emit('delete', media)"
            >
                Supprimer
            </button>
        </footer>
    </article>
</template>

<script setup>
import {
    onBeforeUnmount,
    ref,
    watch
} from 'vue';

import {
    getMediaThumbBlob
} from '../../services/media-api.js';

const props =
    defineProps({
        media: {
            required:
                true,
            type:
                Object
        },
        busy: {
            default:
                false,
            type:
                Boolean
        }
    });

defineEmits([
    'set-primary',
    'delete'
]);

const thumbUrl =
    ref('');

const loading =
    ref(false);

let requestId =
    0;

watch(
    () => props.media.id,
    loadThumb,
    {
        immediate:
            true
    }
);

onBeforeUnmount(
    cleanupThumb
);

async function loadThumb() {

    const currentRequestId =
        requestId + 1;

    requestId =
        currentRequestId;

    revokeThumbUrl();

    loading.value =
        true;

    try {

        const blob =
            await getMediaThumbBlob(
                props.media.id
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

            loading.value =
                false;

        }

    }

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

function cleanupThumb() {

    requestId +=
        1;

    revokeThumbUrl();

}
</script>

<style scoped>
.media-thumbnail {
    background: #ffffff;
    border: 1px solid #d8dee8;
    border-radius: 8px;
    display: grid;
    gap: 12px;
    overflow: hidden;
}

.thumb-frame {
    aspect-ratio: 1 / 1;
    background: #eef2f7;
    position: relative;
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
    font-size: 0.9rem;
    height: 100%;
    justify-content: center;
    padding: 16px;
    text-align: center;
}

.thumb-state.error {
    color: #b42318;
}

.primary-badge {
    background: #146c43;
    border-radius: 999px;
    color: #ffffff;
    font-size: 0.78rem;
    font-weight: 700;
    left: 10px;
    padding: 5px 8px;
    position: absolute;
    top: 10px;
}

.thumbnail-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 0 12px 12px;
}

button {
    background: #172033;
    border: 0;
    border-radius: 6px;
    color: #ffffff;
    cursor: pointer;
    flex: 1 1 120px;
    font: inherit;
    font-size: 0.9rem;
    font-weight: 600;
    padding: 9px 10px;
}

button.danger {
    background: #b42318;
}

button:disabled {
    cursor: wait;
    opacity: 0.65;
}
</style>
