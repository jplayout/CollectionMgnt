export function validateItem(
    plugin,
    payload
) {

    const errors = [];

    if (!payload.title) {

        errors.push(
            'title is required'
        );

    }

    for (
        const field
        of plugin.fields
    ) {

        if (
            field.required &&
            payload.metadata?.[
                field.name
            ] === undefined
        ) {

            errors.push(
                `${field.name} is required`
            );

        }

    }

    return errors;
}