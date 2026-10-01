import assert from 'node:assert/strict';
import { test } from 'node:test';

import { BnfProvider } from '../../src/acquisition/providers/bnf-provider.js';
import { bnfFixture, sruFixture, xmlResponse } from '../helpers/bnf-fixtures.js';

test('BnF is a public books/isbnLookup provider enabled only when fetch exists', () => {
    assert.deepEqual(new BnfProvider({ fetchImpl: async () => {} }).describe(), {
        id: 'bnf', name: 'BnF', plugin: 'books', capabilities: ['isbnLookup'],
        requiresConfiguration: false, enabled: true
    });
    assert.equal(new BnfProvider({ fetchImpl: null }).describe().enabled, false);
});

for (const [isbn, year, ark] of [
    ['9782813206596', 2013, 'ark:/12148/cb43716047d'],
    ['9782952221702', 2004, 'ark:/12148/cb401159952'],
    ['9791036362842', 2023, 'ark:/12148/cb47357919k']
]) {
    test(`BnF maps real SRU fixture ${isbn} with a single combined ISBN/EAN request`, async () => {
        const calls = [];
        const provider = new BnfProvider({
            fetchImpl: async (url, options) => {
                calls.push(url);
                const parsed = new URL(url);
                assert.equal(parsed.origin + parsed.pathname, 'https://catalogue.bnf.fr/api/SRU');
                assert.deepEqual(Object.fromEntries(parsed.searchParams), {
                    version: '1.2', operation: 'searchRetrieve', recordSchema: 'dublincore',
                    maximumRecords: '5', query: `(bib.isbn adj "${isbn}") or (bib.ean adj "${isbn}")`
                });
                assert.ok(options.signal instanceof AbortSignal);
                assert.equal(options.headers, undefined);
                return xmlResponse(bnfFixture(isbn));
            }
        });
        const results = await provider.lookupIsbn(isbn);
        assert.equal(calls.length, 1);
        assert.equal(results.length, 1);
        const book = results[0];
        assert.equal(book.provider, 'bnf');
        assert.equal(book.confidence, 'high');
        assert.ok(book.title);
        assert.ok(book.metadata.author);
        assert.ok(book.metadata.publisher);
        assert.equal(book.metadata.isbn, isbn);
        assert.equal(book.metadata.publication_year, year);
        assert.equal(book.metadata.publication_date, undefined);
        assert.equal(book.metadata.language, 'fre');
        assert.equal(book.metadata.ark, ark);
        assert.equal(book.sourceUrl, `https://catalogue.bnf.fr/${ark}`);
        assert.deepEqual(book.images, []);
        assert.equal(book.description, '');
        if (isbn === '9782952221702') {
            assert.ok(book.metadata.identifiers.includes('ISBN 2952221707'));
            assert.ok(book.metadata.identifiers.includes('Code à barres commercial : EAN 9782952221702'));
        }
    });
}

test('BnF handles multiple matching notices, XML entities, repeated creators and different namespace prefixes', async () => {
    const record = `<dc:title>Roues &amp; stratégie</dc:title><dc:identifier>ISBN 978-2-8132-0659-6</dc:identifier>
        <dc:creator>Musashi</dc:creator><dc:creator>Translator</dc:creator>
        <dc:description>A useful description.</dc:description><dc:date>2013-04-12</dc:date>`;
    const xml = sruFixture([record, record, '<dc:title>Wrong edition</dc:title><dc:identifier>ISBN 9791036362842</dc:identifier>'])
        .replaceAll('srw:', 's:').replace('xmlns:srw=', 'xmlns:s=')
        .replaceAll('<dc:', '<d:').replaceAll('</dc:', '</d:').replace('xmlns:dc=', 'xmlns:d=');
    const books = await new BnfProvider({ fetchImpl: async () => xmlResponse(xml) }).lookupIsbn('9782813206596');
    assert.equal(books.length, 2);
    assert.equal(books[0].title, 'Roues & stratégie');
    assert.equal(books[0].metadata.author, 'Musashi, Translator');
    assert.equal(books[0].metadata.publication_date, '2013-04-12');
    assert.equal(books[0].description, 'A useful description.');
});

test('BnF handles a default SRU namespace and incomplete matching metadata without inventing fields', async () => {
    const xml = sruFixture(['<dc:title>Minimal</dc:title><dc:identifier>ISBN 9782813206596</dc:identifier>'])
        .replaceAll('srw:', '').replace('xmlns:srw=', 'xmlns=');
    const books = await new BnfProvider({ fetchImpl: async () => xmlResponse(xml) }).lookupIsbn('9782813206596');
    assert.deepEqual(books, [{
        confidence: 'high', description: '', images: [], provider: 'bnf', sourceUrl: '', title: 'Minimal',
        metadata: { isbn: '9782813206596', identifiers: ['ISBN 9782813206596'] }
    }]);
});

test('BnF rejects notices without an exact matching ISBN/EAN or a usable title', async () => {
    const xml = sruFixture([
        '<dc:title>Wrong ISBN</dc:title><dc:identifier>ISBN 9791036362842</dc:identifier>',
        '<dc:title>Related book only</dc:title><dc:identifier>ISBN 9791036362842</dc:identifier><dc:description>See also ISBN 9782813206596 or EAN 9782813206596.</dc:description>',
        '<dc:title>Without identifier</dc:title>',
        '<dc:identifier>ISBN 9782813206596</dc:identifier>'
    ]);
    assert.deepEqual(await new BnfProvider({ fetchImpl: async () => xmlResponse(xml) }).lookupIsbn('9782813206596'), []);
});

test('BnF returns an empty result for a valid zero-record SRU response', async () => {
    assert.deepEqual(await new BnfProvider({ fetchImpl: async () => xmlResponse() }).lookupIsbn('9782813206596'), []);
});

for (const xml of [
    '<srw:searchRetrieveResponse>',
    '<html>Not SRU</html>',
    '<searchRetrieveResponse><numberOfRecords>1</numberOfRecords></searchRetrieveResponse>',
    '<searchRetrieveResponse><numberOfRecords>0</numberOfRecords><diagnostics><diagnostic>Failure</diagnostic></diagnostics></searchRetrieveResponse>',
    '<!DOCTYPE a [<!ENTITY secret SYSTEM "file:///etc/passwd">]><a>&secret;</a>'
]) {
    test(`BnF maps malformed XML, SRU diagnostics and forbidden DTD to provider_error: ${xml.slice(0,45)}`, async () => {
        const provider = new BnfProvider({ fetchImpl: async () => xmlResponse(xml) });
        await assert.rejects(() => provider.lookupIsbn('9782813206596'), {
            code: 'provider_error', statusCode: 503, message: 'Provider lookup failed'
        });
    });
}

for (const status of [400, 404, 429, 500, 503]) {
    test(`BnF maps HTTP ${status} to a technical error, not an empty lookup`, async () => {
        const provider = new BnfProvider({ fetchImpl: async () => new Response('Private error', { status }) });
        await assert.rejects(() => provider.lookupIsbn('9782813206596'), {
            code: 'provider_error', statusCode: 503, message: 'Provider lookup failed'
        });
    });
}

test('BnF maps transport errors without leaking their message', async () => {
    const provider = new BnfProvider({ fetchImpl: async () => { throw new Error('Private network detail'); } });
    await assert.rejects(() => provider.lookupIsbn('9782813206596'), {
        code: 'provider_error', statusCode: 503, message: 'Provider lookup failed'
    });
});

test('BnF aborts timed-out requests using the existing provider_timeout contract', async () => {
    const provider = new BnfProvider({
        timeoutMs: 5,
        fetchImpl: async (_url, { signal }) => new Promise((_resolve, reject) => {
            signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
        })
    });
    await assert.rejects(() => provider.lookupIsbn('9782813206596'), {
        code: 'provider_timeout', statusCode: 504
    });
});
