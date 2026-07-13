const {
    expect,
    test
} = require('@playwright/test');

const adminUsername =
    'admin';

const adminPassword =
    'e2e-admin-password';

let adminToken;

test.beforeAll(
    async ({ request }) => {

        const response =
            await request.post(
                '/api/auth/login',
                {
                    data: {
                        password:
                            adminPassword,
                        username:
                            adminUsername
                    }
                }
            );

        expect(
            response.ok()
        ).toBeTruthy();

        const body =
            await response.json();

        adminToken =
            body.token;

    }
);

test.beforeEach(
    async ({ page }) => {

        await page.addInitScript(
            token => {

                window.sessionStorage.setItem(
                    'auth_token',
                    token
                );

            },
            adminToken
        );

    }
);


async function mockProviders(page) {

    await page.route(
        '**/api/acquisition/providers',
        async route => {

            await route.fulfill({
                contentType:
                    'application/json',
                json: {
                    providers: [
                        {
                            capabilities: [
                                'isbnLookup'
                            ],
                            enabled:
                                true,
                            id:
                                'test-provider',
                            name:
                                'Test Provider',
                            plugin:
                                'books',
                            requiresConfiguration:
                                false
                        }
                    ]
                }
            });

        }
    );

}


async function mockGameProviders(page) {

    await page.route(
        '**/api/acquisition/providers',
        async route => {

            await route.fulfill({
                contentType:
                    'application/json',
                json: {
                    providers: [
                        {
                            capabilities: [
                                'games/search'
                            ],
                            enabled:
                                true,
                            id:
                                'igdb',
                            name:
                                'IGDB',
                            plugin:
                                'games',
                            requiresConfiguration:
                                true,
                            type:
                                'metadata'
                        }
                    ]
                }
            });

        }
    );

}

async function openBookCreatePage(page) {

    await page.goto(
        '/collections/books/items/new'
    );

    await expect(
        page.getByRole(
            'heading',
            {
                name:
                    'Nouvel item'
            }
        )
    ).toBeVisible();

}

async function openMovieCreatePage(page) {

    await page.goto(
        '/collections/movies/items/new'
    );

    await expect(
        page.getByRole(
            'heading',
            {
                name:
                    'Nouvel item'
            }
        )
    ).toBeVisible();

}

async function openGameCreatePage(page) {

    await page.goto(
        '/collections/games/items/new'
    );

    await expect(
        page.getByRole(
            'heading',
            {
                name:
                    'Nouvel item'
            }
        )
    ).toBeVisible();

}

async function mockCameraScan(
    page,
    {
        delayMs = 0,
        format = 'ean_13',
        rawValue,
        results,
        resultsByCall
    }
) {

    await page.addInitScript(
        options => {

            class BarcodeDetectorMock {

                static detectCalls =
                    0;

                static async getSupportedFormats() {

                    return [
                        'ean_13',
                        'upc_a'
                    ];

                }

                async detect() {

                    BarcodeDetectorMock.detectCalls +=
                        1;

                    if (
                        Array.isArray(
                            options.resultsByCall
                        )
                    ) {

                        const index =
                            Math.min(
                                BarcodeDetectorMock.detectCalls - 1,
                                options.resultsByCall.length - 1
                            );

                        return options.resultsByCall[index];

                    }

                    if (
                        Array.isArray(
                            options.results
                        )
                    ) {

                        return options.results;

                    }

                    return [
                        {
                            format:
                                options.format,
                            rawValue:
                                options.rawValue
                        }
                    ];

                }

            }

            Object.defineProperty(
                window,
                'BarcodeDetector',
                {
                    configurable:
                        true,
                    value:
                        BarcodeDetectorMock
                }
            );

            Object.defineProperty(
                navigator,
                'mediaDevices',
                {
                    configurable:
                        true,
                    value: {
                        getUserMedia: async () => {

                            if (
                                options.delayMs > 0
                            ) {

                                await new Promise(
                                    resolve => window.setTimeout(
                                        resolve,
                                        options.delayMs
                                    )
                                );

                            }

                            const canvas =
                                document.createElement(
                                    'canvas'
                                );

                            canvas.width =
                                4;

                            canvas.height =
                                4;

                            const context =
                                canvas.getContext(
                                    '2d'
                                );

                            context.fillStyle =
                                '#ffffff';

                            context.fillRect(
                                0,
                                0,
                                4,
                                4
                            );

                            return canvas.captureStream(
                                1
                            );

                        }
                    }
                }
            );

        },
        {
            delayMs,
            format,
            rawValue,
            results,
            resultsByCall
        }
    );

}

async function countLookupRequests(page, pattern) {

    let count =
        0;

    await page.route(
        pattern,
        async route => {

            count +=
                1;

            await route.fulfill({
                contentType:
                    'application/json',
                json: {
                    query:
                        null,
                    results: []
                }
            });

        }
    );

    return () => count;

}


test(
    'camera scanner fills the first valid Bookland ISBN without launching lookup automatically',
    async ({ page }) => {

        await mockCameraScan(
            page,
            {
                delayMs:
                    200,
                results: [
                    {
                        format:
                            'upc_a',
                        rawValue:
                            '012345678905'
                    },
                    {
                        format:
                            'ean_13',
                        rawValue:
                            '4006381333931'
                    },
                    {
                        format:
                            'ean_13',
                        rawValue:
                            '978-0-14-032872-1'
                    }
                ]
            }
        );

        await mockProviders(
            page
        );

        const getLookupCount =
            await countLookupRequests(
                page,
                '**/api/acquisition/books/isbn/lookup'
            );

        await openBookCreatePage(
            page
        );

        await page.getByRole(
            'button',
            {
                name:
                    'Scanner le champ ISBN'
            }
        ).click();

        await expect(
            page.getByRole(
                'dialog',
                {
                    name:
                        'Scanner un code-barres'
                }
            )
        ).toBeVisible();

        await expect(
            page.getByRole(
            'textbox',
            {
                name:
                    'ISBN'
            }
        )
        ).toHaveValue(
            '9780140328721'
        );

        await expect(
            page.getByText(
                'ISBN invalide'
            )
        ).toBeHidden();

        expect(
            getLookupCount()
        ).toBe(
            0
        );

        await expect(
            page.getByRole(
                'button',
                {
                    name:
                        'Rechercher'
                }
            )
        ).toBeEnabled();

    }
);

test(
    'camera scanner fills a barcode field without launching search automatically',
    async ({ page }) => {

        await mockCameraScan(
            page,
            {
                format:
                    'upc_a',
                rawValue:
                    '012345678905'
            }
        );

        await mockGameProviders(
            page
        );

        const getSearchCount =
            await countLookupRequests(
                page,
                '**/api/acquisition/games/search'
            );

        await openGameCreatePage(
            page
        );

        await page.getByLabel(
            'Titre'
        ).fill(
            'Manual Game'
        );

        await page.getByRole(
            'button',
            {
                name:
                    'Scanner le champ Code-barres'
            }
        ).click();

        await expect(
            page.getByRole(
                'textbox',
                {
                    name:
                        'Code-barres'
                }
            )
        ).toHaveValue(
            '012345678905'
        );

        expect(
            getSearchCount()
        ).toBe(
            0
        );

        await expect(
            page.getByRole(
                'button',
                {
                    name:
                        'Rechercher'
                }
            )
        ).toBeEnabled();

    }
);

test(
    'camera scanner fills barcode fields from plugins without acquisition lookup',
    async ({ page }) => {

        await mockCameraScan(
            page,
            {
                rawValue:
                    '4006381333931'
            }
        );

        await page.goto(
            '/collections/others/items/new'
        );

        await expect(
            page.getByRole(
                'heading',
                {
                    name:
                        'Nouvel item'
                }
            )
        ).toBeVisible();

        await page.getByRole(
            'button',
            {
                name:
                    'Scanner le champ Code-barres'
            }
        ).click();

        await expect(
            page.getByRole(
                'textbox',
                {
                    name:
                        'Code-barres'
                }
            )
        ).toHaveValue(
            '4006381333931'
        );

    }
);

test(
    'camera scanner ignores invalid ISBN candidates and keeps scanning',
    async ({ page }) => {

        await mockCameraScan(
            page,
            {
                resultsByCall: [
                    [
                        {
                            format:
                                'ean_13',
                            rawValue:
                                '1234567890123'
                        },
                        {
                            format:
                                'upc_a',
                            rawValue:
                                '012345678905'
                        }
                    ],
                    [
                        {
                            format:
                                'ean_13',
                            rawValue:
                                '9780140328721'
                        }
                    ]
                ]
            }
        );

        await mockProviders(
            page
        );

        const getLookupCount =
            await countLookupRequests(
                page,
                '**/api/acquisition/books/isbn/lookup'
            );

        await openBookCreatePage(
            page
        );

        await page.getByRole(
            'button',
            {
                name:
                    'Scanner le champ ISBN'
            }
        ).click();

        await expect(
            page.getByRole(
                'textbox',
                {
                    name:
                        'ISBN'
                }
            )
        ).toHaveValue(
            '9780140328721'
        );

        await expect(
            page.getByText(
                'ISBN invalide'
            )
        ).toBeHidden();

        expect(
            getLookupCount()
        ).toBe(
            0
        );

    }
);

test(
    'camera scanner leaves an existing ISBN untouched while non-ISBN codes are ignored',
    async ({ page }) => {

        await mockCameraScan(
            page,
            {
                results: [
                    {
                        format:
                            'ean_13',
                        rawValue:
                            '4006381333931'
                    },
                    {
                        format:
                            'upc_a',
                        rawValue:
                            '012345678905'
                    }
                ]
            }
        );

        await mockProviders(
            page
        );

        const getLookupCount =
            await countLookupRequests(
                page,
                '**/api/acquisition/books/isbn/lookup'
            );

        await openBookCreatePage(
            page
        );

        await page.getByRole(
            'textbox',
            {
                name:
                    'ISBN'
            }
        ).fill(
            '9780140328721'
        );

        await page.getByRole(
            'button',
            {
                name:
                    'Scanner le champ ISBN'
            }
        ).click();

        await expect(
            page.getByRole(
                'dialog',
                {
                    name:
                        'Scanner un code-barres'
                }
            )
        ).toBeVisible();

        await expect(
            page.getByRole(
                'textbox',
                {
                    name:
                        'ISBN'
                }
            )
        ).toHaveValue(
            '9780140328721'
        );

        await expect(
            page.getByText(
                'Code scanné invalide'
            )
        ).toBeHidden();

        expect(
            getLookupCount()
        ).toBe(
            0
        );

    }
);

test(
    'camera scanner only appears on scannable dynamic fields and applies to the opener field',
    async ({ page }) => {

        await page.goto(
            '/'
        );

        await page.evaluate(
            async () => {

                const {
                    createApp,
                    h
                } = await import(
                    '/node_modules/.vite/deps/vue.js'
                );

                const {
                    default: DynamicForm
                } = await import(
                    '/src/components/forms/DynamicForm.vue'
                );

                window.scanValue =
                    '4006381333931';

                const root =
                    document.createElement(
                        'div'
                    );

                document.body.append(
                    root
                );

                createApp({
                    render: () => h(
                        DynamicForm,
                        {
                            enableAcquisitionSearch:
                                false,
                            fields: [
                                {
                                    label:
                                        'Plain text',
                                    name:
                                        'plain_text',
                                    type:
                                        'text'
                                },
                                {
                                    label:
                                        'Primary barcode',
                                    name:
                                        'primary_barcode',
                                    type:
                                        'barcode'
                                },
                                {
                                    label:
                                        'Secondary barcode',
                                    name:
                                        'secondary_barcode',
                                    type:
                                        'barcode'
                                }
                            ],
                            pluginId:
                                'custom',
                            scannerFactory: () => ({
                                start: async ({ onResult }) => onResult({
                                    adapter:
                                        'native',
                                    format:
                                        'ean_13',
                                    rawValue:
                                        window.scanValue
                                }),
                                stop: () => {}
                            })
                        }
                    )
                }).mount(
                    root
                );

            }
        );

        await expect(
            page.getByRole(
                'button',
                {
                    name:
                        'Scanner le champ Plain text'
                }
            )
        ).toHaveCount(
            0
        );

        await expect(
            page.getByRole(
                'button',
                {
                    name:
                        /Scanner le champ/
                }
            )
        ).toHaveCount(
            2
        );

        await page.getByRole(
            'button',
            {
                name:
                    'Scanner le champ Secondary barcode'
            }
        ).click();

        await expect(
            page.getByRole(
                'textbox',
                {
                    name:
                        'Primary barcode'
                }
            )
        ).toHaveValue(
            ''
        );

        await expect(
            page.getByRole(
                'textbox',
                {
                    name:
                        'Secondary barcode'
                }
            )
        ).toHaveValue(
            '4006381333931'
        );

    }
);

test(
    'camera scanner can be closed without filling the field',
    async ({ page }) => {

        await mockCameraScan(
            page,
            {
                delayMs:
                    1000,
                rawValue:
                    '9780140328721'
            }
        );

        await mockProviders(
            page
        );

        await openBookCreatePage(
            page
        );

        await page.getByRole(
            'button',
            {
                name:
                    'Scanner le champ ISBN'
            }
        ).click();

        await page.getByRole(
            'button',
            {
                name:
                    'Fermer le scanner camera'
            }
        ).click();

        await expect(
            page.getByRole(
                'dialog',
                {
                    name:
                        'Scanner un code-barres'
                }
            )
        ).toBeHidden();

        await expect(
            page.getByRole(
            'textbox',
            {
                name:
                    'ISBN'
            }
        )
        ).toHaveValue(
            ''
        );

    }
);
