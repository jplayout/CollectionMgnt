import { XMLParser, XMLValidator } from 'fast-xml-parser';

import {
    createProviderError,
    createProviderTimeoutError
} from '../errors.js';
import { normalizeIdentifier } from '../../services/item-validator.js';

const SRU_URL = 'https://catalogue.bnf.fr/api/SRU';
const MAX_RESULTS = 5;
const DEFAULT_TIMEOUT_MS = 8000;

export class BnfProvider {

    constructor({ fetchImpl = globalThis.fetch, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
        this.fetchImpl = fetchImpl;
        this.timeoutMs = timeoutMs;
    }

    describe() {
        return {
            capabilities: ['isbnLookup'],
            enabled: typeof this.fetchImpl === 'function',
            id: 'bnf',
            name: 'BnF',
            plugin: 'books',
            requiresConfiguration: false
        };
    }

    async lookupIsbn(isbn) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
            const query = new URLSearchParams({
                version: '1.2',
                operation: 'searchRetrieve',
                recordSchema: 'dublincore',
                maximumRecords: String(MAX_RESULTS),
                query: `(bib.isbn adj "${isbn}") or (bib.ean adj "${isbn}")`
            });
            const response = await this.fetchImpl(`${SRU_URL}?${query}`, {
                signal: controller.signal
            });
            if (!response.ok) {
                throw createProviderError();
            }
            return mapResponse(isbn, await response.text());
        } catch (error) {
            if (error?.name === 'AbortError') {
                throw createProviderTimeoutError();
            }
            if (error?.code && error?.statusCode) {
                throw error;
            }
            throw createProviderError();
        } finally {
            clearTimeout(timeout);
        }
    }

}

function mapResponse(isbn, xml) {
    // SRU needs no DTD. Reject declarations before parsing external input.
    if (xml.includes('<!DOCTYPE') || xml.includes('<!ENTITY') || XMLValidator.validate(xml) !== true) {
        throw createProviderError();
    }
    const parser = new XMLParser({
        ignoreAttributes: true,
        parseTagValue: false,
        removeNSPrefix: true,
        processEntities: { maxTotalExpansions: 10000, maxExpandedLength: 100000 }
    });
    const response = parser.parse(xml).searchRetrieveResponse;
    if (!response || response.diagnostics || !/^\d+$/.test(response.numberOfRecords ?? '')) {
        throw createProviderError();
    }
    if (Number(response.numberOfRecords) === 0) {
        return [];
    }
    const records = asArray(response.records?.record);
    if (!records.length) {
        throw createProviderError();
    }
    return records.slice(0, MAX_RESULTS)
        .map(record => mapRecord(isbn, record))
        .filter(Boolean);
}

function mapRecord(isbn, record) {
    const dc = record.recordData?.dc;
    if (!dc) {
        return null;
    }
    const identifiers = textValues(dc.identifier);
    const descriptions = textValues(dc.description);
    // Only the dedicated commercial-barcode description identifies the edition;
    // ISBN/EAN references inside free-text descriptions may describe other books.
    const eans = descriptions.filter(value => /^Code à barres commercial\s*:\s*EAN\b/i.test(value));
    const editionIdentifiers = [...identifiers, ...eans]
        .flatMap(value => [...value.matchAll(/\b(?:ISBN(?:-1[03])?|EAN)\s*:?[\s]*([\dX][\dX\s-]*[\dX])\b/gi)])
        .map(match => normalizeIdentifier(match[1]));
    for (const identifier of identifiers) {
        if (/^[\dX\s-]+$/i.test(identifier)) {
            editionIdentifiers.push(normalizeIdentifier(identifier));
        }
    }
    if (!editionIdentifiers.includes(normalizeIdentifier(isbn))) {
        return null;
    }
    const title = textValues(dc.title)[0];
    if (!title) {
        return null;
    }
    const metadata = { isbn, identifiers };
    const authors = [...new Set(textValues(dc.creator))];
    if (authors.length) {
        metadata.author = authors.join(', ');
    }
    const publisher = textValues(dc.publisher)[0];
    if (publisher) {
        metadata.publisher = publisher;
    }
    const date = textValues(dc.date)[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(date ?? '')) {
        metadata.publication_date = date;
    }
    if (/^\d{4}(?:$|-)/.test(date ?? '')) {
        metadata.publication_year = Number(date.slice(0, 4));
    }
    const language = textValues(dc.language)[0];
    if (language) {
        metadata.language = language;
    }
    if (eans.length) {
        metadata.identifiers = [...new Set([...identifiers, ...eans])];
    }
    const ark = getArk([...identifiers, ...textValues(record.recordIdentifier)]);
    if (ark) {
        metadata.ark = ark;
    }
    return {
        confidence: 'high',
        description: descriptions.filter(value => !/^Code à barres commercial\s*:/i.test(value)).join('\n'),
        images: [],
        metadata,
        provider: 'bnf',
        sourceUrl: ark ? `https://catalogue.bnf.fr/${ark}` : '',
        title
    };
}

function getArk(identifiers) {
    for (const identifier of identifiers) {
        if (/^ark:\/12148\/cb[\da-z]+$/i.test(identifier)) {
            return identifier;
        }
        try {
            const url = new URL(identifier);
            const ark = url.pathname.slice(1);
            if (url.hostname === 'catalogue.bnf.fr' && /^ark:\/12148\/cb[\da-z]+$/i.test(ark)) {
                return ark;
            }
        } catch {
            // Non-URL identifiers (including ISBNs) are expected.
        }
    }
    return '';
}

function asArray(value) {
    return value === undefined ? [] : Array.isArray(value) ? value : [value];
}

function textValues(value) {
    return asArray(value)
        .map(entry => typeof entry === 'string' ? entry : entry?.['#text'])
        .filter(entry => typeof entry === 'string' && entry.trim())
        .map(entry => entry.trim());
}
