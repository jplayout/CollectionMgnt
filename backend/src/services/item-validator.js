export function validateItem(
    plugin,
    payload
) {

    const errors = [];
    const metadata =
        payload.metadata ?? {};

    if (isEmptyValue(payload.title)) {

        errors.push(
            'title is required'
        );

    }

    if (
        payload.metadata !== undefined &&
        !isPlainObject(payload.metadata)
    ) {

        errors.push(
            'metadata must be an object'
        );

    }

    for (
        const field
        of plugin.fields
    ) {

        const value =
            metadata[
                field.name
            ];

        if (
            field.required &&
            isEmptyValue(value)
        ) {

            errors.push(
                `${field.name} is required`
            );

            continue;

        }

        if (
            isEmptyValue(value)
        ) {

            continue;

        }

        validateField(
            field,
            value,
            errors
        );

    }

    return errors;
}

export function normalizeItemMetadata(
    plugin,
    metadata
) {

    const normalizedMetadata = {
        ...metadata
    };

    for (
        const field
        of plugin.fields
    ) {

        const value =
            normalizedMetadata[
                field.name
            ];

        if (
            isEmptyValue(value)
        ) {

            continue;

        }

        if (
            field.type === 'isbn' ||
            field.type === 'barcode'
        ) {

            normalizedMetadata[
                field.name
            ] =
                normalizeIdentifier(
                    value
                );

        }

    }

    return normalizedMetadata;
}

const DEFAULT_RATING_MIN =
    0;

const DEFAULT_RATING_MAX =
    20;

function validateField(
    field,
    value,
    errors
) {

    switch (field.type) {

        case 'text':
        case 'textarea':
        case 'isbn':
        case 'barcode':
            validateString(
                field,
                value,
                errors
            );

            validateIdentifier(
                field,
                value,
                errors
            );
            break;

        case 'select':
            validateSelect(
                field,
                value,
                errors
            );
            break;

        case 'checkbox':
            validateCheckbox(
                field,
                value,
                errors
            );
            break;

        case 'date':
            validateDate(
                field,
                value,
                errors
            );
            break;

        case 'number':
            validateNumber(
                field,
                value,
                errors
            );
            break;

        case 'rating':
            validateRating(
                field,
                value,
                errors
            );
            break;

        default:
            break;

    }

}

function validateIdentifier(
    field,
    value,
    errors
) {

    if (
        typeof value !== 'string'
    ) {

        return;

    }

    if (
        field.type === 'isbn' &&
        !isValidIsbn(value)
    ) {

        errors.push(
            `${field.name} must be a valid ISBN-10 or ISBN-13`
        );

        return;

    }

    if (
        field.type === 'barcode' &&
        !isValidBarcode(value)
    ) {

        errors.push(
            `${field.name} must be a valid EAN-13 or UPC-A barcode`
        );

    }

}

function normalizeIdentifier(value) {

    return String(value)
        .replaceAll(
            /[\s-]/g,
            ''
        )
        .toUpperCase();

}

function isValidIsbn(value) {

    const normalizedValue =
        normalizeIdentifier(
            value
        );

    if (
        /^[0-9]{9}[0-9X]$/.test(
            normalizedValue
        )
    ) {

        return hasValidIsbn10Checksum(
            normalizedValue
        );

    }

    if (
        /^[0-9]{13}$/.test(
            normalizedValue
        )
    ) {

        return hasValidEan13Checksum(
            normalizedValue
        );

    }

    return false;

}

function isValidBarcode(value) {

    const normalizedValue =
        normalizeIdentifier(
            value
        );

    if (
        /^[0-9]{12}$/.test(
            normalizedValue
        )
    ) {

        return hasValidUpcAChecksum(
            normalizedValue
        );

    }

    if (
        /^[0-9]{13}$/.test(
            normalizedValue
        )
    ) {

        return hasValidEan13Checksum(
            normalizedValue
        );

    }

    return false;

}

function hasValidIsbn10Checksum(value) {

    let sum =
        0;

    for (
        let index = 0;
        index < 10;
        index += 1
    ) {

        const character =
            value[index];

        const digit =
            character === 'X'
                ? 10
                : Number(character);

        sum += digit * (10 - index);

    }

    return sum % 11 === 0;

}

function hasValidEan13Checksum(value) {

    let sum =
        0;

    for (
        let index = 0;
        index < 12;
        index += 1
    ) {

        const digit =
            Number(
                value[index]
            );

        sum += index % 2 === 0
            ? digit
            : digit * 3;

    }

    const checkDigit =
        (10 - (sum % 10)) % 10;

    return checkDigit === Number(value[12]);

}

function hasValidUpcAChecksum(value) {

    let sum =
        0;

    for (
        let index = 0;
        index < 11;
        index += 1
    ) {

        const digit =
            Number(
                value[index]
            );

        sum += index % 2 === 0
            ? digit * 3
            : digit;

    }

    const checkDigit =
        (10 - (sum % 10)) % 10;

    return checkDigit === Number(value[11]);

}

function validateString(
    field,
    value,
    errors
) {

    if (
        typeof value !== 'string'
    ) {

        errors.push(
            `${field.name} must be a string`
        );

        return;

    }

    validatePattern(
        field,
        value,
        errors
    );

}

function validateSelect(
    field,
    value,
    errors
) {

    if (
        typeof value !== 'string' &&
        typeof value !== 'number'
    ) {

        errors.push(
            `${field.name} must be a string or number`
        );

        return;

    }

    validatePattern(
        field,
        String(value),
        errors
    );

    if (
        Array.isArray(field.options)
    ) {

        const allowedValues =
            field.options.map(
                option => getOptionValue(option)
            );

        if (
            !allowedValues.includes(value)
        ) {

            errors.push(
                `${field.name} must be one of allowed values`
            );

        }

    }

}

function validateCheckbox(
    field,
    value,
    errors
) {

    if (
        typeof value !== 'boolean'
    ) {

        errors.push(
            `${field.name} must be a boolean`
        );

    }

}

function validateDate(
    field,
    value,
    errors
) {

    if (
        typeof value !== 'string' ||
        !isValidDate(value)
    ) {

        errors.push(
            `${field.name} must be a valid date`
        );

    }

}

function validateNumber(
    field,
    value,
    errors
) {

    if (
        !isRealNumber(value)
    ) {

        errors.push(
            `${field.name} must be a number`
        );

        return;

    }

    if (
        field.min !== undefined &&
        value < field.min
    ) {

        errors.push(
            `${field.name} must be greater than or equal to ${field.min}`
        );

    }

    if (
        field.max !== undefined &&
        value > field.max
    ) {

        errors.push(
            `${field.name} must be less than or equal to ${field.max}`
        );

    }

}

function validateRating(
    field,
    value,
    errors
) {

    if (
        !isRealNumber(value)
    ) {

        errors.push(
            `${field.name} must be a number`
        );

        return;

    }

    const min =
        field.min ?? DEFAULT_RATING_MIN;

    const max =
        field.max ?? DEFAULT_RATING_MAX;

    if (
        value < min
    ) {

        errors.push(
            `${field.name} must be greater than or equal to ${min}`
        );

    }

    if (
        value > max
    ) {

        errors.push(
            `${field.name} must be less than or equal to ${max}`
        );

    }

}

function validatePattern(
    field,
    value,
    errors
) {

    if (
        field.pattern === undefined
    ) {

        return;

    }

    let regex;

    try {

        regex =
            new RegExp(
                field.pattern
            );

    } catch {

        errors.push(
            `${field.name} has an invalid pattern`
        );

        return;

    }

    if (
        !regex.test(value)
    ) {

        errors.push(
            `${field.name} does not match pattern`
        );

    }

}

function getOptionValue(option) {

    if (
        isPlainObject(option) &&
        option.value !== undefined
    ) {

        return option.value;

    }

    return option;

}

function isEmptyValue(value) {

    return (
        value === undefined ||
        value === null ||
        (
            typeof value === 'string' &&
            value.trim() === ''
        )
    );

}

function isPlainObject(value) {

    return (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        Object.getPrototypeOf(value) === Object.prototype
    );

}

function isRealNumber(value) {

    return (
        typeof value === 'number' &&
        Number.isFinite(value)
    );

}

function isValidDate(value) {

    const match =
        /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

    if (
        !match
    ) {

        return false;

    }

    const year =
        Number(match[1]);

    const month =
        Number(match[2]);

    const day =
        Number(match[3]);

    const date =
        new Date(
            Date.UTC(
                year,
                month - 1,
                day
            )
        );

    return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
    );

}
