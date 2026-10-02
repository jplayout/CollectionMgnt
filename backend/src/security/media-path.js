import fs from 'node:fs';
import path from 'node:path';

import { DATA_DIR } from '../config/paths.js';

const DIRECTORIES = new Set(['originals', 'images', 'thumbs']);

export function getSafeMediaPath(itemId, directory, filename) {
    if (!Number.isSafeInteger(itemId) || itemId <= 0 ||
        (directory !== undefined && !DIRECTORIES.has(directory)) ||
        (filename !== undefined && (directory === undefined || !/^\d+\.(jpg|png|webp)$/i.test(filename)))) {
        throw new Error('Unsafe media path');
    }
    const parts = ['uploads', 'items', String(itemId)];
    if (directory !== undefined) parts.push(directory);
    if (filename !== undefined) parts.push(filename);
    // IDs are positive integers; directory is allowlisted; filename cannot contain separators.
    // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
    const target = path.join(DATA_DIR, ...parts);
    if (!hasNoSymlinkComponents(target)) throw new Error('Unsafe media symlink');
    return target;
}

// DATA_DIR is operator configuration. Reject symlinks in every existing component below it,
// including uploads/items and intermediate directories, not just the final file.
export function hasNoSymlinkComponents(target) {
    const root = path.resolve(DATA_DIR);
    const relative = path.relative(root, target);
    if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
        return false;
    }
    let current = root;
    for (const part of relative.split(path.sep)) {
        // part comes from a relative path already verified to be below DATA_DIR.
        // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
        current = path.join(current, part);
        try {
            if (fs.lstatSync(current).isSymbolicLink()) return false;
        } catch (error) {
            if (error.code === 'ENOENT') return true;
            throw error;
        }
    }
    return true;
}
