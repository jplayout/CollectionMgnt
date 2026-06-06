import {
    apiFetch
} from './api.js';

export function getItemMedia(
    itemId
) {

    return apiFetch(
        `/api/items/${itemId}/media`
    );

}

export function uploadMedia({
    itemId,
    file,
    isPrimary = false
}) {

    const formData =
        new FormData();

    formData.append(
        'item_id',
        String(itemId)
    );

    formData.append(
        'file',
        file
    );

    if (
        isPrimary
    ) {

        formData.append(
            'is_primary',
            'true'
        );

    }

    return apiFetch(
        '/api/media',
        {
            method:
                'POST',
            body:
                formData
        }
    );

}

export function setPrimaryMedia(
    mediaId
) {

    return apiFetch(
        `/api/media/${mediaId}/primary`,
        {
            method:
                'PATCH'
        }
    );

}

export function deleteMedia(
    mediaId
) {

    return apiFetch(
        `/api/media/${mediaId}`,
        {
            method:
                'DELETE'
        }
    );

}

export function getMediaThumbBlob(
    mediaId
) {

    return apiFetch(
        `/api/media/${mediaId}/thumb`,
        {
            responseType:
                'blob'
        }
    );

}
