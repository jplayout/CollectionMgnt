import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const readRepoFile = file => readFileSync(new URL(`../../../${file}`, import.meta.url), 'utf8');

for (const file of ['docker-compose.yml', 'deploy/compose.synology.yml']) {

    test(`${file} passes Google Books configuration only to the backend with an empty default`, () => {

        const compose = readRepoFile(file);
        const backend = compose.split('  backend:')[1].split('  frontend:')[0];
        const frontend = compose.split('  frontend:')[1];

        assert.match(backend, /^      GOOGLE_BOOKS_API_KEY: \$\{GOOGLE_BOOKS_API_KEY:-\}$/m);
        assert.equal(frontend.includes('GOOGLE_BOOKS_API_KEY'), false);

    });

}

test('Environment example documents Google Books configuration without a default secret', () => {

    const example = readRepoFile('.env.example');
    assert.match(example, /^GOOGLE_BOOKS_API_KEY=$/m);
    assert.match(example, /required to enable the Google Books fallback/);
    assert.equal(readRepoFile('frontend/.env.example').includes('GOOGLE_BOOKS_API_KEY'), false);

});

test('Docker images do not bake Google Books credentials into build configuration', () => {

    for (const file of ['backend/Dockerfile', 'frontend/Dockerfile']) {
        assert.equal(readRepoFile(file).includes('GOOGLE_BOOKS_API_KEY'), false);
    }

});
