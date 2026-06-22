import { createServer } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir =
    path.dirname(
        fileURLToPath(
            import.meta.url
        )
    );

const repoRoot =
    path.resolve(
        scriptDir,
        '../../..'
    );

const dataDir =
    mkdtempSync(
        path.join(
            tmpdir(),
            'collectionmgnt-e2e-'
        )
    );

let backendReady =
    false;

let cleanedUp =
    false;

process.env.PORT =
    '3100';
process.env.DATA_DIR =
    dataDir;
process.env.PLUGINS_DIR =
    path.join(
        repoRoot,
        'backend',
        'plugins'
    );
process.env.JWT_SECRET =
    'e2e-jwt-secret-with-at-least-32-characters';
process.env.ADMIN_USERNAME =
    'admin';
process.env.ADMIN_PASSWORD =
    'e2e-admin-password';

const healthServer =
    createServer(
        (_request, response) => {
            response.writeHead(
                backendReady ? 200 : 503,
                {
                    'Content-Type':
                        'application/json'
                }
            );
            response.end(
                JSON.stringify({
                    ok:
                        backendReady,
                    dataDir
                })
            );
        }
    );

healthServer.listen(
    3101,
    '127.0.0.1'
);

function cleanup() {

    if (
        cleanedUp
    ) {

        return;

    }

    cleanedUp =
        true;

    healthServer.close();

    rmSync(
        dataDir,
        {
            force:
                true,
            recursive:
                true
        }
    );

}

for (
    const signal of [
        'SIGINT',
        'SIGTERM'
    ]
) {

    process.on(
        signal,
        () => {
            cleanup();
            process.exit(0);
        }
    );

}

process.on(
    'exit',
    cleanup
);

await import(
    path.join(
        repoRoot,
        'backend',
        'src',
        'server.js'
    )
);

backendReady =
    true;
