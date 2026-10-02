export function formatBuildRevision(revision) {
    return typeof revision === 'string' && /^[a-f0-9]{7,64}$/i.test(revision)
        ? revision.slice(0, 7).toLowerCase()
        : 'development';
}

export function getApplicationBuildInfo(env = {
    VITE_APP_VERSION: import.meta.env?.VITE_APP_VERSION,
    VITE_APP_REVISION: import.meta.env?.VITE_APP_REVISION
}) {
    return {
        version: env.VITE_APP_VERSION || 'development',
        build: formatBuildRevision(env.VITE_APP_REVISION)
    };
}
