export function isEmptyMetadataValue(value) {

    if (
        value === null ||
        value === undefined ||
        value === ''
    ) {

        return true;

    }

    return Array.isArray(value) &&
        value.length === 0;

}

export function formatMetadataValue(
    field,
    value
) {

    if (
        field?.type === 'checkbox' ||
        typeof value === 'boolean'
    ) {

        return value ? 'Oui' : 'Non';

    }

    if (
        field?.type === 'date'
    ) {

        return formatMetadataDate(
            value
        );

    }

    if (
        field?.type === 'rating'
    ) {

        return `${value} / ${field.max ?? 20}`;

    }

    if (
        field?.type === 'select'
    ) {

        return getOptionLabel(
            field,
            value
        );

    }

    if (
        Array.isArray(value)
    ) {

        return value.join(
            ', '
        );

    }

    if (
        value !== null &&
        typeof value === 'object'
    ) {

        try {

            return JSON.stringify(
                value
            );

        } catch {

            return String(
                value
            );

        }

    }

    return String(
        value
    );

}

export function getOptionLabel(
    field,
    value
) {

    const option =
        normalizedOptions(
            field
        ).find(
            candidate => String(candidate.value) === String(value)
        );

    return option?.label ?? String(value);

}

export function normalizedOptions(field) {

    if (
        !Array.isArray(field?.options)
    ) {

        return [];

    }

    return field.options.map(
        option => {

            if (
                option !== null &&
                typeof option === 'object' &&
                option.value !== undefined
            ) {

                return {
                    label:
                        option.label ?? String(option.value),
                    value:
                        option.value
                };

            }

            return {
                label:
                    String(option),
                value:
                    option
            };

        }
    );

}

export function formatMetadataDate(value) {

    if (
        !value
    ) {

        return 'Non renseigné';

    }

    return new Intl.DateTimeFormat(
        'fr-FR',
        {
            dateStyle:
                'medium'
        }
    ).format(
        new Date(value)
    );

}
