import fs from 'fs';
import path from 'path';
import {
    spawnSync
} from 'child_process';
import {
    fileURLToPath
} from 'url';

const CURRENT_DIR =
    path.dirname(
        fileURLToPath(
            import.meta.url
        )
    );

const BACKEND_ROOT =
    path.resolve(
        CURRENT_DIR,
        '..'
    );

const DIRECTORIES =
    [
        'scripts',
        'src',
        'test'
    ];

const files =
    DIRECTORIES.flatMap(
        directory => listJavaScriptFiles(
            path.join(
                BACKEND_ROOT,
                directory
            )
        )
    );

for (
    const file
    of files
) {

    const result =
        spawnSync(
            process.execPath,
            [
                '--check',
                file
            ],
            {
                stdio:
                    'inherit'
            }
        );

    if (
        result.status !== 0
    ) {

        process.exit(
            result.status ?? 1
        );

    }

}

function listJavaScriptFiles(
    directory
) {

    if (
        !fs.existsSync(
            directory
        )
    ) {

        return [];

    }

    const files = [];

    for (
        const entry
        of fs.readdirSync(
            directory,
            {
                withFileTypes:
                    true
            }
        )
    ) {

        const entryPath =
            path.join(
                directory,
                entry.name
            );

        if (
            entry.isDirectory()
        ) {

            files.push(
                ...listJavaScriptFiles(
                    entryPath
                )
            );

            continue;

        }

        if (
            entry.isFile() &&
            entry.name.endsWith(
                '.js'
            )
        ) {

            files.push(
                entryPath
            );

        }

    }

    return files.sort();

}
