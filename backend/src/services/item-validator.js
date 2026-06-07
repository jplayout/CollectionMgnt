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
            validateString(
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
