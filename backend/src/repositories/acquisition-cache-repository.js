export class AcquisitionCacheRepository {

    constructor(db) {
        this.db = db;
    }

    getByKey(cacheKey) {

        return this.db
            .prepare(`
                SELECT
                    cache_key,
                    plugin,
                    capability,
                    identifier,
                    provider_id,
                    mapping_version,
                    status,
                    response_json,
                    created_at,
                    expires_at
                FROM acquisition_cache
                WHERE cache_key = ?
            `)
            .get(cacheKey) ?? null;

    }

    upsert(entry) {

        this.db
            .prepare(`
                INSERT INTO acquisition_cache (
                    cache_key,
                    plugin,
                    capability,
                    identifier,
                    provider_id,
                    mapping_version,
                    status,
                    response_json,
                    created_at,
                    expires_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(cache_key) DO UPDATE SET
                    plugin = excluded.plugin,
                    capability = excluded.capability,
                    identifier = excluded.identifier,
                    provider_id = excluded.provider_id,
                    mapping_version = excluded.mapping_version,
                    status = excluded.status,
                    response_json = excluded.response_json,
                    created_at = excluded.created_at,
                    expires_at = excluded.expires_at
            `)
            .run(
                entry.cacheKey,
                entry.plugin,
                entry.capability,
                entry.identifier,
                entry.providerId,
                entry.mappingVersion,
                entry.status,
                entry.responseJson,
                entry.createdAt,
                entry.expiresAt
            );

    }

    deleteByKey(cacheKey) {

        this.db
            .prepare(`
                DELETE FROM acquisition_cache
                WHERE cache_key = ?
            `)
            .run(cacheKey);

    }

    deleteExpired(nowIso) {

        this.db
            .prepare(`
                DELETE FROM acquisition_cache
                WHERE expires_at <= ?
            `)
            .run(nowIso);

    }

}
