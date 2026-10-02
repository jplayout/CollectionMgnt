import { getBuildInfo } from '../config/build-info.js';

export default async function (
    fastify
) {

    const buildInfo = getBuildInfo();

    fastify.get(
        '/api/admin/system-summary',
        async () => {

            return {
                ...buildInfo,
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
