import fs from 'fs/promises';
import path from 'path';

import {
    validateManifest,
    validateFields
} from './plugin-validator.js';

export async function loadPlugins(pluginsPath) {

    const plugins = [];

    const entries = await fs.readdir(
        pluginsPath,
        { withFileTypes: true }
    );

    for (const entry of entries) {

        if (!entry.isDirectory()) {
            continue;
        }

        const pluginDir = path.join(
            pluginsPath,
            entry.name
        );

        const manifestPath =
            path.join(pluginDir, 'manifest.json');

        const fieldsPath =
            path.join(pluginDir, 'fields.json');

        const manifest = JSON.parse(
            await fs.readFile(manifestPath, 'utf8')
        );

        const fields = JSON.parse(
            await fs.readFile(fieldsPath, 'utf8')
        );

        validateManifest(manifest);
        validateFields(manifest.id, fields);

        plugins.push({
            ...manifest,
            fields
        });
    }

    return plugins;
}