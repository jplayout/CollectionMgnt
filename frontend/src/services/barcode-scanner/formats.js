export const MVP_BARCODE_FORMATS =
    Object.freeze([
        'ean_13',
        'upc_a'
    ]);

export const SCAN_MODE_BARCODE =
    'barcode';

export const SCAN_MODE_ISBN =
    'isbn';

const ISBN_BARCODE_FORMATS =
    Object.freeze([
        'ean_13'
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

export function normalizeScanMode(mode) {

    return mode === SCAN_MODE_ISBN
        ? SCAN_MODE_ISBN
        : SCAN_MODE_BARCODE;

}

export function getBarcodeFormatsForMode(mode) {

    return normalizeScanMode(
        mode
    ) === SCAN_MODE_ISBN
        ? ISBN_BARCODE_FORMATS
        : MVP_BARCODE_FORMATS;

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

export function selectBarcodeResult(
    candidates,
    mode =
        SCAN_MODE_BARCODE
) {

    const normalizedMode =
        normalizeScanMode(
            mode
        );

    for (
        const candidate
        of candidates ?? []
    ) {

        const result =
            normalizeBarcodeResult(
                candidate
            );

        if (
            !result
        ) {

            continue;

        }

        if (
            normalizedMode === SCAN_MODE_ISBN &&
            !isValidBooklandIsbn13(
                result
            )
        ) {

            continue;

        }

        return result;

    }

    return null;

}

export function isValidBooklandIsbn13(result) {

    return result.format === 'ean_13' &&
        isValidIsbn13Checksum(
            result.rawValue
        );

}

export function isValidIsbn13Checksum(value) {

    const digits =
        String(value ?? '')
            .replaceAll(
                /\D/g,
                ''
            );

    if (
        !/^(978|979)\d{10}$/.test(
            digits
        )
    ) {

        return false;

    }

    const sum =
        digits
            .slice(
                0,
                12
            )
            .split('')
            .reduce(
                (total, digit, index) => total +
                    Number(digit) *
                        (index % 2 === 0 ? 1 : 3),
                0
            );

    const checkDigit =
        (10 - sum % 10) % 10;

    return checkDigit === Number(
        digits[12]
    );

}
