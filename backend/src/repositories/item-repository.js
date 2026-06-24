export class ItemRepository {

    constructor(db) {
        this.db = db;
    }

    create(item) {

        const result = this.db
            .prepare(`
                INSERT INTO items (
                    plugin_id,
                    title,
                    description,
                    metadata
                )
                VALUES (?, ?, ?, ?)
            `)
            .run(
                item.plugin_id,
                item.title,
                item.description ?? null,
                JSON.stringify(
                    item.metadata ?? {}
                )
            );

        return result.lastInsertRowid;
    }

    findById(id) {

        const item =
            this.db
                .prepare(`
                    SELECT
                        items.*,
                        plugins.code AS plugin,
                        plugins.display_name AS plugin_display_name
                    FROM items
                    JOIN plugins
                        ON plugins.id = items.plugin_id
                    WHERE items.id = ?
                `)
                .get(id);

        if (!item) {
            return null;
        }

        item.metadata =
            JSON.parse(
                item.metadata
            );

        return item;
    }

    update(id, data) {

        return this.db
            .prepare(`
                UPDATE items
                SET
                    title = ?,
                    description = ?,
                    metadata = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `)
            .run(
                data.title,
                data.description ?? null,
                JSON.stringify(
                    data.metadata ?? {}
                ),
                id
            );

    }

    findAll(
        filters = {},
        pagination = {},
        sorting = {}
    ) {

        const page =
            pagination.page ?? 1;

        const pageSize =
            pagination.pageSize ?? 24;

        const offset =
            (
                page - 1
            ) * pageSize;

        const orderBySql =
            buildOrderByClause(
                sorting
            );

        const {
            whereSql,
            params
        } =
            buildItemFilterQuery(
                filters
            );

        const totalRow =
            this.db
                .prepare(`
                    SELECT COUNT(*) AS total
                    FROM items
                    ${whereSql}
                `)
                .get(...params);

        const rows =
            this.db
                .prepare(`
                    SELECT *
                    FROM items
                    ${whereSql}
                    ${orderBySql}
                    LIMIT ?
                    OFFSET ?
                `)
                .all(
                    ...params,
                    pageSize,
                    offset
                );

        return {
            items:
                rows.map(
                    row => ({
                        ...row,
                        metadata: JSON.parse(
                            row.metadata
                        )
                    })
                ),
            total:
                totalRow.total
        };

    }

    delete(id) {

        return this.db
            .prepare(`
                DELETE
                FROM items
                WHERE id = ?
            `)
            .run(id);

    }

}

function buildOrderByClause(
    sorting
) {

    const direction =
        sorting.direction === 'ASC'
            ? 'ASC'
            : 'DESC';

    const idDirection =
        direction;

    if (
        sorting.kind === 'system'
    ) {

        return buildSystemOrderByClause(
            sorting.field,
            direction,
            idDirection
        );

    }

    if (
        sorting.kind === 'metadata' &&
        isSafeMetadataFieldName(
            sorting.field
        )
    ) {

        return buildMetadataOrderByClause(
            sorting,
            direction,
            idDirection
        );

    }

    return `
        ORDER BY created_at DESC, id DESC
    `;

}

function buildSystemOrderByClause(
    field,
    direction,
    idDirection
) {

    if (
        field === 'title'
    ) {

        return `
            ORDER BY LOWER(title) ${direction}, id ${idDirection}
        `;

    }

    if (
        field === 'updated_at'
    ) {

        return `
            ORDER BY updated_at ${direction}, id ${idDirection}
        `;

    }

    return `
        ORDER BY created_at ${direction}, id ${idDirection}
    `;

}

function buildMetadataOrderByClause(
    sorting,
    direction,
    idDirection
) {

    if (
        [
            'text',
            'textarea',
            'select'
        ].includes(sorting.type)
    ) {

        return `
            ORDER BY LOWER(CAST(json_extract(
                metadata,
                '$.${sorting.field}'
            ) AS TEXT)) ${direction}, id ${idDirection}
        `;

    }

    if (
        sorting.type === 'number' ||
        sorting.type === 'rating'
    ) {

        return `
            ORDER BY CAST(json_extract(
                metadata,
                '$.${sorting.field}'
            ) AS REAL) ${direction}, id ${idDirection}
        `;

    }

    if (
        sorting.type === 'checkbox'
    ) {

        return `
            ORDER BY json_extract(
                metadata,
                '$.${sorting.field}'
            ) ${direction}, id ${idDirection}
        `;

    }

    return `
        ORDER BY CAST(json_extract(
            metadata,
            '$.${sorting.field}'
        ) AS TEXT) ${direction}, id ${idDirection}
    `;

}

function buildItemFilterQuery(
    filters
) {

    let whereSql = `
        WHERE 1 = 1
    `;

    const params = [];

    if (filters.pluginId) {

        whereSql += `
            AND plugin_id = ?
        `;

        params.push(
            filters.pluginId
        );

    }

    if (filters.title) {

        whereSql += `
            AND LOWER(title) LIKE LOWER(?)
        `;

        params.push(
            `%${filters.title}%`
        );

    }

    if (filters.search) {

        const searchClauses = [];

        const searchParams = [];

        const searchValues =
            filters.searchValues ?? [
                filters.search
            ];

        for (
            const searchValue
            of searchValues
        ) {

            searchClauses.push(
                'LOWER(title) LIKE LOWER(?)',
                'LOWER(description) LIKE LOWER(?)'
            );

            searchParams.push(
                `%${searchValue}%`,
                `%${searchValue}%`
            );

        }

        for (
            const field
            of filters.searchableFields ?? []
        ) {

            if (
                !isSafeMetadataFieldName(
                    field
                )
            ) {

                continue;

            }

            for (
                const searchValue
                of searchValues
            ) {

                searchClauses.push(`
                    LOWER(CAST(json_extract(
                        metadata,
                        '$.${field}'
                    ) AS TEXT)) LIKE LOWER(?)
                `);

                searchParams.push(
                    `%${searchValue}%`
                );

            }

        }

        whereSql += `
            AND (
                ${searchClauses.join(' OR ')}
            )
        `;

        params.push(
            ...searchParams
        );

    }

    if (
        filters.metadataFilters
    ) {

        for (
            const filter
            of filters.metadataFilters
        ) {

            if (
                !isSafeMetadataFieldName(
                    filter.name
                )
            ) {

                continue;

            }

            if (
                isCaseInsensitiveFilterType(
                    filter.type
                )
            ) {

                whereSql += `
                    AND LOWER(CAST(json_extract(
                        metadata,
                        '$.${filter.name}'
                    ) AS TEXT)) = LOWER(?)
                `;

                params.push(
                    filter.value
                );

                continue;

            }

            whereSql += `
                AND json_extract(
                    metadata,
                    '$.${filter.name}'
                ) = ?
            `;

            params.push(
                filter.value
            );

        }

    }

    return {
        whereSql,
        params
    };

}

function isCaseInsensitiveFilterType(
    type
) {

    return [
        'text',
        'textarea',
        'select',
        'isbn',
        'barcode'
    ].includes(type);

}

function isSafeMetadataFieldName(
    fieldName
) {

    return /^[A-Za-z0-9_]+$/.test(
        fieldName
    );

}
