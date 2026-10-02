import { importAcquisitionImage } from './acquisition-api.js';
import { uploadMedia } from './media-api.js';

function httpsUrl(value) {
    if (typeof value !== 'string') return null;
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
    } catch {
        return null;
    }
}

// Adapt legacy { kind, source, url } images without changing the provider contract.
export function normalizeAcquisitionMediaCandidates(suggestion) {
    const seenUrls = new Set();
    return (Array.isArray(suggestion?.images) ? suggestion.images : []).flatMap(image => {
        const url = httpsUrl(image?.url);
        if (!url || seenUrls.has(url)) return [];
        seenUrls.add(url);
        return [{
            kind: image.kind ?? null,
            url,
            originalUrl: httpsUrl(image.originalUrl) ?? url,
            thumbnailUrl: httpsUrl(image.thumbnailUrl),
            provider: image.provider ?? image.source ?? suggestion.provider ?? null,
            sourceUrl: image.sourceUrl ?? suggestion.sourceUrl ?? null,
            width: Number.isFinite(image.width) && image.width > 0 ? image.width : null,
            height: Number.isFinite(image.height) && image.height > 0 ? image.height : null,
            attribution: image.attribution ?? null,
            license: image.license ?? null,
            language: image.language ?? null,
            providerImageId: image.providerImageId ?? null,
            providerLocalizationId: image.providerLocalizationId ?? null
        }];
    });
}

export async function importSelectedAcquisitionMedia(itemId, selection) {
    if (selection?.mode === 'remote') {
        const candidate = selection.candidate;
        return importAcquisitionImage({
            itemId,
            imageUrl: candidate.url,
            provider: candidate.provider,
            source: candidate.provider,
            isPrimary: true
        });
    }
    if (selection?.mode === 'local') {
        return uploadMedia({ itemId, file: selection.file, isPrimary: true });
    }
    return null;
}

const warnings = new Map();

export function recordAcquisitionMediaWarning(itemId) {
    warnings.set(String(itemId), 'L’élément a été créé, mais l’image n’a pas pu être importée. Vous pouvez ajouter ou remplacer une image dans la galerie ci-dessous.');
}

export function takeAcquisitionMediaWarning(itemId) {
    const key = String(itemId);
    const warning = warnings.get(key) ?? '';
    warnings.delete(key);
    return warning;
}

// Only a small allowlist is sent to discovery; never forward the entire item.
export function buildAcquisitionMediaQuery(plugin, suggestion, language = null) {
    const metadata = suggestion?.metadata ?? {};
    const identifiers = {};
    const kind = plugin === 'movies' ? 'poster' : 'cover';
    if (plugin === 'books') {
        if (metadata.isbn) identifiers.isbn = metadata.isbn;
        for (const image of suggestion?.images ?? []) {
            if ((image?.source ?? image?.provider) !== 'openlibrary') continue;
            try {
                const url = new URL(image.url);
                const match = url.hostname === 'covers.openlibrary.org' && url.pathname.match(/^\/b\/id\/(\d+)-[SML]\.jpg$/);
                if (match) { identifiers.openLibraryCoverId = Number(match[1]); break; }
            } catch { /* Missing/unknown initial cover URL is supported. */ }
        }
        try {
            const source = new URL(suggestion.sourceUrl);
            const match = source.hostname === 'openlibrary.org' && source.pathname.match(/^\/(?:books|works)\/(OL\d+[MW])$/);
            if (match) identifiers.openLibraryId = match[1];
        } catch { /* Source URL is optional and is never fetched. */ }
        if (/^OL\d+[MW]$/.test(metadata.openLibraryId ?? '')) identifiers.openLibraryId = metadata.openLibraryId;
        if (Number.isSafeInteger(metadata.openLibraryCoverId)) identifiers.openLibraryCoverId = metadata.openLibraryCoverId;
    } else if (plugin === 'movies' && metadata.tmdbId) identifiers.tmdbId = Number(metadata.tmdbId);
    else if (plugin === 'games' && metadata.igdbId) identifiers.igdbId = Number(metadata.igdbId);
    if (!Object.keys(identifiers).length) return null;
    const preferredLanguage = language ?? (typeof navigator === 'undefined' ? null : navigator.language);
    return {
        plugin, kind, identifiers, title: suggestion.title || null,
        metadata: {
            ...(plugin === 'books' && metadata.author ? { author: metadata.author } : {}),
            ...(preferredLanguage && /^[a-z]{2,3}(?:-[A-Za-z]{2,4})?$/.test(preferredLanguage) ? { language: preferredLanguage } : {}),
            ...(metadata.originalLanguage ? { originalLanguage: metadata.originalLanguage } : {})
        }
    };
}
