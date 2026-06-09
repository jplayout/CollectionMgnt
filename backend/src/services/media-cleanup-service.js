import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

import {
    DATA_DIR,
    getUploadPath
} from '../config/paths.js';

import {
    MediaAuditService
} from './media-audit-service.js';

const SAFE_CODES =
    new Set([
        'FILE_WITHOUT_MEDIA_ROW',
        'UNEXPECTED_FILE',
        'ITEM_FOLDER_WITHOUT_ITEM',
        'EMPTY_ITEM_FOLDER'
    ]);

const SAFE_TYPES_BY_CODE =
    new Map([
        [
            'FILE_WITHOUT_MEDIA_ROW',
            'file'
        ],
        [
            'UNEXPECTED_FILE',
            'file'
        ],
        [
            'ITEM_FOLDER_WITHOUT_ITEM',
            'item_folder'
        ],
        [
            'EMPTY_ITEM_FOLDER',
            'empty_item_folder'
        ]
    ]);

export class MediaCleanupService {

    constructor(db) {
        this.auditService =
            new MediaAuditService(
                db
            );

        this.previewCache =
            new Map();
    }

    async preview() {

        const auditReport =
            await this.auditService.runAudit();

        const warnings =
            [
                ...auditReport.warnings
            ];

        const itemIdsWithDbMediaRows =
            getItemIdsWithDbMediaRows(
                auditReport.dbIssues
            );

        const candidates = [];

        for (
            const cleanupCandidate
            of auditReport.cleanupCandidates
        ) {

            const candidate =
                await normalizeCandidate(
                    cleanupCandidate,
                    itemIdsWithDbMediaRows,
                    warnings
                );

            if (
                candidate
            ) {

                candidates.push(
                    candidate
                );

            }

        }

        candidates.sort(
            compareCandidates
        );

        this.previewCache =
            new Map(
                candidates.map(
                    candidate => [
                        candidate.id,
                        candidate
                    ]
                )
            );

        return {
            scan_started_at:
                auditReport.scan_started_at,
            scan_finished_at:
                auditReport.scan_finished_at,
            summary:
                createPreviewSummary(
                    candidates,
                    warnings
                ),
            candidates,
            warnings
        };

    }

    async execute(candidateIds) {

        if (
            !Array.isArray(
                candidateIds
            )
        ) {

            const error =
                new Error(
                    'candidateIds must be an array.'
                );

            error.statusCode =
                400;

            throw error;

        }

        const previousPreviewCache =
            new Map(
                this.previewCache
            );

        const preview =
            await this.preview();

        const candidatesById =
            new Map(
                preview.candidates.map(
                    candidate => [
                        candidate.id,
                        candidate
                    ]
                )
            );

        const deleted = [];
        const skipped = [];
        const errors = [];

        for (
            const candidateId
            of candidateIds
        ) {

            const candidate =
                candidatesById.get(
                    candidateId
                );

            if (
                !candidate
            ) {

                const cachedCandidate =
                    previousPreviewCache.get(
                        candidateId
                    );

                if (
                    cachedCandidate
                ) {

                    const cachedPath =
                        resolveCandidatePath(
                            cachedCandidate.relativePath
                        );

                    if (
                        isPathInsideItemsUploadsDir(
                            cachedPath
                        ) &&
                        !(await lstatOrNull(
                            cachedPath
                        ))
                    ) {

                        skipped.push(
                            {
                                id:
                                    cachedCandidate.id,
                                code:
                                    cachedCandidate.code,
                                relativePath:
                                    cachedCandidate.relativePath,
                                reason:
                                    'already_missing'
                            }
                        );

                        continue;

                    }

                }

                skipped.push(
                    {
                        id:
                            candidateId,
                        reason:
                            'unknown_candidate'
                    }
                );

                continue;

            }

            const absolutePath =
                resolveCandidatePath(
                    candidate.relativePath
                );

            if (
                !isPathInsideItemsUploadsDir(
                    absolutePath
                )
            ) {

                errors.push(
                    createExecutionError(
                        candidate,
                        'unsafe_path',
                        'Candidate path is outside uploads/items.'
                    )
                );

                continue;

            }

            const stat =
                await lstatOrNull(
                    absolutePath
                );

            if (
                !stat
            ) {

                skipped.push(
                    {
                        id:
                            candidate.id,
                        code:
                            candidate.code,
                        relativePath:
                            candidate.relativePath,
                        reason:
                            'already_missing'
                    }
                );

                continue;

            }

            if (
                stat.isSymbolicLink()
            ) {

                errors.push(
                    createExecutionError(
                        candidate,
                        'symlink_refused',
                        'Symbolic links are not deleted by media cleanup.'
                    )
                );

                continue;

            }

            try {

                if (
                    candidate.type === 'file'
                ) {

                    if (
                        !stat.isFile()
                    ) {

                        throw new Error(
                            'Candidate is not a regular file.'
                        );

                    }

                    await fs.unlink(
                        absolutePath
                    );

                } else {

                    if (
                        !stat.isDirectory()
                    ) {

                        throw new Error(
                            'Candidate is not a directory.'
                        );

                    }

                    await fs.rm(
                        absolutePath,
                        {
                            recursive:
                                true,
                            force:
                                false
                        }
                    );

                }

                deleted.push(
                    {
                        id:
                            candidate.id,
                        type:
                            candidate.type,
                        code:
                            candidate.code,
                        relativePath:
                            candidate.relativePath,
                        size:
                            candidate.size ?? 0
                    }
                );

            } catch (error) {

                errors.push(
                    createExecutionError(
                        candidate,
                        'delete_failed',
                        error.message
                    )
                );

            }

        }

        return {
            executed_at:
                new Date().toISOString(),
            summary: {
                requested:
                    candidateIds.length,
                deleted:
                    deleted.length,
                skipped:
                    skipped.length,
                errors:
                    errors.length,
                bytesDeleted:
                    deleted.reduce(
                        (
                            total,
                            candidate
                        ) => total + (candidate.size ?? 0),
                        0
                    )
            },
            deleted,
            skipped,
            errors
        };

    }

}

async function normalizeCandidate(
    cleanupCandidate,
    itemIdsWithDbMediaRows,
    warnings
) {

    if (
        !SAFE_CODES.has(
            cleanupCandidate.code
        )
    ) {

        return null;

    }

    const expectedType =
        SAFE_TYPES_BY_CODE.get(
            cleanupCandidate.code
        );

    if (
        cleanupCandidate.candidate_type !== expectedType
    ) {

        warnings.push(
            createWarning(
                'CLEANUP_CANDIDATE_TYPE_MISMATCH',
                `Cleanup candidate ${cleanupCandidate.code} has an unexpected type.`
            )
        );

        return null;

    }

    if (
        typeof cleanupCandidate.path !== 'string'
    ) {

        warnings.push(
            createWarning(
                'CLEANUP_CANDIDATE_PATH_MISSING',
                `Cleanup candidate ${cleanupCandidate.code} has no path.`
            )
        );

        return null;

    }

    const absolutePath =
        resolveCandidatePath(
            cleanupCandidate.path
        );

    if (
        !isPathInsideItemsUploadsDir(
            absolutePath
        )
    ) {

        warnings.push(
            createWarning(
                'CLEANUP_CANDIDATE_PATH_UNSAFE',
                `Cleanup candidate ${cleanupCandidate.path} is outside uploads/items.`,
                cleanupCandidate.path
            )
        );

        return null;

    }

    const itemId =
        extractItemId(
            cleanupCandidate.path
        );

    if (
        itemId === null
    ) {

        warnings.push(
            createWarning(
                'CLEANUP_CANDIDATE_ITEM_INVALID',
                `Cleanup candidate ${cleanupCandidate.path} has no numeric item id.`,
                cleanupCandidate.path
            )
        );

        return null;

    }

    if (
        cleanupCandidate.code === 'ITEM_FOLDER_WITHOUT_ITEM' &&
        itemIdsWithDbMediaRows.has(
            itemId
        )
    ) {

        warnings.push(
            createWarning(
                'CLEANUP_CANDIDATE_HAS_DB_MEDIA',
                `Cleanup candidate ${cleanupCandidate.path} is skipped because DB media rows still reference item ${itemId}.`,
                cleanupCandidate.path
            )
        );

        return null;

    }

    const stat =
        await lstatOrNull(
            absolutePath
        );

    if (
        !stat ||
        stat.isSymbolicLink()
    ) {

        return null;

    }

    if (
        expectedType === 'file' &&
        !stat.isFile()
    ) {

        return null;

    }

    if (
        expectedType !== 'file' &&
        !stat.isDirectory()
    ) {

        return null;

    }

    if (
        expectedType === 'empty_item_folder' &&
        !(await containsNoFiles(absolutePath))
    ) {

        return null;

    }

    const relativePath =
        normalizeRelativePath(
            cleanupCandidate.path
        );

    return {
        id:
            createCandidateId({
                code:
                    cleanupCandidate.code,
                relativePath,
                type:
                    expectedType
            }),
        type:
            expectedType,
        code:
            cleanupCandidate.code,
        relativePath,
        reason:
            cleanupCandidate.message,
        size:
            expectedType === 'file'
                ? stat.size
                : undefined,
        itemId
    };

}

function getItemIdsWithDbMediaRows(dbIssues) {

    return new Set(
        dbIssues
            .filter(
                issue => issue.code === 'MEDIA_ITEM_MISSING' &&
                    issue.item_id !== undefined
            )
            .map(
                issue => issue.item_id
            )
    );

}

function createPreviewSummary(
    candidates,
    warnings
) {

    return {
        candidateCount:
            candidates.length,
        fileCount:
            candidates.filter(
                candidate => candidate.type === 'file'
            ).length,
        folderCount:
            candidates.filter(
                candidate => candidate.type !== 'file'
            ).length,
        totalBytes:
            candidates.reduce(
                (
                    total,
                    candidate
                ) => total + (candidate.size ?? 0),
                0
            ),
        warningCount:
            warnings.length
    };

}

function compareCandidates(
    firstCandidate,
    secondCandidate
) {

    return getCandidateSortWeight(
        firstCandidate
    ) - getCandidateSortWeight(
        secondCandidate
    );

}

function getCandidateSortWeight(candidate) {

    if (
        candidate.type === 'file'
    ) {

        return 0;

    }

    if (
        candidate.type === 'empty_item_folder'
    ) {

        return 1;

    }

    return 2;

}

function resolveCandidatePath(relativePath) {

    return path.resolve(
        DATA_DIR,
        relativePath
    );

}

function normalizeRelativePath(relativePath) {

    return path.relative(
        path.resolve(
            DATA_DIR
        ),
        resolveCandidatePath(
            relativePath
        )
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

    return resolvedPath !== resolvedItemsUploadsDir &&
        resolvedPath.startsWith(
            `${resolvedItemsUploadsDir}${path.sep}`
        );

}

function extractItemId(relativePath) {

    const normalizedPath =
        normalizeRelativePath(
            relativePath
        );

    const segments =
        normalizedPath.split(
            path.sep
        );

    if (
        segments.length < 3 ||
        segments[0] !== 'uploads' ||
        segments[1] !== 'items' ||
        !/^\d+$/.test(
            segments[2]
        )
    ) {

        return null;

    }

    return Number(
        segments[2]
    );

}

async function lstatOrNull(absolutePath) {

    try {

        return await fs.lstat(
            absolutePath
        );

    } catch (error) {

        if (
            error.code === 'ENOENT'
        ) {

            return null;

        }

        throw error;

    }

}

async function containsNoFiles(directoryPath) {

    const entries =
        await fs.readdir(
            directoryPath,
            {
                withFileTypes:
                    true
            }
        );

    for (
        const entry
        of entries
    ) {

        const entryPath =
            path.join(
                directoryPath,
                entry.name
            );

        if (
            entry.isFile() ||
            entry.isSymbolicLink()
        ) {

            return false;

        }

        if (
            entry.isDirectory() &&
            !(await containsNoFiles(entryPath))
        ) {

            return false;

        }

    }

    return true;

}

function createCandidateId({
    code,
    relativePath,
    type
}) {

    return crypto
        .createHash(
            'sha256'
        )
        .update(
            `${type}|${code}|${relativePath}`
        )
        .digest(
            'hex'
        );

}

function createWarning(
    code,
    message,
    warningPath = null
) {

    const warning = {
        code,
        severity:
            'warning',
        message
    };

    if (
        warningPath
    ) {

        warning.path =
            warningPath;

    }

    return warning;

}

function createExecutionError(
    candidate,
    reason,
    message
) {

    return {
        id:
            candidate.id,
        code:
            candidate.code,
        relativePath:
            candidate.relativePath,
        reason,
        message
    };

}
