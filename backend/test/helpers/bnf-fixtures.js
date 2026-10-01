import { readFileSync } from 'node:fs';

export function bnfFixture(isbn = '9782952221702') {
    const name = isbn === '9782952221702' ? 'ean' : 'isbn';
    return readFileSync(new URL(`../fixtures/bnf/${name}-${isbn}.xml`, import.meta.url), 'utf8');
}

export function sruFixture(records = []) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<srw:searchRetrieveResponse xmlns:srw="http://www.loc.gov/zing/srw/"
 xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/">
 <srw:version>1.2</srw:version><srw:numberOfRecords>${records.length}</srw:numberOfRecords>
 <srw:records>${records.map(dc => `<srw:record><srw:recordSchema>dc</srw:recordSchema>
 <srw:recordData><oai_dc:dc>${dc}</oai_dc:dc></srw:recordData></srw:record>`).join('')}</srw:records>
</srw:searchRetrieveResponse>`;
}

export function xmlResponse(xml = sruFixture()) {
    return new Response(xml, { status: 200, headers: { 'content-type': 'application/xml' } });
}
