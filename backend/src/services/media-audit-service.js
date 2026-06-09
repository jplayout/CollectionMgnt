import fs from 'fs/promises';
import path from 'path';

import {
    DATA_DIR,
    getUploadPath
} from '../config/paths.js';

import {
    MediaAuditRepository
} from '../repositories/media-audit-repository.js';

const MEDIA_DIRECTORIES =
    new Set([
        'originals',
        'images',
        'thumbs'
    ]);

const ORIGINAL_FILENAME_PATTERN =
    /^(\d+)\.(jpg|png|webp)$/i;

const GENERATED_FILENAME_PATTERN =
    /^(\d+)\.webp$/i;

export class MediaAuditService {

    constructor(db) {
        this.repository =
            new MediaAuditRepository(
                db
            );
    }

    async runAudit() {

        const scanStartedAt =
            new Date().toISOString();

        const dbIssues = [];
        const filesystemIssues = [];
        const cleanupCandidates = [];
        const warnings = [];

        const itemIds =
            this.repository.findItemIds();

        const mediaRows =
            this.repository.findMediaRows();

        const itemIdSet =
            new Set(
                itemIds
            );

        const mediaById =
            new Map(
                mediaRows.map(
                    media => [
                        media.id,
                        media
                    ]
                )
            );

        const mediaByItemAndFilename =
            new Map();

        for (
            const media
            of mediaRows
        ) {

            if (
                media.filename
            ) {

                mediaByItemAndFilename.set(
                    `${media.item_id}:originals:${media.filename}`,
                    media
                );

            }

            mediaByItemAndFilename.set(
                `${media.item_id}:images:${media.id}.webp`,
                media
            );

            mediaByItemAndFilename.set(
                `${media.item_id}:thumbs:${media.id}.webp`,
                media
            );

        }

        await auditDatabaseRows({
            dbIssues,
            itemIdSet,
            mediaRows
        });

        const filesystemScan =
            await auditFilesystem({
                cleanupCandidates,
                filesystemIssues,
                itemIdSet,
                mediaById,
                mediaByItemAndFilename,
                warnings
            });

        const scanFinishedAt =
            new Date().toISOString();

        return {
            scan_started_at:
                scanStartedAt,
            scan_finished_at:
                scanFinishedAt,
            summary: {
                items:
                    itemIds.length,
                mediaRows:
                    mediaRows.length,
                itemFolders:
                    filesystemScan.itemFolders,
                filesScanned:
                    filesystemScan.filesScanned,
                dbIssueCount:
                    dbIssues.length,
                filesystemIssueCount:
                    filesystemIssues.length,
                cleanupCandidateCount:
                    cleanupCandidates.length,
                warningCount:
                    warnings.length
            },
            dbIssues,
            filesystemIssues,
            cleanupCandidates,
            warnings
        };

    }

}

async function auditDatabaseRows({
    dbIssues,
    itemIdSet,
    mediaRows
}) {

    for (
        const media
        of mediaRows
    ) {

        if (
            !itemIdSet.has(
                media.item_id
            )
        ) {

            dbIssues.push(
                createIssue({
                    code:
                        'MEDIA_ITEM_MISSING',
                    severity:
                        'error',
                    item_id:
                        media.item_id,
                    media_id:
                        media.id,
                    message:
                        `Media ${media.id} references missing item ${media.item_id}.`
                })
            );

            continue;

        }

        if (
            typeof media.filename !== 'string' ||
            media.filename.trim() === ''
        ) {

            dbIssues.push(
                createIssue({
                    code:
                        'MEDIA_FILENAME_EMPTY',
                    severity:
                        'error',
                    item_id:
                        media.item_id,
                    media_id:
                        media.id,
                    message:
                        `Media ${media.id} has an empty filename.`
                })
            );

            continue;

        }

        await checkExpectedFile({
            code:
                'MEDIA_ORIGINAL_MISSING',
            dbIssues,
            itemId:
                media.item_id,
            mediaId:
                media.id,
            message:
                `Original file for media ${media.id} is missing.`,
            relativePath:
                getRelativeMediaPath(
                    media.item_id,
                    'originals',
                    media.filename
                )
        });

        await checkExpectedFile({
            code:
                'MEDIA_OPTIMIZED_MISSING',
            dbIssues,
            itemId:
                media.item_id,
            mediaId:
                media.id,
            message:
                `Optimized image for media ${media.id} is missing.`,
            relativePath:
                getRelativeMediaPath(
                    media.item_id,
                    'images',
                    `${media.id}.webp`
                )
        });

        await checkExpectedFile({
            code:
                'MEDIA_THUMBNAIL_MISSING',
            dbIssues,
            itemId:
                media.item_id,
            mediaId:
                media.id,
            message:
                `Thumbnail for media ${media.id} is missing.`,
            relativePath:
                getRelativeMediaPath(
                    media.item_id,
                    'thumbs',
                    `${media.id}.webp`
                )
        });

    }

}

async function checkExpectedFile({
    code,
    dbIssues,
    itemId,
    mediaId,
    message,
    relativePath
}) {

    const absolutePath =
        resolveRelativeToDataDir(
            relativePath
        );

    if (
        !isPathInsideDataDir(
            absolutePath
        )
    ) {

        dbIssues.push(
            createIssue({
                code,
                severity:
                    'error',
                item_id:
                    itemId,
                media_id:
                    mediaId,
                path:
                    relativePath,
                message:
                    `Unsafe media path for media ${mediaId}.`
            })
        );

        return;

    }

    if (
        !(await pathExists(absolutePath))
    ) {

        dbIssues.push(
            createIssue({
                code,
                severity:
                    'warning',
                item_id:
                    itemId,
                media_id:
                    mediaId,
                path:
                    relativePath,
                message
            })
        );

    }

}

async function auditFilesystem({
    cleanupCandidates,
    filesystemIssues,
    itemIdSet,
    mediaById,
    mediaByItemAndFilename,
    warnings
}) {

    const itemUploadsPath =
        getItemsUploadsPath();

    if (
        !isPathInsideItemsUploadsDir(
            itemUploadsPath
        )
    ) {

        warnings.push(
            createWarning(
                'UPLOADS_PATH_UNSAFE',
                'Media uploads path is outside DATA_DIR.'
            )
        );

        return {
            filesScanned:
                0,
            itemFolders:
                0
        };

    }

    if (
        !(await pathExists(itemUploadsPath))
    ) {

        warnings.push(
            createWarning(
                'UPLOADS_ITEMS_MISSING',
                'Media uploads items directory does not exist.',
                getRelativePath(itemUploadsPath)
            )
        );

        return {
            filesScanned:
                0,
            itemFolders:
                0
        };

    }

    const entries =
        await fs.readdir(
            itemUploadsPath,
            {
                withFileTypes:
                    true
            }
        );

    let filesScanned =
        0;

    let itemFolders =
        0;

    for (
        const entry
        of entries
    ) {

        if (
            !entry.isDirectory() ||
            !/^\d+$/.test(
                entry.name
            )
        ) {

            continue;

        }

        itemFolders +=
            1;

        const itemId =
            Number(
                entry.name
            );

        const itemDirectory =
            path.join(
                itemUploadsPath,
                entry.name
            );

        if (
            !itemIdSet.has(
                itemId
            )
        ) {

            const issue =
                createIssue({
                    code:
                        'ITEM_FOLDER_WITHOUT_ITEM',
                    severity:
                        'warning',
                    item_id:
                        itemId,
                    path:
                        getRelativePath(itemDirectory),
                    message:
                        `Media folder exists for missing item ${itemId}.`
                });

            filesystemIssues.push(
                issue
            );

            cleanupCandidates.push(
                {
                    ...issue,
                    candidate_type:
                        'item_folder'
                }
            );

        }

        const scannedItemDirectory =
            await scanItemDirectory({
                cleanupCandidates,
                filesystemIssues,
                itemDirectory,
                itemId,
                mediaById,
                mediaByItemAndFilename
            });

        filesScanned +=
            scannedItemDirectory.filesScanned;

        if (
            scannedItemDirectory.usefulFileCount === 0
        ) {

            const issue =
                createIssue({
                    code:
                        'EMPTY_ITEM_FOLDER',
                    severity:
                        'info',
                    item_id:
                        itemId,
                    path:
                        getRelativePath(itemDirectory),
                    message:
                        `Media folder for item ${itemId} is empty or has no useful media files.`
                });

            filesystemIssues.push(
                issue
            );

            cleanupCandidates.push(
                {
                    ...issue,
                    candidate_type:
                        'empty_item_folder'
                }
            );

        }

    }

    return {
        filesScanned,
        itemFolders
    };

}

async function scanItemDirectory({
    cleanupCandidates,
    filesystemIssues,
    itemDirectory,
    itemId,
    mediaById,
    mediaByItemAndFilename
}) {

    let filesScanned =
        0;

    let usefulFileCount =
        0;

    const entries =
        await fs.readdir(
            itemDirectory,
            {
                withFileTypes:
                    true
            }
        );

    for (
        const entry
        of entries
    ) {

        if (
            !entry.isDirectory() ||
            !MEDIA_DIRECTORIES.has(
                entry.name
            )
        ) {

            continue;

        }

        const mediaDirectory =
            path.join(
                itemDirectory,
                entry.name
            );

        const mediaEntries =
            await fs.readdir(
                mediaDirectory,
                {
                    withFileTypes:
                        true
                }
            );

        for (
            const mediaEntry
            of mediaEntries
        ) {

            if (
                !mediaEntry.isFile()
            ) {

                continue;

            }

            filesScanned +=
                1;

            const filePath =
                path.join(
                    mediaDirectory,
                    mediaEntry.name
                );

            const issue =
                auditMediaFile({
                    directoryName:
                        entry.name,
                    fileName:
                        mediaEntry.name,
                    filePath,
                    itemId,
                    mediaById,
                    mediaByItemAndFilename
                });

            if (
                issue
            ) {

                filesystemIssues.push(
                    issue
                );

                cleanupCandidates.push(
                    {
                        ...issue,
                        candidate_type:
                            'file'
                    }
                );

            } else {

                usefulFileCount +=
                    1;

            }

        }

    }

    return {
        filesScanned,
        usefulFileCount
    };

}

function auditMediaFile({
    directoryName,
    fileName,
    filePath,
    itemId,
    mediaById,
    mediaByItemAndFilename
}) {

    const pattern =
        directoryName === 'originals'
            ? ORIGINAL_FILENAME_PATTERN
            : GENERATED_FILENAME_PATTERN;

    const match =
        fileName.match(
            pattern
        );

    if (
        !match
    ) {

        return createIssue({
            code:
                'UNEXPECTED_FILE',
            severity:
                'warning',
            item_id:
                itemId,
            path:
                getRelativePath(filePath),
            message:
                `Unexpected file ${fileName} in ${directoryName}.`
        });

    }

    const mediaId =
        Number(
            match[1]
        );

    const media =
        mediaById.get(
            mediaId
        );

    const expectedMedia =
        mediaByItemAndFilename.get(
            `${itemId}:${directoryName}:${fileName}`
        );

    if (
        !media ||
        !expectedMedia
    ) {

        return createIssue({
            code:
                'FILE_WITHOUT_MEDIA_ROW',
            severity:
                'warning',
            item_id:
                itemId,
            media_id:
                mediaId,
            path:
                getRelativePath(filePath),
            message:
                `File ${fileName} in ${directoryName} has no matching media row for item ${itemId}.`
        });

    }

    return null;

}

function getItemsUploadsPath() {

    return path.resolve(
        getUploadPath(
            'items'
        )
    );

}

function getRelativeMediaPath(
    itemId,
    directoryName,
    fileName
) {

    return path.join(
        'uploads',
        'items',
        String(itemId),
        directoryName,
        fileName
    );

}

function resolveRelativeToDataDir(relativePath) {

    return path.resolve(
        DATA_DIR,
        relativePath
    );

}

function getRelativePath(absolutePath) {

    return path.relative(
        path.resolve(
            DATA_DIR
        ),
        absolutePath
    );

}

function isPathInsideDataDir(absolutePath) {

    const resolvedDataDir =
        path.resolve(
            DATA_DIR
        );

    const resolvedPath =
        path.resolve(
            absolutePath
        );

    return resolvedPath === resolvedDataDir ||
        resolvedPath.startsWith(
            `${resolvedDataDir}${path.sep}`
        );

}

function isPathInsideItemsUploadsDir(absolutePath) {

    const resolvedItemsUploadsDir =
        path.resolve(
            getUploadPath(
                'items'
            )
        );

    const resolvedPath =
        path.resolve(
            absolutePath
        );

    return resolvedPath === resolvedItemsUploadsDir ||
        resolvedPath.startsWith(
            `${resolvedItemsUploadsDir}${path.sep}`
        );

}

async function pathExists(absolutePath) {

    try {

        await fs.access(
            absolutePath
        );

        return true;

    } catch {

        return false;

    }

}

function createIssue({
    code,
    item_id,
    media_id,
    message,
    path: issuePath,
    severity
}) {

    const issue = {
        code,
        severity,
        message
    };

    if (
        item_id !== undefined
    ) {

        issue.item_id =
            item_id;

    }

    if (
        media_id !== undefined
    ) {

        issue.media_id =
            media_id;

    }

    if (
        issuePath
    ) {

        issue.path =
            issuePath;

    }

    return issue;

}

function createWarning(
    code,
    message,
    warningPath = null
) {

    return createIssue({
        code,
        message,
        path:
            warningPath,
        severity:
            'warning'
    });

}
