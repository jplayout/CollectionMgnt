import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const REPOSITORY_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

// SemVer 2.0.0: numeric prerelease identifiers must not have leading zeroes.
const NUMBER = '(0|[1-9][0-9]*)';
const IDENTIFIER = '(?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*)';
const SEMVER = new RegExp(`^${NUMBER}\\.${NUMBER}\\.${NUMBER}(?:-${IDENTIFIER}(?:\\.${IDENTIFIER})*)?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$`);

export function isProductVersion(value) {
    return typeof value === 'string' && SEMVER.test(value);
}

export function readProductVersion({
    versionFile = process.env.APP_VERSION_FILE ?? new URL('../../../VERSION', import.meta.url),
    allowMissing = process.env.NODE_ENV !== 'production'
} = {}) {
    let version;
    try {
        version = readFileSync(versionFile, 'utf8').trim();
    } catch (error) {
        if (error.code === 'ENOENT' && allowMissing) {
            return 'development';
        }
        throw error;
    }
    if (!isProductVersion(version)) {
        throw new Error('VERSION must contain a valid SemVer product version.');
    }
    return version;
}

export function normalizeRevision(revision) {
    return typeof revision === 'string' && /^[a-f0-9]{7,64}$/i.test(revision)
        ? revision.toLowerCase()
        : 'development';
}

function localRevision() {
    try {
        return execFileSync('git', ['rev-parse', 'HEAD'], {
            cwd: REPOSITORY_ROOT,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
            timeout: 2000
        }).trim();
    } catch {
        return 'development';
    }
}

export function getBuildInfo({
    revision = process.env.APP_REVISION,
    allowGit = process.env.NODE_ENV !== 'production',
    resolveRevision = localRevision,
    expectedVersion = process.env.APP_VERSION,
    ...versionOptions
} = {}) {
    const version = readProductVersion(versionOptions);
    if (expectedVersion && expectedVersion !== version) {
        throw new Error('APP_VERSION must match the canonical VERSION file.');
    }
    return {
        version,
        revision: normalizeRevision(revision ?? (allowGit ? resolveRevision() : undefined))
    };
}
