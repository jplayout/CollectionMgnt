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

function bookSuggestion({
    title = 'Fantastic Mr. Fox'
} = {}) {

    return {
        confidence:
            'high',
        description:
            'A clever fox outwits three farmers.',
        images: [
            {
                kind:
                    'cover',
                source:
                    'test-provider',
                url:
                    'data:image/gif;base64,R0lGODlhAQABAAAAACw='
            }
        ],
        metadata: {
            author:
                'Roald Dahl',
            isbn:
                '9780140328721',
            publication_date:
                '1988-01-01',
            publisher:
                'Puffin'
        },
        provider:
            'test-provider',
        sourceUrl:
            'https://example.test/books/fantastic-mr-fox',
        title
    };

}

async function mockLookup(page, handler) {

    await page.route(
        '**/api/acquisition/books/isbn/lookup',
        async route => {

            await handler(
                route
            );

        }
    );

}

test(
    'admin can lookup an ISBN, apply the suggestion and create a book',
    async ({ page }) => {

        await mockProviders(
            page
        );

        await mockLookup(
            page,
            async route => {

                const body =
                    route.request().postDataJSON();

                expect(
                    body
                ).toEqual({
                    isbn:
                        '9780140328721'
                });

                await route.fulfill({
                    contentType:
                        'application/json',
                    json: {
                        query: {
                            plugin:
                                'books',
                            type:
                                'isbn',
                            value:
                                '9780140328721'
                        },
                        results: [
                            bookSuggestion()
                        ]
                    }
                });

            }
        );

        await openBookCreatePage(
            page
        );

        await page.getByLabel(
            'ISBN'
        ).fill(
            '9780140328721'
        );

        await page.getByRole(
            'button',
            {
                name:
                    'Rechercher'
            }
        ).click();

        await expect(
            page.getByRole(
                'heading',
                {
                    name:
                        'Fantastic Mr. Fox'
                }
            )
        ).toBeVisible();

        await page.getByRole(
            'button',
            {
                name:
                    'Utiliser'
            }
        ).click();

        await expect(
            page.getByLabel(
                'Titre'
            )
        ).toHaveValue(
            'Fantastic Mr. Fox'
        );

        await expect(
            page.getByLabel(
                'Description'
            )
        ).toHaveValue(
            'A clever fox outwits three farmers.'
        );

        await expect(
            page.getByLabel(
                'Auteur'
            )
        ).toHaveValue(
            'Roald Dahl'
        );

        await expect(
            page.getByLabel(
                'Éditeur'
            )
        ).toHaveValue(
            'Puffin'
        );

        await expect(
            page.getByLabel(
                'Date de publication'
            )
        ).toHaveValue(
            '1988-01-01'
        );

        await page.getByRole(
            'button',
            {
                name:
                    'Créer l’item'
            }
        ).click();

        await expect(
            page
        ).toHaveURL(
            /\/items\/\d+/
        );

        await expect(
            page.getByRole(
                'heading',
                {
                    name:
                        'Fantastic Mr. Fox'
                }
            )
        ).toBeVisible();

    }
);

test(
    'ISBN lookup with no result keeps the form usable',
    async ({ page }) => {

        await mockProviders(
            page
        );

        await mockLookup(
            page,
            async route => {

                await route.fulfill({
                    contentType:
                        'application/json',
                    json: {
                        query: {
                            plugin:
                                'books',
                            type:
                                'isbn',
                            value:
                                '9780140328721'
                        },
                        results: []
                    }
                });

            }
        );

        await openBookCreatePage(
            page
        );

        await page.getByLabel(
            'ISBN'
        ).fill(
            '9780140328721'
        );

        await page.getByRole(
            'button',
            {
                name:
                    'Rechercher'
            }
        ).click();

        await expect(
            page.getByText(
                'Aucun résultat trouvé'
            )
        ).toBeVisible();

        await page.getByLabel(
            'Titre'
        ).fill(
            'Saisie manuelle'
        );

        await expect(
            page.getByLabel(
                'Titre'
            )
        ).toHaveValue(
            'Saisie manuelle'
        );

    }
);

test(
    'applying a suggestion does not overwrite an already filled title',
    async ({ page }) => {

        await mockProviders(
            page
        );

        await mockLookup(
            page,
            async route => {

                await route.fulfill({
                    contentType:
                        'application/json',
                    json: {
                        query: {
                            plugin:
                                'books',
                            type:
                                'isbn',
                            value:
                                '9780140328721'
                        },
                        results: [
                            bookSuggestion({
                                title:
                                    'Provider Title'
                            })
                        ]
                    }
                });

            }
        );

        await openBookCreatePage(
            page
        );

        await page.getByLabel(
            'Titre'
        ).fill(
            'Titre manuel'
        );

        await page.getByLabel(
            'ISBN'
        ).fill(
            '9780140328721'
        );

        await page.getByRole(
            'button',
            {
                name:
                    'Rechercher'
            }
        ).click();

        await page.getByRole(
            'button',
            {
                name:
                    'Utiliser'
            }
        ).click();

        await expect(
            page.getByLabel(
                'Titre'
            )
        ).toHaveValue(
            'Titre manuel'
        );

        await expect(
            page.getByLabel(
                'Auteur'
            )
        ).toHaveValue(
            'Roald Dahl'
        );

    }
);

test(
    'ISBN lookup errors are readable and keep the form usable',
    async ({ page }) => {

        await mockProviders(
            page
        );

        await mockLookup(
            page,
            async route => {

                await route.fulfill({
                    contentType:
                        'application/json',
                    json: {
                        code:
                            'provider_timeout',
                        error:
                            'provider_timeout',
                        message:
                            'Provider timeout'
                    },
                    status:
                        504
                });

            }
        );

        await openBookCreatePage(
            page
        );

        await page.getByLabel(
            'ISBN'
        ).fill(
            '9780140328721'
        );

        await page.getByRole(
            'button',
            {
                name:
                    'Rechercher'
            }
        ).click();

        await expect(
            page.getByText(
                'La recherche a expiré'
            )
        ).toBeVisible();

        await page.getByLabel(
            'Titre'
        ).fill(
            'Saisie après erreur'
        );

        await expect(
            page.getByLabel(
                'Titre'
            )
        ).toHaveValue(
            'Saisie après erreur'
        );

    }
);
