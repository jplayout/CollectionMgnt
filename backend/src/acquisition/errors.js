export class AcquisitionError extends Error {

    constructor(
        statusCode,
        code,
        message
    ) {

        super(message);
        this.name = 'AcquisitionError';
        this.statusCode = statusCode;
        this.code = code;

    }

}

export function createProviderNotFoundError() {

    return new AcquisitionError(
        404,
        'provider_not_found',
        'Provider not found'
    );

}

export function createProviderUnavailableError() {

    return new AcquisitionError(
        503,
        'provider_unavailable',
        'Provider unavailable'
    );

}

export function createProviderTimeoutError() {

    return new AcquisitionError(
        504,
        'provider_timeout',
        'Provider timeout'
    );

}

export function createProviderError() {

    return new AcquisitionError(
        503,
        'provider_error',
        'Provider lookup failed'
    );

}

