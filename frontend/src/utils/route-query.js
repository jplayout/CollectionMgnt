export function getStringQueryParam(
    value
) {

    if (
        typeof value === 'string'
    ) {

        return value !== ''
            ? value
            : null;

    }

    if (
        Array.isArray(
            value
        )
    ) {

        const firstStringValue =
            value.find(
                entry => typeof entry === 'string' &&
                    entry !== ''
            );

        return firstStringValue ?? null;

    }

    return null;

}

export function isValidReturnTo(
    value
) {

    const returnTo =
        getStringQueryParam(
            value
        );

    if (
        typeof returnTo !== 'string' ||
        !returnTo.startsWith('/collections/') ||
        returnTo.startsWith('//') ||
        returnTo.includes('://') ||
        returnTo.includes('\\')
    ) {

        return false;

    }

    const path =
        returnTo.split(/[?#]/)[0];

    let decodedPath =
        '';

    try {

        decodedPath =
            decodeURIComponent(
                path
            );

    } catch {

        return false;

    }

    // Keep return targets constrained to safe internal collection routes.
    return !decodedPath.includes('\\') && !decodedPath
        .split('/')
        .some(
            segment => segment === '..'
        );

}
