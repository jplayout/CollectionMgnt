import { AcquisitionError, createProviderError, createProviderTimeoutError, createProviderUnavailableError } from './errors.js';
import { isValidIsbn, normalizeIdentifier } from '../services/item-validator.js';
import { normalizeMediaCandidates } from './media-candidate.js';

export const MAX_MEDIA_SEARCH_RESULTS = 20;
export const MAX_PROVIDER_MEDIA_RESULTS = 10;
const PLUGINS = { books: { kind: 'cover', ids: ['isbn', 'openLibraryCoverId', 'openLibraryId'] }, movies: { kind: 'poster', ids: ['tmdbId'] }, games: { kind: 'cover', ids: ['igdbId'] } };

export class MediaSearchService {
    constructor({ providerRegistry, timeoutMs = 5000 }) {
        this.providerRegistry = providerRegistry;
        this.timeoutMs = timeoutMs;
    }

    async search(input) {
        const query = validateMediaSearchQuery(input);
        const providers = this.providerRegistry.getProvidersFor({ plugin: query.plugin, capability: 'mediaSearch' });
        if (!providers.length) throw createProviderUnavailableError();
        const outcomes = await Promise.all(providers.map(async provider => {
            const id = provider.describe().id;
            try {
                const results = await this.searchProvider(provider, query);
                return { results: normalizeMediaCandidates(results, { provider: id, kind: query.kind, limit: MAX_PROVIDER_MEDIA_RESULTS }) };
            } catch (error) {
                return { warning: { provider: id, code: stableCode(error) } };
            }
        }));
        const warnings = outcomes.flatMap(outcome => outcome.warning ? [outcome.warning] : []);
        if (warnings.length === providers.length) {
            const error = errorFromCode(warnings[0].code);
            // Only stable provider IDs/codes are exposed, never upstream messages.
            error.warnings = warnings;
            throw error;
        }
        const seenUrls = new Set();
        const seenIds = new Set();
        const results = outcomes.flatMap(outcome => outcome.results ?? []).filter(candidate => {
            const id = candidate.providerImageId ? `${candidate.provider}:${candidate.providerImageId}` : null;
            if (seenUrls.has(candidate.url) || (id && seenIds.has(id))) return false;
            seenUrls.add(candidate.url);
            if (id) seenIds.add(id);
            return true;
        }).slice(0, MAX_MEDIA_SEARCH_RESULTS);
        return { query, results, warnings, incomplete: warnings.length > 0 };
    }

    async searchProvider(provider, query) {
        const controller = new AbortController();
        let timer;
        const timeout = new Promise((_resolve, reject) => {
            timer = setTimeout(() => {
                controller.abort();
                reject(createProviderTimeoutError());
            }, provider.timeoutMs ?? this.timeoutMs);
        });
        try {
            return await Promise.race([provider.mediaSearch(query, { signal: controller.signal }), timeout]);
        } finally { clearTimeout(timer); }
    }
}

export function validateMediaSearchQuery(input) {
    const invalid = () => { throw new AcquisitionError(400, 'invalid_media_search', 'Invalid media search query'); };
    if (!record(input) || Object.keys(input).some(key => !['plugin', 'kind', 'identifiers', 'title', 'metadata'].includes(key))) invalid();
    if (typeof input.plugin !== 'string' || typeof input.kind !== 'string') invalid();
    const config = Object.hasOwn(PLUGINS, input.plugin ?? '') ? PLUGINS[input.plugin] : null;
    if (!config || input.kind !== config.kind || !record(input.identifiers)) invalid();
    if (Object.keys(input.identifiers).some(key => !config.ids.includes(key))) invalid();
    const identifiers = {};
    for (const [key, value] of Object.entries(input.identifiers)) {
        if (key === 'isbn') {
            if (typeof value !== 'string' || value.length > 30 || !isValidIsbn(value)) invalid();
            identifiers.isbn = normalizeIdentifier(value);
        } else if (key === 'openLibraryId') {
            if (typeof value !== 'string' || !/^OL\d{1,12}[MW]$/.test(value)) invalid();
            identifiers[key] = value;
        } else {
            if (!Number.isSafeInteger(value) || value <= 0 || value > 2147483647) invalid();
            identifiers[key] = value;
        }
    }
    if (!Object.keys(identifiers).length) invalid();
    const title = input.title == null ? null : boundedText(input.title, 300, invalid);
    const metadata = {};
    if (input.metadata != null && !record(input.metadata)) invalid();
    for (const [key, value] of Object.entries(input.metadata ?? {})) {
        if (!['author', 'language', 'originalLanguage'].includes(key)) invalid();
        if (value == null) continue;
        metadata[key] = boundedText(value, key === 'author' ? 200 : 35, invalid);
        if (key !== 'author' && !/^[a-z]{2,3}(?:-[A-Za-z]{2,4})?$/.test(metadata[key])) invalid();
    }
    return { plugin: input.plugin, kind: input.kind, identifiers, title, metadata };
}
function record(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function boundedText(value, max, invalid) {
    if (typeof value !== 'string' || !value.trim() || value.length > max) invalid();
    return value.trim();
}
function stableCode(error) {
    if (error?.name === 'AbortError') return 'provider_timeout';
    return ['provider_timeout', 'provider_unavailable'].includes(error?.code) ? error.code : 'provider_error';
}
function errorFromCode(code) {
    return code === 'provider_timeout' ? createProviderTimeoutError() : code === 'provider_unavailable' ? createProviderUnavailableError() : createProviderError();
}
