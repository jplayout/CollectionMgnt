import path from 'path';

export const DATA_DIR =
    process.env.DATA_DIR ??
    path.join(
        process.cwd(),
        'data'
    );

export const PLUGINS_DIR =
    process.env.PLUGINS_DIR ??
    path.join(
        process.cwd(),
        'plugins'
    );

export const DATABASE_PATH =
    path.join(
        DATA_DIR,
        'collection-manager.db'
    );

export function getUploadPath(
    ...segments
) {

    return path.join(
        DATA_DIR,
        'uploads',
        ...segments
    );

}
