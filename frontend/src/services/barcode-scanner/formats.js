export const MVP_BARCODE_FORMATS =
    Object.freeze([
        'ean_13',
        'upc_a'
    ]);

const nativeFormatMap =
    new Map([
        [
            'ean_13',
            'ean_13'
        ],
        [
            'ean-13',
            'ean_13'
        ],
        [
            'upc_a',
            'upc_a'
        ],
        [
            'upc-a',
            'upc_a'
        ]
    ]);

export function normalizeBarcodeFormat(format) {

    return nativeFormatMap.get(
        String(format ?? '')
            .toLowerCase()
    ) ?? null;

}

export function isMvpBarcodeFormat(format) {

    return MVP_BARCODE_FORMATS.includes(
        normalizeBarcodeFormat(
            format
        )
    );

}

export function normalizeBarcodeResult({
    adapter,
    format,
    rawValue
}) {

    const normalizedFormat =
        normalizeBarcodeFormat(
            format
        );

    if (
        !normalizedFormat ||
        !rawValue
    ) {

        return null;

    }

    return {
        adapter,
        format:
            normalizedFormat,
        rawValue:
            String(rawValue)
    };

}
