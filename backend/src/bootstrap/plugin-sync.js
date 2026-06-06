export async function syncPlugins(
    db,
    pluginService
) {

    const insertPlugin =
        db.prepare(`
            INSERT INTO plugins (
                code,
                display_name,
                version
            )
            VALUES (?, ?, ?)
        `);

    const selectPlugin =
        db.prepare(`
            SELECT *
            FROM plugins
            WHERE code = ?
        `);

    for (
        const plugin
        of pluginService.getAll()
    ) {

        const existing =
            selectPlugin.get(
                plugin.id
            );

        if (!existing) {

            insertPlugin.run(
                plugin.id,
                plugin.name,
                plugin.version
            );

            console.log(
                `Plugin synced: ${plugin.id}`
            );

        }

    }

}