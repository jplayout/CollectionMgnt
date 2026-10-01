#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isProductVersion, REPOSITORY_ROOT } from '../backend/src/config/build-info.js';

export function checkVersionGovernance(root = REPOSITORY_ROOT) {
    const errors = [];
    const versionFile = path.join(root, 'VERSION');
    if (!existsSync(versionFile)) {
        errors.push('VERSION is missing.');
    } else {
        const content = readFileSync(versionFile, 'utf8');
        if (!isProductVersion(content.trim()) || content !== `${content.trim()}\n`) {
            errors.push('VERSION must contain exactly one SemVer version followed by a newline.');
        }
    }
    for (const name of ['package.json', 'backend/package.json', 'frontend/package.json']) {
        const file = path.join(root, name);
        if (existsSync(file) && Object.hasOwn(JSON.parse(readFileSync(file, 'utf8')), 'version')) {
            errors.push(`${name}: package manifests must not define the product version.`);
        }
        const lockName = name.replace('package.json', 'package-lock.json');
        const lockFile = path.join(root, lockName);
        if (existsSync(lockFile)) {
            const lock = JSON.parse(readFileSync(lockFile, 'utf8'));
            if (Object.hasOwn(lock, 'version') || Object.hasOwn(lock.packages?.[''] ?? {}, 'version')) {
                errors.push(`${lockName}: the application lockfile must not define the product version.`);
            }
        }
    }
    for (const directory of ['backend/src', 'frontend/src']) {
        for (const file of sourceFiles(path.join(root, directory))) {
            const content = readFileSync(file, 'utf8');
            const relative = path.relative(root, file);
            if (/\bv?0\.12-lot[\w.-]*/i.test(content)) {
                errors.push(`${relative}: obsolete product version.`);
            }
            if (directory === 'frontend/src' && /(?<![\w.])v?\d+\.\d+\.\d+(?:[-+][\w.-]+)?(?![\w.])/.test(content)) {
                errors.push(`${relative}: hardcoded frontend version; use injected build info.`);
            }
        }
    }
    return errors;
}

function sourceFiles(directory) {
    if (!existsSync(directory)) return [];
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const file = path.join(directory, entry.name);
        if (entry.isDirectory()) return sourceFiles(file);
        return entry.isFile() && /\.(?:js|mjs|vue|json|html)$/.test(entry.name) ? [file] : [];
    });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const errors = checkVersionGovernance();
    if (errors.length) {
        console.error(errors.join('\n'));
        process.exitCode = 1;
    } else {
        console.log('Version governance gate passed.');
    }
}
