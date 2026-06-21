<template>
    <form
        class="image-uploader"
        @submit.prevent="submit"
    >
        <div class="field-row">
            <label>
                Image
                <input
                    ref="fileInput"
                    accept="image/jpeg,image/png,image/webp"
                    :disabled="uploading"
                    required
                    type="file"
                    @change="selectFile"
                >
            </label>

            <label class="primary-option">
                <input
                    v-model="isPrimary"
                    :disabled="uploading"
                    type="checkbox"
                >
                Image principale
            </label>
        </div>

        <p
            v-if="error"
            class="error-message"
        >
            {{ error }}
        </p>

        <button
            :disabled="uploading || !file"
            type="submit"
        >
            {{ uploading ? 'Upload en cours...' : 'Ajouter image' }}
        </button>
    </form>
</template>

<script setup>
import {
    ref
} from 'vue';

import {
    ApiError
} from '../../services/api.js';

import {
    uploadMedia
} from '../../services/media-api.js';

const props =
    defineProps({
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
        'uploaded'
    ]);

const fileInput =
    ref(null);

const file =
    ref(null);

const isPrimary =
    ref(false);

const uploading =
    ref(false);

const error =
    ref('');

function selectFile(
    event
) {

    error.value =
        '';

    file.value =
        event.target.files?.[0] ?? null;

}

async function submit() {

    if (
        !file.value
    ) {

        return;

    }

    uploading.value =
        true;

    error.value =
        '';

    try {

        await uploadMedia({
            itemId:
                props.itemId,
            file:
                file.value,
            isPrimary:
                isPrimary.value
        });

        file.value =
            null;

        isPrimary.value =
            false;

        if (
            fileInput.value
        ) {

            fileInput.value.value =
                '';

        }

        emit(
            'uploaded'
        );

    } catch (uploadError) {

        error.value =
            getUploadErrorMessage(
                uploadError
            );

    } finally {

        uploading.value =
            false;

    }

}

function getUploadErrorMessage(
    uploadError
) {

    if (
        uploadError instanceof ApiError
    ) {

        return uploadError.message;

    }

    return 'Upload impossible';

}
</script>

<style scoped>
.image-uploader {
    border: 1px solid #d8dee8;
    border-radius: 8px;
    display: grid;
    gap: 14px;
    padding: 18px;
}

.field-row {
    align-items: end;
    display: grid;
    gap: 14px;
    grid-template-columns: minmax(0, 1fr) auto;
}

label {
    color: #30394b;
    display: grid;
    font-size: 0.9rem;
    gap: 6px;
}

input[type="file"] {
    border: 1px solid #b8c2d1;
    border-radius: 6px;
    font: inherit;
    min-height: 44px;
    padding: 8px;
}

.primary-option {
    align-items: center;
    display: flex;
    gap: 8px;
    min-height: 44px;
}

button {
    background: #1f6feb;
    border: 0;
    border-radius: 6px;
    color: #ffffff;
    cursor: pointer;
    font: inherit;
    font-weight: 600;
    justify-self: start;
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

@media (max-width: 639px) {
    .field-row {
        grid-template-columns: 1fr;
    }

    button {
        justify-self: stretch;
        width: 100%;
    }
}
</style>
