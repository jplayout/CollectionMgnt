<template>
    <section class="media-gallery">
        <header class="gallery-header">
            <div>
                <p class="eyebrow">Medias</p>
                <h2>Galerie</h2>
            </div>

            <button
                :disabled="loading"
                type="button"
                @click="loadMedia"
            >
                Actualiser
            </button>
        </header>

        <ImageUploader
            :item-id="itemId"
            @uploaded="handleUploaded"
        />

        <section
            v-if="acquisitionImage"
            class="provider-import"
        >
            <div>
                <p class="eyebrow">Acquisition</p>
                <h3>Couverture proposée</h3>
            </div>

            <button
                :disabled="importingProviderImage"
                type="button"
                @click="importProviderImage"
            >
                {{ importingProviderImage ? 'Import en cours...' : 'Importer la couverture proposée' }}
            </button>
        </section>

        <p
            v-if="error"
            class="error-message"
        >
            {{ error }}
        </p>

        <p
            v-if="actionError"
            class="error-message"
        >
            {{ actionError }}
        </p>

        <div
            v-if="loading"
            class="gallery-state"
        >
            Chargement de la galerie...
        </div>

        <div
            v-else-if="!mediaList.length"
            class="gallery-state"
        >
            Aucune image pour cet item.
        </div>

        <div
            v-else
            class="media-grid"
        >
            <MediaThumbnail
                v-for="media in mediaList"
                :key="media.id"
                :busy="isBusy(media.id)"
                :media="media"
                @delete="handleDelete"
                @set-primary="handleSetPrimary"
            />
        </div>
    </section>
</template>

<script setup>
import {
    onMounted,
    ref,
    watch
} from 'vue';

import {
    ApiError
} from '../../services/api.js';

import {
    deleteMedia,
    getItemMedia,
    setPrimaryMedia
} from '../../services/media-api.js';

import {
    importAcquisitionImage
} from '../../services/acquisition-api.js';

import ImageUploader
from './ImageUploader.vue';

import MediaThumbnail
from './MediaThumbnail.vue';

const props =
    defineProps({
        acquisitionImage: {
            default:
                null,
            type:
                Object
        },
        itemId: {
            required:
                true,
            type: [
                Number,
                String
            ]
        }
    });

const emit =
    defineEmits([
        'acquisition-image-imported'
    ]);

const mediaList =
    ref([]);

const loading =
    ref(false);

const error =
    ref('');

const actionError =
    ref('');

const settingPrimaryId =
    ref(null);

const deletingId =
    ref(null);

const importingProviderImage =
    ref(false);

onMounted(
    loadMedia
);

watch(
    () => props.itemId,
    loadMedia
);

async function loadMedia() {

    loading.value =
        true;

    error.value =
        '';

    try {

        mediaList.value =
            await getItemMedia(
                props.itemId
            );

    } catch (loadError) {

        error.value =
            getMediaErrorMessage(
                loadError,
                'Impossible de charger la galerie'
            );

    } finally {

        loading.value =
            false;

    }

}

async function handleUploaded() {

    actionError.value =
        '';

    await loadMedia();

}

async function handleSetPrimary(
    media
) {

    settingPrimaryId.value =
        media.id;

    actionError.value =
        '';

    try {

        await setPrimaryMedia(
            media.id
        );

        await loadMedia();

    } catch (setPrimaryError) {

        actionError.value =
            getMediaErrorMessage(
                setPrimaryError,
                'Impossible de definir cette image comme principale'
            );

    } finally {

        settingPrimaryId.value =
            null;

    }

}

async function importProviderImage() {

    if (
        !props.acquisitionImage?.imageUrl ||
        importingProviderImage.value
    ) {

        return;

    }

    const confirmed =
        window.confirm(
            'Importer cette couverture dans la galerie de l’item ?'
        );

    if (
        !confirmed
    ) {

        return;

    }

    importingProviderImage.value =
        true;

    actionError.value =
        '';

    try {

        await importAcquisitionImage({
            imageUrl:
                props.acquisitionImage.imageUrl,
            isPrimary:
                mediaList.value.length === 0,
            itemId:
                props.itemId,
            provider:
                props.acquisitionImage.provider,
            source:
                props.acquisitionImage.source
        });

        emit(
            'acquisition-image-imported'
        );

        await loadMedia();

    } catch (importError) {

        actionError.value =
            getMediaErrorMessage(
                importError,
                'Impossible d’importer cette couverture'
            );

    } finally {

        importingProviderImage.value =
            false;

    }

}

async function handleDelete(
    media
) {

    const confirmed =
        window.confirm(
            'Supprimer cette image ?'
        );

    if (
        !confirmed
    ) {

        return;

    }

    deletingId.value =
        media.id;

    actionError.value =
        '';

    try {

        await deleteMedia(
            media.id
        );

        await loadMedia();

    } catch (deleteError) {

        actionError.value =
            getMediaErrorMessage(
                deleteError,
                'Impossible de supprimer cette image'
            );

    } finally {

        deletingId.value =
            null;

    }

}

function isBusy(
    mediaId
) {

    return settingPrimaryId.value === mediaId ||
        deletingId.value === mediaId;

}

function getMediaErrorMessage(
    mediaError,
    fallback
) {

    if (
        mediaError instanceof ApiError
    ) {

        return mediaError.message;

    }

    return fallback;

}
</script>

<style scoped>
.media-gallery {
    background: #ffffff;
    border: 1px solid #d8dee8;
    border-radius: 8px;
    display: grid;
    gap: 20px;
    margin: 0 auto;
    max-width: 1080px;
    padding: 24px;
}

.gallery-header {
    align-items: center;
    display: flex;
    gap: 16px;
    justify-content: space-between;
}

.eyebrow {
    color: #5f6f89;
    font-size: 0.85rem;
    margin: 0 0 4px;
}

h2 {
    margin: 0;
}

.provider-import {
    align-items: center;
    border: 1px solid #d8dee8;
    border-radius: 8px;
    display: flex;
    gap: 16px;
    justify-content: space-between;
    padding: 16px;
}

.provider-import h3 {
    font-size: 1rem;
    margin: 0;
}

.gallery-header button {
    background: #172033;
    border: 0;
    border-radius: 6px;
    color: #ffffff;
    cursor: pointer;
    font: inherit;
    font-weight: 600;
    min-height: 44px;
    padding: 10px 14px;
}

.provider-import button {
    background: #2357a4;
    border: 0;
    border-radius: 6px;
    color: #ffffff;
    cursor: pointer;
    font: inherit;
    font-weight: 600;
    min-height: 44px;
    padding: 10px 14px;
}

button:disabled {
    cursor: wait;
    opacity: 0.65;
}

.error-message {
    color: #b42318;
    margin: 0;
}

.gallery-state {
    align-items: center;
    background: #f5f7fa;
    border: 1px dashed #b8c2d1;
    border-radius: 8px;
    color: #5f6f89;
    display: flex;
    justify-content: center;
    min-height: 120px;
    padding: 20px;
    text-align: center;
}

.media-grid {
    display: grid;
    gap: 16px;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
}

@media (max-width: 639px) {
    .media-gallery {
        padding: 18px;
    }

    .gallery-header {
        align-items: stretch;
        flex-direction: column;
    }

    .provider-import {
        align-items: stretch;
        flex-direction: column;
    }

    .gallery-header button,
    .provider-import button {
        width: 100%;
    }
}
</style>
