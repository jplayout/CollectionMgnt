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
            license: image.license ?? null
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
