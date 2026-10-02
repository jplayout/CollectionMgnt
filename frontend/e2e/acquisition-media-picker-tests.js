module.exports = function createAcquisitionMediaTestSupport({ expect, getAdminToken }) {
    const sharp = require('../../backend/node_modules/sharp');

    const isbn = '9782952221702';
    const title = 'La Horde du contrevent';
    const urls = ['https://covers.openlibrary.org/b/isbn/9782952221702-L.jpg', 'https://covers.openlibrary.org/b/id/123-M.jpg'];
    let token;
    let png;

    async function setup() {
        token = getAdminToken();
        png = await sharp({ create: { width: 12, height: 12, channels: 3, background: '#2357a4' } }).png().toBuffer();
    }

    async function openSuggestion(page, { images, results, brokenPreviewUrl } = {}) {
        const traffic = { lookups: 0, media: [], creations: [] };
        page.on('request', request => {
            const path = new URL(request.url()).pathname;
            if (request.method() === 'POST' && ['/api/media', '/api/acquisition/images/import'].includes(path)) traffic.media.push(request);
            if (request.method() === 'POST' && path === '/api/items') traffic.creations.push(request.postDataJSON());
        });
        await page.route('https://covers.openlibrary.org/**', route => route.fulfill({ status: route.request().url() === brokenPreviewUrl ? 404 : 200, contentType: 'image/png', body: route.request().url() === brokenPreviewUrl ? Buffer.alloc(0) : png }));
        await page.route('**/api/acquisition/providers', route => route.fulfill({ json: { providers: [{
            id: 'openlibrary', name: 'Open Library', plugin: 'books', enabled: true, capabilities: ['isbnLookup']
        }] } }));
        await page.route('**/api/acquisition/books/isbn/lookup', route => {
            traffic.lookups += 1;
            return route.fulfill({ json: { query: { plugin: 'books', type: 'isbn', value: isbn }, results: results ?? [{
                title, provider: 'openlibrary', sourceUrl: 'https://openlibrary.org/books/OL123M',
                metadata: { isbn, author: 'Alain Damasio', publisher: 'La Volte' },
                images: images ?? urls.map(url => ({ kind: 'cover', source: 'openlibrary', url }))
            }] } });
        });
        await page.goto('/collections/books/items/new');
        await page.getByRole('textbox', { name: 'ISBN' }).fill(isbn);
        await page.getByRole('button', { name: 'Rechercher', exact: true }).click();
        await expect(page.getByRole('heading', { name: title }).first()).toBeVisible();
        return traffic;
    }

    async function create(page) {
        await page.getByRole('button', { name: 'Créer l’item', exact: true }).click();
        await expect(page).toHaveURL(/\/items\/\d+$/);
        return Number(page.url().match(/\/items\/(\d+)$/)[1]);
    }

    async function deleteItem(request, id) {
        if (id) await request.delete(`/api/items/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    }

    return { setup, openSuggestion, create, deleteItem, isbn, title, urls,
        getToken: () => token, getPng: () => png };
};
