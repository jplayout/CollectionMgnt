const APPLICATION_VERSION =
    'v0.11-lot9.0.4';

export default async function (
    fastify
) {

    fastify.get(
        '/api/admin/system-summary',
        async () => {

            return {
                version:
                    APPLICATION_VERSION,
                counts: {
                    plugins:
                        countRows(
                            fastify.db,
                            'plugins'
                        ),
                    enabledPlugins:
                        countRows(
                            fastify.db,
                            'plugins',
                            'enabled = 1'
                        ),
                    items:
                        countRows(
                            fastify.db,
                            'items'
                        ),
                    media:
                        countRows(
                            fastify.db,
                            'media'
                        )
                }
            };

        }
    );

}

function countRows(
    db,
    tableName,
    whereClause = null
) {

    const sql =
        whereClause
            ? `SELECT COUNT(*) AS count FROM ${tableName} WHERE ${whereClause}`
            : `SELECT COUNT(*) AS count FROM ${tableName}`;

    return db
        .prepare(sql)
        .get()
        .count;

}
