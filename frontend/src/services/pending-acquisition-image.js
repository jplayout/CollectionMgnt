const pendingImages =
    new Map();

export function setPendingAcquisitionImage(
    itemId,
    image
) {

    if (
        !image?.imageUrl
    ) {

        return;

    }

    pendingImages.set(
        String(itemId),
        image
    );

}

export function getPendingAcquisitionImage(itemId) {

    return pendingImages.get(
        String(itemId)
    ) ?? null;

}

export function clearPendingAcquisitionImage(itemId) {

    pendingImages.delete(
        String(itemId)
    );

}
