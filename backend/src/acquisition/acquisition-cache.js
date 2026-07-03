const DEFAULT_MAPPING_VERSION =
    1;

const DEFAULT_MAX_RESPONSE_JSON_BYTES =
    100 * 1024;

const SUCCESS_TTL_MS =
    7 * 24 * 60 * 60 * 1000;

const EMPTY_TTL_MS =
    24 * 60 * 60 * 1000;

export class AcquisitionCache {

    constructor({
        mappingVersion = DEFAULT_MAPPING_VERSION,
        maxResponseJsonBytes = DEFAULT_MAX_RESPONSE_JSON_BYTES,
        now = () => new Date(),
        repository
    }) {

        this.mappingVersion =
            mappingVersion;

        this.maxResponseJsonBytes =
            maxResponseJsonBytes;

        this.now =
            now;

        this.repository =
            repository;

    }

    buildKey({
        capability,
        identifier,
        plugin,
        providerId
    }) {

        return [
            plugin,
            capability,
            providerId,
            `mapping_v${this.mappingVersion}`,
            identifier
        ].join(':');

    }

    get({
        capability,
        identifier,
        plugin,
        providerId
    }) {

        const cacheKey =
            this.buildKey({
                capability,
                identifier,
                plugin,
                providerId
            });

        const row =
            this.repository.getByKey(
                cacheKey
            );

        if (
            !row
        ) {

            return null;

        }

        if (
            isExpired(
                row.expires_at,
                this.now()
            )
        ) {

            this.repository.deleteByKey(
                cacheKey
            );

            return null;

        }

        try {

            return JSON.parse(
                row.response_json
            );

        } catch {

            this.repository.deleteByKey(
                cacheKey
            );

            return null;

        }

    }

    set({
        capability,
        identifier,
        plugin,
        providerId,
        response
    }) {

        const status =
            Array.isArray(
                response.results
            ) &&
            response.results.length > 0
                ? 'success'
                : 'empty';

        const responseJson =
            JSON.stringify(
                response
            );

        if (
            Buffer.byteLength(
                responseJson,
                'utf8'
            ) > this.maxResponseJsonBytes
        ) {

            return false;

        }

        const now =
            this.now();

        const expiresAt =
            new Date(
                now.getTime() +
                getTtlMs(
                    status
                )
            );

        this.repository.upsert({
            cacheKey:
                this.buildKey({
                    capability,
                    identifier,
                    plugin,
                    providerId
                }),
            capability,
            createdAt:
                now.toISOString(),
            expiresAt:
                expiresAt.toISOString(),
            identifier,
            mappingVersion:
                this.mappingVersion,
            plugin,
            providerId,
            responseJson,
            status
        });

        return true;

    }

    deleteExpired() {

        this.repository.deleteExpired(
            this.now().toISOString()
        );

    }

}

function getTtlMs(status) {

    return status === 'success'
        ? SUCCESS_TTL_MS
        : EMPTY_TTL_MS;

}

function isExpired(
    expiresAt,
    now
) {

    const expiresAtMs =
        Date.parse(
            expiresAt
        );

    return !Number.isFinite(
        expiresAtMs
    ) ||
        expiresAtMs <= now.getTime();

}
