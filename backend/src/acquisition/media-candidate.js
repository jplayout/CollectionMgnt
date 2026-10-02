export function safeHttpsUrl(value) {
    if (typeof value !== 'string') return null;
    try {
        const url = new URL(value);
        if (url.protocol !== 'https:' || url.username || url.password) return null;
        url.hash = '';
        return url.href;
    } catch { return null; }
}

export function normalizeMediaCandidates(candidates, { provider, kind, limit = 10 }) {
    if (!Array.isArray(candidates)) throw new TypeError('Expected media candidates');
    const grouped = new Map();
    for (const candidate of candidates) {
        const url = safeHttpsUrl(candidate?.url);
        if (!url) continue;
        const providerImageId = typeof candidate.providerImageId === 'string' && candidate.providerImageId.length <= 200
            ? candidate.providerImageId : null;
        const key = providerImageId ? `id:${providerImageId}` : `url:${url}`;
        const normalized = {
            kind, url, thumbnailUrl: safeHttpsUrl(candidate.thumbnailUrl), provider,
            sourceUrl: safeHttpsUrl(candidate.sourceUrl),
            width: dimension(candidate.width), height: dimension(candidate.height),
            attribution: text(candidate.attribution), license: text(candidate.license),
            language: text(candidate.language, 35), providerImageId,
            providerLocalizationId: Number.isSafeInteger(candidate.providerLocalizationId) && candidate.providerLocalizationId > 0 ? candidate.providerLocalizationId : null
        };
        const quality = Number.isFinite(candidate.resolutionRank) ? candidate.resolutionRank : (normalized.width ?? 0) * (normalized.height ?? 0);
        const previous = grouped.get(key);
        if (!previous) grouped.set(key, { normalized, quality });
        else if (quality > previous.quality) {
            normalized.thumbnailUrl ??= previous.normalized.thumbnailUrl ?? previous.normalized.url;
            grouped.set(key, { normalized, quality });
        } else if (!previous.normalized.thumbnailUrl && previous.normalized.url !== normalized.url) {
            previous.normalized.thumbnailUrl = normalized.thumbnailUrl ?? normalized.url;
        }
    }
    const seenUrls = new Set();
    return [...grouped.values()].map(value => value.normalized).filter(candidate => {
        if (seenUrls.has(candidate.url)) return false;
        seenUrls.add(candidate.url);
        return true;
    }).slice(0, limit);
}

function dimension(value) { return Number.isInteger(value) && value > 0 ? value : null; }
function text(value, max = 500) { return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null; }
