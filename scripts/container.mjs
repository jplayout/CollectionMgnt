#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { getBuildInfo, REPOSITORY_ROOT } from '../backend/src/config/build-info.js';

const args = process.argv.slice(2);
const engine = process.env.CONTAINER_ENGINE ?? 'podman';
const command = args.shift();
const info = getBuildInfo({ allowGit: true, allowMissing: false });
const source = process.env.APP_SOURCE ?? 'https://github.com/jplayout/CollectionMgnt';
let engineArgs;
if (command === 'build' && ['backend', 'frontend'].includes(args[0])) {
    const component = args.shift();
    engineArgs = ['build', '--file', `${component}/Dockerfile`,
        '--build-arg', `APP_VERSION=${info.version}`,
        '--build-arg', `APP_REVISION=${info.revision}`,
        '--build-arg', `APP_SOURCE=${source}`, ...args, '.'];
} else if (command === 'compose') {
    engineArgs = ['compose', ...args];
} else {
    console.error('Usage: node scripts/container.mjs build <backend|frontend> [options] | compose [options]');
    process.exit(1);
}
const result = spawnSync(engine, engineArgs, {
    cwd: REPOSITORY_ROOT,
    stdio: 'inherit',
    env: { ...process.env, APP_VERSION: info.version, APP_REVISION: info.revision, APP_SOURCE: source }
});
if (result.error) {
    console.error(result.error.message);
}
process.exit(result.status ?? 1);
