import { createProviderError, createProviderTimeoutError, createProviderUnavailableError } from '../errors.js';
import { normalizeIdentifier } from '../../services/item-validator.js';
import { normalizeMediaCandidates, safeHttpsUrl } from '../media-candidate.js';

async function request(provider, url, options, signal, map) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), provider.timeoutMs);
    try {
        const response = await provider.fetchImpl(url, { redirect: 'error', ...options, signal: signal ? AbortSignal.any([signal, controller.signal]) : controller.signal });
        if (response.status === 404 && options.method === 'HEAD') return [];
        if (response.status === 401 && typeof provider.clearAccessToken === 'function') provider.clearAccessToken();
        if ([403, 429].includes(response.status)) throw createProviderUnavailableError();
        if (!response.ok) throw createProviderError();
        return await map(response);
    } catch (error) {
        if (error?.name === 'AbortError') throw createProviderTimeoutError();
        if (error?.code && error?.statusCode) throw error;
        throw createProviderError();
    } finally { clearTimeout(timeout); }
}

export async function searchOpenLibraryMedia(provider, query, { signal } = {}) {
    const ids = query.identifiers;
    const key = ids.openLibraryCoverId ? 'id' : ids.openLibraryId ? 'olid' : 'isbn';
    const value = ids.openLibraryCoverId ?? ids.openLibraryId ?? ids.isbn;
    if (!value) return [];
    const base = `https://covers.openlibrary.org/b/${key}/${value}`;
    // One HEAD request; never download image bytes, probe alternatives or preload sizes.
    return request(provider, `${base}-L.jpg?default=false`, { method: 'HEAD', redirect: 'error' }, signal, async () => [{
        url: `${base}-L.jpg?default=false`, thumbnailUrl: `${base}-M.jpg?default=false`,
        providerImageId: `${key}:${value}`, sourceUrl: ids.openLibraryId ? `https://openlibrary.org/${ids.openLibraryId.endsWith('W') ? 'works' : 'books'}/${ids.openLibraryId}` : ids.isbn ? `https://openlibrary.org/isbn/${ids.isbn}` : null
    }]);
}

function googleImageUrl(value) {
    if (typeof value !== 'string') return null;
    try {
        const url = new URL(value);
        if (url.protocol === 'http:' && ['books.google.com', 'books.googleusercontent.com'].includes(url.hostname)) url.protocol = 'https:';
        return safeHttpsUrl(url.href);
    } catch { return null; }
}
export async function searchGoogleBooksMedia(provider, query, { signal } = {}) {
    if (!provider.apiKey) throw createProviderUnavailableError();
    const isbn = query.identifiers.isbn;
    if (!isbn) return [];
    const params = new URLSearchParams({ q: `isbn:${isbn}`, maxResults: '5', printType: 'books', key: provider.apiKey });
    return request(provider, `https://www.googleapis.com/books/v1/volumes?${params}`, {}, signal, async response => {
        const payload = await response.json();
        if (payload.items != null && !Array.isArray(payload.items)) throw createProviderError();
        const candidates = (payload.items ?? []).slice(0, 5).flatMap(volume => {
            const info = volume.volumeInfo;
            if (!Array.isArray(info?.industryIdentifiers) || !info.industryIdentifiers.some(id => ['ISBN_10', 'ISBN_13'].includes(id.type) && typeof id.identifier === 'string' && normalizeIdentifier(id.identifier) === isbn)) return [];
            const links = info.imageLinks ?? {};
            const sizes = ['extraLarge', 'large', 'medium', 'small', 'thumbnail', 'smallThumbnail'];
            const sizeIndex = sizes.findIndex(size => googleImageUrl(links[size]));
            const url = sizeIndex >= 0 ? googleImageUrl(links[sizes[sizeIndex]]) : null;
            if (!url) return [];
            return [{ url, resolutionRank: sizes.length - sizeIndex, thumbnailUrl: googleImageUrl(links.thumbnail) ?? googleImageUrl(links.smallThumbnail),
                sourceUrl: googleImageUrl(info.infoLink) ?? googleImageUrl(info.canonicalVolumeLink),
                providerImageId: typeof volume.id === 'string' ? volume.id : null }];
        });
        return normalizeMediaCandidates(candidates, { provider: 'googlebooks', kind: 'cover' });
    });
}

export async function searchTmdbMedia(provider, query, { signal } = {}) {
    if (!provider.describe().enabled) throw createProviderUnavailableError();
    const id = query.identifiers.tmdbId;
    if (!id) return [];
    return request(provider, `https://api.themoviedb.org/3/movie/${id}/images`, { headers: { Authorization: `Bearer ${provider.readAccessToken}` } }, signal, async response => {
        const payload = await response.json();
        if (!Array.isArray(payload.posters)) throw createProviderError();
        const preferred = [query.metadata.language?.split('-')[0], query.metadata.originalLanguage?.split('-')[0], null].filter((value, index, values) => values.indexOf(value) === index && value !== undefined);
        const rank = value => { const index = preferred.indexOf(value ?? null); return index < 0 ? preferred.length : index; };
        const candidates = payload.posters.filter(poster => /^\/[A-Za-z0-9_.-]+$/.test(poster?.file_path ?? ''))
            .sort((a, b) => rank(a.iso_639_1) - rank(b.iso_639_1) || (Number(b.vote_average) || 0) - (Number(a.vote_average) || 0) || (Number(b.vote_count) || 0) - (Number(a.vote_count) || 0))
            .map(poster => ({ url: `https://image.tmdb.org/t/p/original${poster.file_path}`, thumbnailUrl: `https://image.tmdb.org/t/p/w185${poster.file_path}`,
                sourceUrl: `https://www.themoviedb.org/movie/${id}`, providerImageId: poster.file_path,
                width: poster.width, height: poster.height, language: poster.iso_639_1 }));
        return normalizeMediaCandidates(candidates, { provider: 'tmdb', kind: 'poster' });
    });
}

export async function searchIgdbMedia(provider, query, { signal } = {}) {
    if (!provider.describe().enabled) throw createProviderUnavailableError();
    const id = query.identifiers.igdbId;
    if (!id) return [];
    try {
        const token = await provider.getAccessToken();
        return await request(provider, 'https://api.igdb.com/v4/covers', {
            method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Client-ID': provider.clientId, 'Content-Type': 'text/plain', Accept: 'application/json' },
            body: `fields image_id,url,width,height,game_localization; where game = ${id} | game_localization.game = ${id}; limit 10;`
        }, signal, async response => {
            const payload = await response.json();
            if (!Array.isArray(payload)) throw createProviderError();
            const candidates = payload.slice(0, 10).flatMap(cover => {
                if (!/^[A-Za-z0-9_-]+$/.test(cover?.image_id ?? '')) return [];
                return [{ url: `https://images.igdb.com/igdb/image/upload/t_cover_big/${cover.image_id}.jpg`,
                    thumbnailUrl: `https://images.igdb.com/igdb/image/upload/t_cover_small/${cover.image_id}.jpg`,
                    sourceUrl: null, providerImageId: cover.image_id, providerLocalizationId: cover.game_localization, width: cover.width, height: cover.height }];
            });
            return normalizeMediaCandidates(candidates, { provider: 'igdb', kind: 'cover' });
        });
    } catch (error) {
        if (error?.name === 'AbortError') throw createProviderTimeoutError();
        if (error?.code && error?.statusCode) throw error;
        throw createProviderError();
    }
}
