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
            // pluginsPath is operator configuration; child directories are non-symlink Dirents.
            // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
            pluginsPath,
            // entry.name is a filesystem basename from readdir, not request data.
            // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
            entry.name
        );

        const manifestPath =
            // pluginDir is a non-symlink child of configured pluginsPath; manifest is a fixed filename.
            // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
            path.join(pluginDir, 'manifest.json');

        const fieldsPath =
            // pluginDir is a non-symlink child of configured pluginsPath; fields is a fixed filename.
            // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
            path.join(pluginDir, 'fields.json');

        // A directory Dirent already excludes linked plugin directories; reject linked files too.
        for (const file of [manifestPath, fieldsPath]) {
            if (!(await fs.lstat(file)).isFile()) {
                throw new Error('Plugin definitions must be regular files, not symbolic links');
            }
        }

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
