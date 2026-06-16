import archiver from 'archiver';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

import {
    getUploadPath,
    PLUGINS_DIR
} from '../config/paths.js';

import {
    ExportService
} from './export-service.js';

const APPLICATION_VERSION =
    'v0.12-lot10.0.1';

const BACKUP_FORMAT =
    'collectionmgnt.full-backup';

const BACKUP_FORMAT_VERSION =
    1;

const DATABASE_ARCHIVE_PATH =
    'database/collection-manager.db';

const MEDIA_ARCHIVE_PATH =
    'media/uploads/items';

const PLUGINS_ARCHIVE_PATH =
    'plugins';

const NATIVE_EXPORT_ARCHIVE_PATH =
    'exports/application.json';

export class BackupService {

    constructor(
        db,
        pluginService
    ) {

        this.db =
            db;

        this.exportService =
            new ExportService(
                db,
                pluginService
            );

    }

    async createBackupArchive() {

        const createdAt =
            new Date().toISOString();

        const temporaryDirectory =
            await fs.mkdtemp(
                path.join(
                    os.tmpdir(),
                    'collectionmgnt-backup-'
                )
            );

        const temporaryDatabasePath =
            path.join(
                temporaryDirectory,
                'collection-manager.db'
            );

        await this.db.backup(
            temporaryDatabasePath
        );

        const warnings = [];

        const mediaFiles =
            await listFilesForArchive({
                archiveRoot:
                    MEDIA_ARCHIVE_PATH,
                sourceRoot:
                    getUploadPath(
                        'items'
                    ),
                warningCode:
                    'MEDIA_ITEMS_MISSING',
                warningMessage:
                    'Media uploads items directory does not exist.',
                warnings
            });

        const pluginFiles =
            await listFilesForArchive({
                archiveRoot:
                    PLUGINS_ARCHIVE_PATH,
                excludeSensitive:
                    true,
                sourceRoot:
                    PLUGINS_DIR,
                warningCode:
                    'PLUGINS_DIR_MISSING',
                warningMessage:
                    'Plugins directory does not exist.',
                warnings
            });

        const databaseStat =
            await fs.stat(
                temporaryDatabasePath
            );

        const manifest =
            createManifest({
                createdAt,
                counts:
                    this.getCounts(),
                databaseSize:
                    databaseStat.size,
                mediaFiles,
                pluginFiles,
                warnings
            });

        const archive =
            archiver(
                'zip',
                {
                    zlib: {
                        level:
                            9
                    }
                }
            );

        archive.append(
            JSON.stringify(
                manifest,
                null,
                2
            ),
            {
                name:
                    'manifest.json'
            }
        );

        archive.file(
            temporaryDatabasePath,
            {
                name:
                    DATABASE_ARCHIVE_PATH
            }
        );

        archive.append(
            JSON.stringify(
                this.exportService.buildApplicationExport(),
                null,
                2
            ),
            {
                name:
                    NATIVE_EXPORT_ARCHIVE_PATH
            }
        );

        for (
            const file
            of mediaFiles
        ) {

            archive.file(
                file.absolutePath,
                {
                    name:
                        file.archivePath
                }
            );

        }

        for (
            const file
            of pluginFiles
        ) {

            archive.file(
                file.absolutePath,
                {
                    name:
                        file.archivePath
                }
            );

        }

        let cleanedUp =
            false;

        const cleanup =
            async () => {

                if (
                    cleanedUp
                ) {

                    return;

                }

                cleanedUp =
                    true;

                await fs.rm(
                    temporaryDirectory,
                    {
                        force:
                            true,
                        recursive:
                            true
                    }
                );

            };

        archive.once(
            'end',
            cleanup
        );

        archive.once(
            'error',
            cleanup
        );

        const filename =
            `collectionmgnt-backup-${getBackupDate(createdAt)}.zip`;

        return {
            archive,
            filename
        };

    }

    getCounts() {

        return {
            plugins:
                countRows(
                    this.db,
                    'plugins'
                ),
            enabledPlugins:
                countRows(
                    this.db,
                    'plugins',
                    'enabled = 1'
                ),
            items:
                countRows(
                    this.db,
                    'items'
                ),
            media:
                countRows(
                    this.db,
                    'media'
                )
        };

    }

}

async function listFilesForArchive({
    archiveRoot,
    excludeSensitive = false,
    sourceRoot,
    warningCode,
    warningMessage,
    warnings
}) {

    const resolvedSourceRoot =
        path.resolve(
            sourceRoot
        );

    if (
        !(await pathExists(
            resolvedSourceRoot
        ))
    ) {

        warnings.push(
            createWarning(
                warningCode,
                warningMessage,
                archiveRoot
            )
        );

        return [];

    }

    const files = [];

        await collectFiles({
            archiveDirectory:
                archiveRoot,
            excludeSensitive,
            files,
            sourceDirectory:
                resolvedSourceRoot,
            warnings
        });

    return files;

}

async function collectFiles({
    archiveDirectory,
    excludeSensitive,
    files,
    sourceDirectory,
    warnings
}) {

    const entries =
        await fs.readdir(
            sourceDirectory,
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
            excludeSensitive &&
            isSensitivePathPart(
                entry.name
            )
        ) {

            warnings.push(
                createWarning(
                    'BACKUP_ENTRY_SKIPPED',
                    `Skipped sensitive or hidden plugin entry ${entry.name}.`,
                    path.posix.join(
                        archiveDirectory,
                        entry.name
                    )
                )
            );

            continue;

        }

        const absolutePath =
            path.join(
                sourceDirectory,
                entry.name
            );

        const archivePath =
            path.posix.join(
                archiveDirectory,
                entry.name
            );

        const stat =
            await fs.lstat(
                absolutePath
            );

        if (
            stat.isSymbolicLink()
        ) {

            warnings.push(
                createWarning(
                    'BACKUP_SYMLINK_SKIPPED',
                    'Symbolic links are not included in backups.',
                    archivePath
                )
            );

            continue;

        }

        if (
            stat.isDirectory()
        ) {

            await collectFiles({
                archiveDirectory:
                    archivePath,
                excludeSensitive,
                files,
                sourceDirectory:
                    absolutePath,
                warnings
            });

            continue;

        }

        if (
            stat.isFile()
        ) {

            files.push({
                absolutePath,
                archivePath,
                size:
                    stat.size
            });

        }

    }

}

function createManifest({
    counts,
    createdAt,
    databaseSize,
    mediaFiles,
    pluginFiles,
    warnings
}) {

    return {
        format:
            BACKUP_FORMAT,
        format_version:
            BACKUP_FORMAT_VERSION,
        created_at:
            createdAt,
        application_version:
            APPLICATION_VERSION,
        includes_database:
            true,
        includes_media_files:
            true,
        includes_native_export:
            true,
        includes_plugins:
            pluginFiles.length > 0,
        counts,
        paths: {
            database:
                DATABASE_ARCHIVE_PATH,
            media:
                MEDIA_ARCHIVE_PATH,
            native_export:
                NATIVE_EXPORT_ARCHIVE_PATH,
            plugins:
                PLUGINS_ARCHIVE_PATH
        },
        database_size:
            databaseSize,
        media_file_count:
            mediaFiles.length,
        media_total_bytes:
            sumFileSizes(
                mediaFiles
            ),
        plugin_file_count:
            pluginFiles.length,
        warnings
    };

}

function countRows(
    db,
    tableName,
    whereClause = null
) {

    const sql =
        whereClause
            ? `SELECT COUNT(*) AS count FROM ${tableName} WHERE ${whereClause}`
            : `SELECT COUNT(*) AS count FROM ${tableName}`;

    return db
        .prepare(sql)
        .get()
        .count;

}

function sumFileSizes(files) {

    return files.reduce(
        (
            total,
            file
        ) => total + file.size,
        0
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

function isSensitivePathPart(name) {

    return name.startsWith('.') ||
        /(^|[-_])(secret|token|credential|password|private)([-_.]|$)/i.test(
            name
        ) ||
        name === 'node_modules';

}

function createWarning(
    code,
    message,
    archivePath
) {

    return {
        code,
        message,
        path:
            archivePath
    };

}

function getBackupDate(isoDate) {

    return isoDate.slice(
        0,
        10
    );

}
