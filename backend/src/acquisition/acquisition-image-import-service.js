import dns
from 'dns/promises';

import net
from 'net';

import {
    ALLOWED_MEDIA_MIME_TYPES,
    MAX_MEDIA_SIZE,
    MediaService
} from '../services/media-service.js';

const MAX_REDIRECTS =
    3;

const DOWNLOAD_TIMEOUT_MS =
    5000;

export class AcquisitionImageImportError extends Error {

    constructor(
        statusCode,
        code,
        message
    ) {

        super(message);
        this.name = 'AcquisitionImageImportError';
        this.statusCode = statusCode;
        this.code = code;

    }

}

export class AcquisitionImageImportService {

    constructor({
        db,
        fetchImpl = globalThis.fetch,
        lookupAddress = defaultLookupAddress,
        mediaService = null,
        timeoutMs = DOWNLOAD_TIMEOUT_MS
    }) {

        this.fetchImpl =
            fetchImpl;

        this.lookupAddress =
            lookupAddress;

        this.mediaService =
            mediaService ??
            new MediaService(
                db
            );

        this.timeoutMs =
            timeoutMs;

    }

    async importImage(data) {

        const request =
            validateImportRequest(
                data
            );

        const download =
            await this.downloadImage(
                request.imageUrl
            );

        return this.mediaService.createOriginalMedia({
            buffer:
                download.buffer,
            isPrimary:
                request.isPrimary,
            itemId:
                request.itemId,
            mimeType:
                download.mimeType
        });

    }

    async downloadImage(
        imageUrl,
        redirectCount = 0
    ) {

        const url =
            await this.validateSafeUrl(
                imageUrl
            );

        const request =
            await this.fetchWithTimeout(
                url
            );

        try {

            if (
                isRedirectResponse(
                    request.response
                )
            ) {

                if (
                    redirectCount >= MAX_REDIRECTS
                ) {

                    throw new AcquisitionImageImportError(
                        400,
                        'too_many_redirects',
                        'Too many image redirects'
                    );

                }

                const location =
                    request.response.headers.get(
                        'location'
                    );

                if (
                    !location
                ) {

                    throw new AcquisitionImageImportError(
                        400,
                        'invalid_redirect',
                        'Image redirect is missing a location'
                    );

                }

                const nextUrl =
                    new URL(
                        location,
                        url
                    );

                if (
                    url.protocol === 'https:' &&
                    nextUrl.protocol === 'http:'
                ) {

                    throw new AcquisitionImageImportError(
                        400,
                        'unsafe_redirect',
                        'Image redirect cannot downgrade from HTTPS to HTTP'
                    );

                }

                return this.downloadImage(
                    nextUrl.toString(),
                    redirectCount + 1
                );

            }

            if (
                !request.response.ok
            ) {

                throw new AcquisitionImageImportError(
                    502,
                    'image_download_failed',
                    'Image download failed'
                );

            }

            const mimeType =
                getAllowedMimeType(
                    request.response.headers.get(
                        'content-type'
                    )
                );

            const contentLength =
                Number(
                    request.response.headers.get(
                        'content-length'
                    )
                );

            if (
                Number.isFinite(contentLength) &&
                contentLength > MAX_MEDIA_SIZE
            ) {

                throw new AcquisitionImageImportError(
                    413,
                    'image_too_large',
                    'Image is too large'
                );

            }

            const buffer =
                await readLimitedResponseBody(
                    request.response
                );

            return {
                buffer,
                mimeType
            };

        } catch (error) {

            if (
                error?.name === 'AbortError'
            ) {

                throw new AcquisitionImageImportError(
                    504,
                    'image_download_timeout',
                    'Image download timed out'
                );

            }

            throw error;

        } finally {

            request.clearTimeout();

        }

    }

    async fetchWithTimeout(url) {

        const controller =
            new AbortController();

        const timeout =
            setTimeout(
                () => controller.abort(),
                this.timeoutMs
            );

        try {

            const response =
                await this.fetchImpl(
                url.toString(),
                {
                    redirect:
                        'manual',
                    signal:
                        controller.signal
                }
            );

            return {
                clearTimeout:
                    () => clearTimeout(
                        timeout
                    ),
                response
            };

        } catch (error) {

            clearTimeout(
                timeout
            );

            if (
                error?.name === 'AbortError'
            ) {

                throw new AcquisitionImageImportError(
                    504,
                    'image_download_timeout',
                    'Image download timed out'
                );

            }

            throw new AcquisitionImageImportError(
                502,
                'image_download_failed',
                'Image download failed'
            );

        }

    }

    async validateSafeUrl(imageUrl) {

        let url;

        try {

            url =
                new URL(
                    imageUrl
                );

        } catch {

            throw new AcquisitionImageImportError(
                400,
                'invalid_image_url',
                'imageUrl must be a valid URL'
            );

        }

        if (
            url.protocol !== 'https:'
        ) {

            throw new AcquisitionImageImportError(
                400,
                'unsafe_image_url',
                'imageUrl must use HTTPS'
            );

        }

        const hostname =
            normalizeHostname(
                url.hostname
            );

        if (
            isLocalHostname(
                hostname
            )
        ) {

            throwUnsafeUrlError();

        }

        const addresses =
            await this.resolveAddresses(
                hostname
            );

        if (
            addresses.length === 0 ||
            addresses.some(
                address => isUnsafeIpAddress(
                    address
                )
            )
        ) {

            throwUnsafeUrlError();

        }

        return url;

    }

    async resolveAddresses(hostname) {

        const ipVersion =
            net.isIP(
                hostname
            );

        if (
            ipVersion
        ) {

            return [
                hostname
            ];

        }

        try {

            const records =
                await this.lookupAddress(
                    hostname
                );

            return records.map(
                record => record.address
            );

        } catch {

            throw new AcquisitionImageImportError(
                400,
                'invalid_image_url',
                'imageUrl host cannot be resolved'
            );

        }

    }

}

function validateImportRequest(data) {

    const itemId =
        Number(
            data?.itemId
        );

    if (
        !Number.isInteger(itemId) ||
        itemId <= 0
    ) {

        throw new AcquisitionImageImportError(
            400,
            'invalid_item_id',
            'itemId is required'
        );

    }

    if (
        typeof data?.imageUrl !== 'string' ||
        data.imageUrl.trim() === ''
    ) {

        throw new AcquisitionImageImportError(
            400,
            'invalid_image_url',
            'imageUrl is required'
        );

    }

    return {
        imageUrl:
            data.imageUrl.trim(),
        isPrimary:
            Boolean(
                data?.isPrimary
            ),
        itemId
    };

}

async function defaultLookupAddress(hostname) {

    return dns.lookup(
        hostname,
        {
            all:
                true,
            verbatim:
                true
        }
    );

}

function isRedirectResponse(response) {

    return [
        301,
        302,
        303,
        307,
        308
    ].includes(
        response.status
    );

}

function getAllowedMimeType(contentType) {

    const mimeType =
        String(
            contentType ?? ''
        )
            .split(';')[0]
            .trim()
            .toLowerCase();

    if (
        !ALLOWED_MEDIA_MIME_TYPES.has(
            mimeType
        )
    ) {

        throw new AcquisitionImageImportError(
            400,
            'unsupported_image_type',
            'Unsupported image content type'
        );

    }

    return mimeType;

}

async function readLimitedResponseBody(response) {

    if (
        !response.body
    ) {

        throw new AcquisitionImageImportError(
            400,
            'invalid_image',
            'Image response is empty'
        );

    }

    const reader =
        response.body.getReader();

    const chunks =
        [];

    let size =
        0;

    while (
        true
    ) {

        const {
            done,
            value
        } =
            await reader.read();

        if (
            done
        ) {

            break;

        }

        const chunk =
            Buffer.from(
                value
            );

        size +=
            chunk.length;

        if (
            size > MAX_MEDIA_SIZE
        ) {

            throw new AcquisitionImageImportError(
                413,
                'image_too_large',
                'Image is too large'
            );

        }

        chunks.push(
            chunk
        );

    }

    return Buffer.concat(
        chunks
    );

}

function isLocalHostname(hostname) {

    const normalized =
        hostname.toLowerCase();

    return normalized === 'localhost' ||
        normalized.endsWith(
            '.localhost'
        );

}

function normalizeHostname(hostname) {

    if (
        hostname.startsWith('[') &&
        hostname.endsWith(']')
    ) {

        return hostname.slice(
            1,
            -1
        );

    }

    return hostname;

}

function isUnsafeIpAddress(address) {

    const normalized =
        normalizeIpAddress(
            address
        );

    const version =
        net.isIP(
            normalized
        );

    if (
        version === 4
    ) {

        return isUnsafeIpv4(
            normalized
        );

    }

    if (
        version === 6
    ) {

        return isUnsafeIpv6(
            normalized
        );

    }

    return true;

}

function normalizeIpAddress(address) {

    if (
        address.toLowerCase().startsWith(
            '::ffff:'
        )
    ) {

        return address.slice(
            7
        );

    }

    return address;

}

function isUnsafeIpv4(address) {

    const parts =
        address
            .split('.')
            .map(
                part => Number(
                    part
                )
            );

    const [
        first,
        second
    ] =
        parts;

    return first === 0 ||
        first === 10 ||
        first === 127 ||
        first === 169 && second === 254 ||
        first === 172 && second >= 16 && second <= 31 ||
        first === 192 && second === 168 ||
        first >= 224;

}

function isUnsafeIpv6(address) {

    const normalized =
        address.toLowerCase();

    return normalized === '::1' ||
        normalized === '::' ||
        normalized.startsWith(
            '::ffff:'
        ) ||
        normalized.startsWith(
            'fc'
        ) ||
        normalized.startsWith(
            'fd'
        ) ||
        normalized.startsWith(
            'fe8'
        ) ||
        normalized.startsWith(
            'fe9'
        ) ||
        normalized.startsWith(
            'fea'
        ) ||
        normalized.startsWith(
            'feb'
        ) ||
        normalized.startsWith(
            'ff'
        );

}

function throwUnsafeUrlError() {

    throw new AcquisitionImageImportError(
        400,
        'unsafe_image_url',
        'imageUrl points to an unsafe host'
    );

}
