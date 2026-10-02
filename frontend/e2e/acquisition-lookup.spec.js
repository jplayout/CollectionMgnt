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

async function mockMovieProviders(page) {

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
                                'movies/search'
                            ],
                            enabled:
                                true,
                            id:
                                'tmdb',
                            name:
                                'The Movie Database (TMDb)',
                            plugin:
                                'movies',
                            requiresConfiguration:
                                true
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

function movieSuggestion({
    title = 'Blade Runner'
} = {}) {

    return {
        confidence:
            'high',
        description:
            'A blade runner must pursue replicants.',
        images: [
            {
                kind:
                    'cover',
                source:
                    'tmdb',
                url:
                    'data:image/gif;base64,R0lGODlhAQABAAAAACw='
            }
        ],
        metadata: {
            originalLanguage:
                'en',
            originalTitle:
                title,
            releaseDate:
                '1982-06-25',
            releaseYear:
                '1982',
            tmdbId:
                78
        },
        provider:
            'tmdb',
        sourceUrl:
            'https://www.themoviedb.org/movie/78',
        title
    };

}

function gameSuggestion({
    title = 'Elden Ring'
} = {}) {

    return {
        confidence:
            'high',
        description:
            'Become an Elden Lord.',
        images: [
            {
                kind:
                    'cover',
                source:
                    'igdb',
                url:
                    'data:image/gif;base64,R0lGODlhAQABAAAAACw='
            }
        ],
        metadata: {
            developer:
                'FromSoftware',
            genres: [
                'Role-playing (RPG)',
                'Adventure'
            ],
            igdbId:
                119133,
            platforms: [
                'PlayStation 5',
                'Windows PC'
            ],
            publisher:
                'Bandai Namco Entertainment',
            releaseDate:
                '2022-02-25'
        },
        provider:
            'igdb',
        sourceUrl:
            'https://www.igdb.com/games/elden-ring',
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

async function mockMovieSearch(page, handler) {

    await page.route(
        '**/api/acquisition/movies/search',
        async route => {

            await handler(
                route
            );

        }
    );

}

async function mockGameSearch(page, handler) {

    await page.route(
        '**/api/acquisition/games/search',
        async route => {

            await handler(
                route
            );

        }
    );

}

test('BnF suggestion displays its source and fills a book without inventing a publication date', async ({ page }) => {
    await page.route('**/api/acquisition/providers', async route => {
        await route.fulfill({ json: { providers: [{
            id: 'bnf', name: 'BnF', plugin: 'books', capabilities: ['isbnLookup'],
            enabled: true, requiresConfiguration: false
        }] } });
    });
    await mockLookup(page, async route => {
        expect(route.request().postDataJSON()).toEqual({ isbn: '9782952221702' });
        await route.fulfill({ json: {
            query: { plugin: 'books', type: 'isbn', value: '9782952221702' },
            results: [{
                provider: 'bnf', confidence: 'high', title: 'La Horde du contrevent',
                description: 'Une notice du catalogue général.', images: [],
                sourceUrl: 'https://catalogue.bnf.fr/ark:/12148/cb401159952',
                metadata: {
                    isbn: '9782952221702', author: 'Damasio, Alain', publisher: 'la Volte',
                    publication_year: 2004, language: 'fre', ark: 'ark:/12148/cb401159952'
                }
            }]
        } });
    });
    await openBookCreatePage(page);
    await page.getByRole('textbox', { name: 'ISBN' }).fill('9782952221702');
    await page.getByRole('button', { name: 'Rechercher', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'La Horde du contrevent' })).toBeVisible();
    await expect(page.getByText('Source : BnF', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Utiliser', exact: true }).click();
    await expect(page.getByLabel('Titre')).toHaveValue('La Horde du contrevent');
    await expect(page.getByLabel('Auteur')).toHaveValue('Damasio, Alain');
    await expect(page.getByLabel('Éditeur')).toHaveValue('la Volte');
    await expect(page.getByLabel('Description')).toHaveValue('Une notice du catalogue général.');
    await expect(page.getByLabel('Date de publication')).toHaveValue('');
    await expect(page.getByRole('textbox', { name: 'ISBN' })).toHaveValue('9782952221702');
});

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
    'admin can search a game, apply the suggestion and keep the proposed cover after creation',
    async ({ page }) => {

        await mockGameProviders(
            page
        );

        await mockGameSearch(
            page,
            async route => {

                const body =
                    route.request().postDataJSON();

                expect(
                    body
                ).toEqual({
                    platform:
                        'PlayStation 5',
                    provider:
                        null,
                    query:
                        'Elden Ring',
                    year:
                        '2022'
                });

                await route.fulfill({
                    contentType:
                        'application/json',
                    json: {
                        query: {
                            language:
                                null,
                            platform:
                                'PlayStation 5',
                            plugin:
                                'games',
                            type:
                                'text',
                            value:
                                'Elden Ring',
                            year:
                                '2022'
                        },
                        results: [
                            gameSuggestion()
                        ]
                    }
                });

            }
        );

        await openGameCreatePage(
            page
        );

        await page.getByLabel(
            'Titre'
        ).fill(
            'Elden Ring'
        );

        await page.locator(
            '#field-platform'
        ).fill(
            'PlayStation 5'
        );

        await page.getByLabel(
            'Date de sortie'
        ).fill(
            '2022-02-25'
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
                        'Elden Ring'
                }
            )
        ).toBeVisible();

        await expect(
            page.getByText(
                'Source : IGDB'
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
                'Description'
            )
        ).toHaveValue(
            'Become an Elden Lord.'
        );

        await expect(
            page.getByLabel(
                'Développeur'
            )
        ).toHaveValue(
            'FromSoftware'
        );

        await expect(
            page.getByLabel(
                'Éditeur'
            )
        ).toHaveValue(
            'Bandai Namco Entertainment'
        );

        await expect(
            page.getByLabel(
                'Genre'
            )
        ).toHaveValue(
            'Role-playing (RPG), Adventure'
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
                        'Elden Ring'
                }
            )
        ).toBeVisible();

        await expect(page.getByRole('button', { name: 'Importer la couverture proposée' })).toHaveCount(0);

        const itemId =
            page.url().match(
                /\/items\/(\d+)/
            )?.[1];

        expect(
            itemId
        ).toBeTruthy();

        const deleteResponse =
            await page.request.delete(
                `/api/items/${itemId}`,
                {
                    headers: {
                        authorization:
                            `Bearer ${adminToken}`
                    }
                }
            );

        expect(
            deleteResponse.ok()
        ).toBeTruthy();

    }
);

test(
    'applying a game suggestion does not overwrite already filled fields',
    async ({ page }) => {

        await mockGameProviders(
            page
        );

        await mockGameSearch(
            page,
            async route => {

                await route.fulfill({
                    contentType:
                        'application/json',
                    json: {
                        query: {
                            language:
                                null,
                            platform:
                                null,
                            plugin:
                                'games',
                            type:
                                'text',
                            value:
                                'Manual Game',
                            year:
                                null
                        },
                        results: [
                            gameSuggestion({
                                title:
                                    'Provider Game'
                            })
                        ]
                    }
                });

            }
        );

        await openGameCreatePage(
            page
        );

        await page.getByLabel(
            'Titre'
        ).fill(
            'Manual Game'
        );

        await page.getByLabel(
            'Description'
        ).fill(
            'Manual description'
        );

        await page.locator(
            '#field-platform'
        ).fill(
            'Manual platform'
        );

        await page.getByLabel(
            'Genre'
        ).fill(
            'Manual genre'
        );

        await page.getByLabel(
            'Éditeur'
        ).fill(
            'Manual publisher'
        );

        await page.getByLabel(
            'Développeur'
        ).fill(
            'Manual developer'
        );

        await page.getByLabel(
            'Date de sortie'
        ).fill(
            '2001-01-01'
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
            'Manual Game'
        );

        await expect(
            page.getByLabel(
                'Description'
            )
        ).toHaveValue(
            'Manual description'
        );

        await expect(
            page.locator(
                '#field-platform'
            )
        ).toHaveValue(
            'Manual platform'
        );

        await expect(
            page.getByLabel(
                'Genre'
            )
        ).toHaveValue(
            'Manual genre'
        );

        await expect(
            page.getByLabel(
                'Éditeur'
            )
        ).toHaveValue(
            'Manual publisher'
        );

        await expect(
            page.getByLabel(
                'Développeur'
            )
        ).toHaveValue(
            'Manual developer'
        );

        await expect(
            page.getByLabel(
                'Date de sortie'
            )
        ).toHaveValue(
            '2001-01-01'
        );

    }
);

test(
    'game search provider unavailable errors are readable',
    async ({ page }) => {

        await mockGameProviders(
            page
        );

        await mockGameSearch(
            page,
            async route => {

                await route.fulfill({
                    contentType:
                        'application/json',
                    json: {
                        code:
                            'provider_unavailable',
                        error:
                            'provider_unavailable',
                        message:
                            'Provider unavailable'
                    },
                    status:
                        503
                });

            }
        );

        await openGameCreatePage(
            page
        );

        await page.getByLabel(
            'Titre'
        ).fill(
            'Elden Ring'
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
                'Le service de recherche jeu est indisponible'
            )
        ).toBeVisible();

    }
);

test(
    'game search with no result keeps the form usable',
    async ({ page }) => {

        await mockGameProviders(
            page
        );

        await mockGameSearch(
            page,
            async route => {

                await route.fulfill({
                    contentType:
                        'application/json',
                    json: {
                        query: {
                            language:
                                null,
                            platform:
                                null,
                            plugin:
                                'games',
                            type:
                                'text',
                            value:
                                'Unknown Game',
                            year:
                                null
                        },
                        results: []
                    }
                });

            }
        );

        await openGameCreatePage(
            page
        );

        await page.getByLabel(
            'Titre'
        ).fill(
            'Unknown Game'
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

        await expect(
            page.getByLabel(
                'Titre'
            )
        ).toHaveValue(
            'Unknown Game'
        );

    }
);

test(
    'admin can search a movie, apply the suggestion and keep the proposed cover after creation',
    async ({ page }) => {

        await mockMovieProviders(
            page
        );

        await mockMovieSearch(
            page,
            async route => {

                const body =
                    route.request().postDataJSON();

                expect(
                    body
                ).toEqual({
                    language:
                        null,
                    provider:
                        null,
                    query:
                        'Blade Runner',
                    region:
                        null,
                    year:
                        null
                });

                await route.fulfill({
                    contentType:
                        'application/json',
                    json: {
                        query: {
                            language:
                                null,
                            plugin:
                                'movies',
                            region:
                                null,
                            type:
                                'text',
                            value:
                                'Blade Runner',
                            year:
                                null
                        },
                        results: [
                            movieSuggestion()
                        ]
                    }
                });

            }
        );

        await openMovieCreatePage(
            page
        );

        await page.getByLabel(
            'Titre'
        ).fill(
            'Blade Runner'
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
                        'Blade Runner'
                }
            )
        ).toBeVisible();

        await expect(
            page.getByText(
                'Source : tmdb'
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
                'Description'
            )
        ).toHaveValue(
            'A blade runner must pursue replicants.'
        );

        await expect(
            page.getByLabel(
                'Date de sortie'
            )
        ).toHaveValue(
            '1982-06-25'
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
                        'Blade Runner'
                }
            )
        ).toBeVisible();

        await expect(page.getByRole('button', { name: 'Importer la couverture proposée' })).toHaveCount(0);

    }
);

test(
    'movie search with no result keeps the form usable',
    async ({ page }) => {

        await mockMovieProviders(
            page
        );

        await mockMovieSearch(
            page,
            async route => {

                await route.fulfill({
                    contentType:
                        'application/json',
                    json: {
                        query: {
                            language:
                                null,
                            plugin:
                                'movies',
                            region:
                                null,
                            type:
                                'text',
                            value:
                                'Unknown Movie',
                            year:
                                null
                        },
                        results: []
                    }
                });

            }
        );

        await openMovieCreatePage(
            page
        );

        await page.getByLabel(
            'Titre'
        ).fill(
            'Unknown Movie'
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

        await expect(
            page.getByLabel(
                'Titre'
            )
        ).toHaveValue(
            'Unknown Movie'
        );

    }
);

test(
    'applying a movie suggestion does not overwrite already filled fields',
    async ({ page }) => {

        await mockMovieProviders(
            page
        );

        await mockMovieSearch(
            page,
            async route => {

                await route.fulfill({
                    contentType:
                        'application/json',
                    json: {
                        query: {
                            language:
                                null,
                            plugin:
                                'movies',
                            region:
                                null,
                            type:
                                'text',
                            value:
                                'Manual Title',
                            year:
                                null
                        },
                        results: [
                            movieSuggestion({
                                title:
                                    'Provider Title'
                            })
                        ]
                    }
                });

            }
        );

        await openMovieCreatePage(
            page
        );

        await page.getByLabel(
            'Titre'
        ).fill(
            'Manual Title'
        );

        await page.getByLabel(
            'Description'
        ).fill(
            'Manual description'
        );

        await page.getByLabel(
            'Date de sortie'
        ).fill(
            '2000-01-01'
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
            'Manual Title'
        );

        await expect(
            page.getByLabel(
                'Description'
            )
        ).toHaveValue(
            'Manual description'
        );

        await expect(
            page.getByLabel(
                'Date de sortie'
            )
        ).toHaveValue(
            '2000-01-01'
        );

        await expect(
            page.getByLabel(
                'Genre'
            )
        ).toHaveValue(
            ''
        );

        await expect(
            page.getByLabel(
                'Réalisateur'
            )
        ).toHaveValue(
            ''
        );

    }
);

test(
    'movie search provider unavailable errors are readable',
    async ({ page }) => {

        await mockMovieProviders(
            page
        );

        await mockMovieSearch(
            page,
            async route => {

                await route.fulfill({
                    contentType:
                        'application/json',
                    json: {
                        code:
                            'provider_unavailable',
                        error:
                            'provider_unavailable',
                        message:
                            'Provider unavailable'
                    },
                    status:
                        503
                });

            }
        );

        await openMovieCreatePage(
            page
        );

        await page.getByLabel(
            'Titre'
        ).fill(
            'Blade Runner'
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
                'Le service de recherche film est indisponible'
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

for (const {code, status, message} of [
    {code: 'provider_timeout', status: 504, message: 'La recherche a expiré'},
    {code: 'provider_error', status: 503, message: 'Recherche impossible pour le moment'},
    {code: 'provider_unavailable', status: 503, message: 'Le service de recherche est indisponible'}
]) {

    test(
        `ISBN lookup ${code} is readable and keeps the form usable`,
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
                            code,
                            error: code,
                            message: code
                        },
                        status
                    });

                }
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
                        'Rechercher'
                }
            ).click();

            await expect(
                page.getByText(
                    message
                )
            ).toBeVisible();

            await expect(page.getByText('Aucun résultat trouvé', {exact: false})).toHaveCount(0);
            await expect(page.locator('.suggestions')).toHaveCount(0);

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

}


test.describe('Acquisition media picker', () => {
    const support = require('./acquisition-media-picker-tests.js')({ expect, getAdminToken: () => adminToken });
    const { openSuggestion, create, deleteItem, isbn, title, urls } = support;
    let token;
    let png;
    test.beforeAll(async () => {
        await support.setup();
        token = support.getToken();
        png = support.getPng();
    });

    test('Open Library cover is preselected; item is created before secure import and its main image is available', async ({ page, request }) => {
        const traffic = await openSuggestion(page);
        await expect(page.getByAltText('Image sélectionnée')).toHaveAttribute('src', urls[0]);
        await page.getByRole('button', { name: 'Utiliser', exact: true }).click();
        expect(traffic.media).toHaveLength(0);
        let importedItemId;
        await page.route('**/api/acquisition/images/import', async route => {
            const body = route.request().postDataJSON();
            importedItemId = body.itemId;
            expect(body).toEqual({ itemId: importedItemId, imageUrl: urls[0], provider: 'openlibrary', source: 'openlibrary', isPrimary: true });
            expect(traffic.creations).toHaveLength(1);
            const item = await request.get(`/api/items/${importedItemId}`, { headers: { Authorization: `Bearer ${token}` } });
            expect(item.ok()).toBeTruthy();
            // Stub the external download; use the real upload/MediaService to populate the gallery.
            const upload = await request.post('/api/media', {
                headers: { Authorization: `Bearer ${token}` },
                multipart: { item_id: String(importedItemId), is_primary: 'true', file: { name: 'cover.png', mimeType: 'image/png', buffer: png } }
            });
            expect(upload.ok()).toBeTruthy();
            await route.fulfill({ status: 201, json: await upload.json() });
        });
        let id;
        try {
            id = await create(page);
            expect(importedItemId).toBe(id);
            await expect(page.locator('.media-thumbnail').getByText('Principale', { exact: true })).toBeVisible();
            await expect(page.locator('.media-thumbnail img')).toHaveAttribute('src', /^blob:/);
            const media = await request.get(`/api/items/${id}/media`, { headers: { Authorization: `Bearer ${token}` } });
            const rows = await media.json();
            expect(rows).toHaveLength(1);
            expect(rows[0].is_primary).toBe(1);
            expect(JSON.stringify(rows)).not.toContain('https://');
            expect(JSON.stringify(traffic.creations[0])).not.toContain('https://');
            expect(traffic.lookups).toBe(1);
            expect(traffic.media).toHaveLength(1);
        } finally {
            await deleteItem(request, id ?? importedItemId);
        }
    });

    test('Changing the selected cover after applying the suggestion imports the new candidate', async ({ page, request }) => {
        const traffic = await openSuggestion(page, { brokenPreviewUrl: urls[0] });
        await page.getByRole('button', { name: 'Utiliser', exact: true }).click();
        await expect.poll(() => page.getByAltText('Image sélectionnée').evaluate(image => image.complete && image.naturalWidth === 0)).toBe(true);
        await page.getByRole('button', { name: 'Changer l’image' }).focus();
        await page.keyboard.press('Enter');
        await expect(page.getByRole('radio', { name: /openlibrary · cover · 1/ })).toBeChecked();
        await page.getByRole('radio', { name: /openlibrary · cover · 2/ }).focus();
        await page.keyboard.press('Space');
        await expect(page.getByRole('radio', { name: /openlibrary · cover · 2/ })).toBeChecked();
        await expect(page.getByAltText('Image sélectionnée')).toHaveAttribute('src', urls[1]);
        expect(traffic.media).toHaveLength(0);
        await page.route('**/api/acquisition/images/import', route => {
            expect(route.request().postDataJSON().imageUrl).toBe(urls[1]);
            return route.fulfill({ status: 201, json: { id: 1 } });
        });
        let id;
        try {
            id = await create(page);
            expect(traffic.lookups).toBe(1);
            expect(traffic.media).toHaveLength(1);
        } finally { await deleteItem(request, id); }
    });

    test('Aucune image overrides the default and creates the item without any media request', async ({ page, request }) => {
        const traffic = await openSuggestion(page);
        await page.getByRole('button', { name: 'Utiliser', exact: true }).click();
        await page.getByRole('button', { name: 'Changer l’image' }).click();
        await page.getByRole('radio', { name: 'Aucune image', exact: true }).check();
        await expect(page.getByAltText('Image sélectionnée')).toHaveCount(0);
        let id;
        try {
            id = await create(page);
            await expect(page.getByText('Aucune image pour cet item.')).toBeVisible();
            expect(traffic.media).toHaveLength(0);
            expect(traffic.lookups).toBe(1);
        } finally { await deleteItem(request, id); }
    });

    test('Local file stays in memory until creation, then uses the real upload pipeline as primary media', async ({ page, request }) => {
        const traffic = await openSuggestion(page);
        await page.getByRole('button', { name: 'Changer l’image' }).click();
        await page.getByLabel('Importer un fichier').setInputFiles({ name: 'local-cover.png', mimeType: 'image/png', buffer: png });
        await page.getByRole('button', { name: 'Utiliser', exact: true }).click();
        await expect(page.getByAltText('Image sélectionnée')).toHaveAttribute('src', /^blob:/);
        expect(traffic.media).toHaveLength(0);
        let id;
        try {
            id = await create(page);
            await expect(page.locator('.media-thumbnail').getByText('Principale', { exact: true })).toBeVisible();
            expect(traffic.media).toHaveLength(1);
            expect(new URL(traffic.media[0].url()).pathname).toBe('/api/media');
            expect(traffic.media[0].postData()).toContain(`\r\n${id}\r\n`);
            expect(traffic.media[0].postData()).toContain('filename="local-cover.png"');
            expect(traffic.media[0].postData()).toContain('Content-Type: image/png');
            expect(traffic.lookups).toBe(1);
        } finally { await deleteItem(request, id); }
    });

    for (const mode of ['remote', 'local']) {
        test(`${mode} import failure preserves the created item and offers a clear warning and gallery upload`, async ({ page, request }) => {
            const traffic = await openSuggestion(page);
            if (mode === 'local') {
                await page.getByRole('button', { name: 'Changer l’image' }).click();
                await page.getByLabel('Importer un fichier').setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: png });
            }
            await page.getByRole('button', { name: 'Utiliser', exact: true }).click();
            const endpoint = mode === 'remote' ? '**/api/acquisition/images/import' : '**/api/media';
            await page.route(endpoint, route => route.fulfill({ status: 503, json: { error: 'image_download_failed' } }));
            let id;
            try {
                id = await create(page);
                await expect(page.getByRole('status')).toContainText('L’élément a été créé, mais l’image n’a pas pu être importée.');
                await expect(page.getByRole('button', { name: 'Ajouter image', exact: true })).toBeVisible();
                const item = await request.get(`/api/items/${id}`, { headers: { Authorization: `Bearer ${token}` } });
                expect(item.ok()).toBeTruthy();
                expect((await item.json()).title).toBe(title);
                expect(traffic.creations).toHaveLength(1);
                expect(traffic.media).toHaveLength(1);
                expect(traffic.lookups).toBe(1);
                await page.evaluate(async () => {
                    const { default: router } = await import('/src/router/index.js');
                    await router.push('/collections/books/items');
                });
                await page.evaluate(async itemId => {
                    const { default: router } = await import('/src/router/index.js');
                    await router.push(`/items/${itemId}`);
                }, id);
                await expect(page.getByRole('heading', { name: title })).toBeVisible();
                await expect(page.getByRole('status')).toHaveCount(0);
                await page.reload();
                await expect(page.getByRole('heading', { name: title })).toBeVisible();
                await expect(page.getByRole('status')).toHaveCount(0);
                expect(traffic.creations).toHaveLength(1);
                expect(traffic.media).toHaveLength(1);
            } finally { await deleteItem(request, id); }
        });
    }

    test('Unsafe or missing image URLs are skipped and the first HTTPS candidate is preselected', async ({ page }) => {
        const traffic = await openSuggestion(page, { images: [
            { kind: 'cover', url: 'http://example.test/cover.jpg' },
            { kind: 'cover', url: 'javascript:alert(1)' },
            null,
            { kind: 'cover', url: urls[1], source: 'openlibrary' },
            { kind: 'cover', url: ` ${urls[1]} `, source: 'openlibrary' }
        ] });
        await expect(page.getByAltText('Image sélectionnée')).toHaveAttribute('src', urls[1]);
        await page.getByRole('button', { name: 'Changer l’image' }).click();
        await expect(page.getByRole('radio', { name: /openlibrary · cover ·/ })).toHaveCount(1);
        expect(traffic.media).toHaveLength(0);
    });

    test('Switching to a suggestion without images clears the previous cover selection', async ({ page, request }) => {
        const traffic = await openSuggestion(page, { results: [
            { title, provider: 'openlibrary', metadata: { isbn }, images: [{ kind: 'cover', source: 'openlibrary', url: urls[0] }] },
            { title: 'Autre édition', provider: 'bnf', metadata: { isbn }, images: [] }
        ] });
        await page.locator('.suggestion').nth(0).getByRole('button', { name: 'Utiliser', exact: true }).click();
        await page.locator('.suggestion').nth(1).getByRole('button', { name: 'Utiliser', exact: true }).click();
        let id;
        try {
            id = await create(page);
            expect(traffic.media).toHaveLength(0);
        } finally { await deleteItem(request, id); }
    });

    test('Generic picker accepts a TMDb poster and an IGDB cover while normalization preserves available provenance only', async ({ page }) => {
        await page.goto('/collections/books/items/new');
        const normalized = await page.evaluate(async () => {
            const { normalizeAcquisitionMediaCandidates } = await import('/src/services/acquisition-media.js');
            const providers = ['openlibrary', 'googlebooks', 'tmdb', 'igdb'];
            return providers.map(provider => normalizeAcquisitionMediaCandidates({
                provider, sourceUrl: `https://example.test/${provider}`,
                images: [{ kind: provider === 'tmdb' ? 'poster' : 'cover', source: provider, url: `https://example.test/${provider}.jpg`,
                    ...(provider === 'tmdb' ? { thumbnailUrl: 'https://example.test/thumb.jpg', width: 500, height: 750, attribution: 'Supplied credit', license: 'Supplied license' } : {}) }]
            })[0]);
        });
        expect(normalized.map(c => c.provider)).toEqual(['openlibrary', 'googlebooks', 'tmdb', 'igdb']);
        expect(normalized[0]).toMatchObject({ width: null, height: null, attribution: null, license: null, thumbnailUrl: null });
        expect(normalized[2]).toMatchObject({ kind: 'poster', width: 500, height: 750, attribution: 'Supplied credit', license: 'Supplied license' });
        await page.route('https://example.test/**', route => route.fulfill({ contentType: 'image/png', body: png }));
        await page.evaluate(async candidates => {
            const { createApp, h, ref } = await import('/node_modules/.vite/deps/vue.js');
            const { default: Picker } = await import('/src/components/acquisition/AcquisitionMediaPicker.vue');
            const element = document.createElement('div');
            element.id = 'generic-media-test';
            document.body.append(element);
            const selection = ref();
            const available = ref(candidates);
            window.replaceMediaCandidates = value => { available.value = value; };
            const app = createApp({ setup: () => () => h(Picker, { candidates: available.value, modelValue: selection.value, 'onUpdate:modelValue': value => selection.value = value }) });
            app.mount(element);
            window.mediaTestSelection = () => selection.value;
        }, [normalized[2], normalized[3]]);
        const picker = page.locator('#generic-media-test');
        await expect(picker.getByAltText('Image sélectionnée')).toHaveAttribute('src', 'https://example.test/thumb.jpg');
        await picker.getByRole('button', { name: 'Changer l’image' }).click();
        await expect(picker.getByRole('radio', { name: /tmdb · poster · 1/ })).toBeChecked();
        await picker.getByRole('radio', { name: /igdb · cover · 2/ }).check();
        expect(await page.evaluate(() => window.mediaTestSelection().candidate)).toEqual(normalized[3]);
        await page.evaluate(candidate => window.replaceMediaCandidates([candidate]), normalized[2]);
        await expect(picker.getByRole('radio', { name: /tmdb · poster · 1/ })).toBeChecked();
        expect(await page.evaluate(() => window.mediaTestSelection().candidate)).toEqual(normalized[2]);
        await picker.getByRole('radio', { name: 'Aucune image', exact: true }).check();
        expect(await page.evaluate(() => window.mediaTestSelection())).toEqual({ mode: 'none' });
    });

    test('Failed item creation never starts an image import', async ({ page }) => {
        const traffic = await openSuggestion(page);
        await page.getByRole('button', { name: 'Utiliser', exact: true }).click();
        await page.route('**/api/items', route => route.fulfill({ status: 503, json: { error: 'Creation indisponible' } }));
        await page.getByRole('button', { name: 'Créer l’item', exact: true }).click();
        await expect(page.getByRole('button', { name: 'Créer l’item', exact: true })).toBeEnabled();
        await expect(page).toHaveURL(/\/collections\/books\/items\/new$/);
        expect(traffic.creations).toHaveLength(1);
        expect(traffic.media).toHaveLength(0);
    });

    test('Editing ISBN clears the old media selection without starting another lookup', async ({ page, request }) => {
        const traffic = await openSuggestion(page);
        await page.getByRole('button', { name: 'Utiliser', exact: true }).click();
        await page.getByRole('textbox', { name: 'ISBN' }).fill('9780140328721');
        await expect(page.getByRole('button', { name: 'Changer l’image' })).toHaveCount(0);
        let id;
        try {
            id = await create(page);
            expect(traffic.media).toHaveLength(0);
            expect(traffic.lookups).toBe(1);
        } finally { await deleteItem(request, id); }
    });

    test('Unsupported local files leave the remote selection intact; valid blob previews are revoked when cleared', async ({ page }) => {
        const traffic = await openSuggestion(page);
        await page.getByRole('button', { name: 'Changer l’image' }).click();
        const input = page.getByLabel('Importer un fichier');
        await input.setInputFiles({ name: 'bad.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') });
        await expect(page.getByRole('alert')).toContainText('JPEG, PNG ou WebP');
        await expect(page.getByAltText('Image sélectionnée')).toHaveAttribute('src', urls[0]);
        await page.evaluate(() => {
            const revoke = URL.revokeObjectURL.bind(URL);
            window.revokedMediaUrls = [];
            URL.revokeObjectURL = url => { window.revokedMediaUrls.push(url); revoke(url); };
        });
        await input.setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: png });
        const preview = page.getByAltText('Image sélectionnée');
        await expect(preview).toHaveAttribute('src', /^blob:/);
        const blobUrl = await preview.getAttribute('src');
        await input.setInputFiles({ name: 'replacement.png', mimeType: 'image/png', buffer: png });
        await expect(preview).not.toHaveAttribute('src', blobUrl);
        expect(await page.evaluate(() => window.revokedMediaUrls)).toContain(blobUrl);
        const replacementUrl = await preview.getAttribute('src');
        await page.getByRole('radio', { name: 'Aucune image', exact: true }).check();
        expect(await page.evaluate(() => window.revokedMediaUrls)).toContain(replacementUrl);
        await input.setInputFiles({ name: 'before-unmount.png', mimeType: 'image/png', buffer: png });
        await expect(preview).toHaveAttribute('src', /^blob:/);
        const unmountUrl = await preview.getAttribute('src');
        await page.evaluate(async () => {
            const { default: router } = await import('/src/router/index.js');
            await router.push('/collections/books/items');
        });
        await expect(page.getByRole('button', { name: 'Changer l’image' })).toHaveCount(0);
        expect(await page.evaluate(() => window.revokedMediaUrls)).toContain(unmountUrl);
        expect(traffic.media).toHaveLength(0);
    });

    test('Late ISBN lookup response cannot restore a stale suggestion or its media', async ({ page, request }) => {
        const traffic = await openSuggestion(page);
        await page.getByRole('button', { name: 'Utiliser', exact: true }).click();
        let finish;
        const pending = new Promise(resolve => { finish = resolve; });
        await page.route('**/api/acquisition/books/isbn/lookup', async route => {
            await pending;
            await route.fulfill({ json: { results: [{ title: 'Résultat périmé', provider: 'openlibrary', metadata: { isbn }, images: [{ url: urls[0], kind: 'cover' }] }] } });
        });
        const started = page.waitForRequest('**/api/acquisition/books/isbn/lookup');
        await page.getByRole('button', { name: 'Rechercher', exact: true }).click();
        await started;
        await page.getByRole('textbox', { name: 'ISBN' }).fill('9780140328721');
        const completed = page.waitForResponse('**/api/acquisition/books/isbn/lookup');
        finish();
        await completed;
        await expect(page.getByRole('button', { name: 'Rechercher', exact: true })).toBeEnabled();
        await expect(page.locator('.suggestion')).toHaveCount(0);
        let id;
        try {
            id = await create(page);
            expect(traffic.media).toHaveLength(0);
        } finally { await deleteItem(request, id); }
    });

    test('Searching again with an empty response clears the previously applied media', async ({ page, request }) => {
        const traffic = await openSuggestion(page);
        await page.getByRole('button', { name: 'Utiliser', exact: true }).click();
        await page.route('**/api/acquisition/books/isbn/lookup', route => route.fulfill({ json: { results: [] } }));
        await page.getByRole('button', { name: 'Rechercher', exact: true }).click();
        await expect(page.getByText('Aucun résultat trouvé. Vous pouvez continuer la saisie manuellement.')).toBeVisible();
        let id;
        try {
            id = await create(page);
            expect(traffic.media).toHaveLength(0);
        } finally { await deleteItem(request, id); }
    });

    test('Identical suggestion metadata does not share selection and switching suggestions discards the old local file', async ({ page, request }) => {
        const traffic = await openSuggestion(page, { results: urls.map(url => ({
            title, provider: 'openlibrary', metadata: { isbn }, images: [{ kind: 'cover', source: 'openlibrary', url }]
        })) });
        const first = page.locator('.suggestion').nth(0);
        const second = page.locator('.suggestion').nth(1);
        await first.getByRole('button', { name: 'Changer l’image' }).click();
        await first.getByLabel('Importer un fichier').setInputFiles({ name: 'first.png', mimeType: 'image/png', buffer: png });
        await first.getByRole('button', { name: 'Utiliser', exact: true }).click();
        await expect(second.getByAltText('Image sélectionnée')).toHaveAttribute('src', urls[1]);
        await second.getByRole('button', { name: 'Utiliser', exact: true }).click();
        await expect(first.getByAltText('Image sélectionnée')).toHaveCount(0);
        expect(await first.getByLabel('Importer un fichier').evaluate(input => input.files.length)).toBe(0);
        await first.getByRole('button', { name: 'Utiliser', exact: true }).click();
        let id;
        try {
            id = await create(page);
            expect(traffic.media).toHaveLength(0);
        } finally { await deleteItem(request, id); }
    });

    test('Simultaneous submissions create/import once, disable media controls, and leave no selection for the next creation', async ({ page, request }) => {
        const traffic = await openSuggestion(page);
        await page.getByRole('button', { name: 'Utiliser', exact: true }).click();
        await page.getByRole('button', { name: 'Changer l’image' }).click();
        let releaseCreation;
        let releaseImport;
        const creationGate = new Promise(resolve => { releaseCreation = resolve; });
        const importGate = new Promise(resolve => { releaseImport = resolve; });
        await page.route('**/api/items', async route => {
            if (route.request().method() === 'POST') await creationGate;
            await route.continue();
        });
        let importedItemId;
        await page.route('**/api/acquisition/images/import', async route => {
            importedItemId = route.request().postDataJSON().itemId;
            await importGate;
            await route.fulfill({ status: 201, json: { id: 1 } });
        });
        const started = page.waitForRequest(request => new URL(request.url()).pathname === '/api/items' && request.method() === 'POST');
        await page.locator('form.dynamic-form').evaluate(form => {
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        });
        await started;
        await expect(page.getByRole('button', { name: 'Changer l’image' })).toBeDisabled();
        await expect(page.getByLabel('Importer un fichier')).toBeDisabled();
        await expect(page.getByRole('radio', { name: 'Aucune image', exact: true })).toBeDisabled();
        expect(traffic.creations).toHaveLength(1);
        expect(traffic.media).toHaveLength(0);
        const importStarted = page.waitForRequest('**/api/acquisition/images/import');
        releaseCreation();
        await importStarted;
        await expect(page.getByRole('button', { name: 'Changer l’image' })).toBeDisabled();
        let firstId;
        let secondId;
        try {
            releaseImport();
            await expect(page).toHaveURL(/\/items\/\d+$/);
            firstId = Number(page.url().match(/\/items\/(\d+)$/)[1]);
            expect(importedItemId).toBe(firstId);
            expect(traffic.media).toHaveLength(1);
            await page.evaluate(async () => {
                const { default: router } = await import('/src/router/index.js');
                await router.push('/collections/books/items/new');
            });
            await expect(page.getByLabel('Titre')).toHaveValue('');
            await expect(page.getByAltText('Image sélectionnée')).toHaveCount(0);
            await page.getByLabel('Titre').fill('Création suivante sans image');
            secondId = await create(page);
            expect(secondId).not.toBe(firstId);
            await expect(page.getByText('Aucune image pour cet item.')).toBeVisible();
            expect(traffic.creations).toHaveLength(2);
            expect(traffic.media).toHaveLength(1);
            await page.reload();
            await expect(page.getByRole('heading', { name: 'Création suivante sans image' })).toBeVisible();
            expect(traffic.creations).toHaveLength(2);
            expect(traffic.media).toHaveLength(1);
        } finally {
            releaseCreation();
            releaseImport();
            await deleteItem(request, firstId ?? importedItemId);
            await deleteItem(request, secondId);
        }
    });

    test('A corrupt local PNG is rejected by the existing backend pipeline without losing the created item', async ({ page, request }) => {
        const traffic = await openSuggestion(page);
        await page.getByRole('button', { name: 'Changer l’image' }).click();
        await page.getByLabel('Importer un fichier').setInputFiles({ name: 'corrupt.png', mimeType: 'image/png', buffer: Buffer.from('not a PNG') });
        await page.getByRole('button', { name: 'Utiliser', exact: true }).click();
        let id;
        try {
            id = await create(page);
            await expect(page.getByRole('status')).toContainText('L’élément a été créé, mais l’image n’a pas pu être importée.');
            await expect(page.getByText('Aucune image pour cet item.')).toBeVisible();
            expect(traffic.media).toHaveLength(1);
            expect(traffic.creations).toHaveLength(1);
            const item = await request.get(`/api/items/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            expect(item.ok()).toBeTruthy();
        } finally { await deleteItem(request, id); }
    });

});

test.describe('Explicit multi-provider media search', () => {
    const support = require('./acquisition-media-picker-tests.js')({ expect, getAdminToken: () => adminToken });
    const { openSuggestion, create, deleteItem, urls } = support;
    let png;
    test.beforeAll(async () => { await support.setup(); png = support.getPng(); });
    const searched = (provider, name, kind = 'cover') => ({ kind, url: `https://example.test/${name}.jpg`, thumbnailUrl: `https://example.test/${name}-thumb.jpg`, provider, sourceUrl: `https://example.test/${provider}`, width: null, height: null, attribution: null, license: null, language: null });
    async function previews(page) { await page.route('https://example.test/**', route => route.fulfill({ contentType: 'image/png', body: png })); }

    test('Search is explicit, concurrent duplicate clicks are blocked, providers merge and selected search result imports only after item creation', async ({ page, request }) => {
        const traffic = await openSuggestion(page);
        await previews(page);
        let calls = 0;
        let release;
        const gate = new Promise(resolve => { release = resolve; });
        await page.route('**/api/acquisition/media/search', async route => {
            calls += 1;
            expect(route.request().postDataJSON()).toEqual({ plugin: 'books', kind: 'cover', identifiers: { isbn: '9782952221702', openLibraryCoverId: 123, openLibraryId: 'OL123M' }, title: 'La Horde du contrevent', metadata: { author: 'Alain Damasio', language: 'en-US' } });
            await gate;
            await route.fulfill({ json: { results: [{ ...searched('openlibrary', 'initial'), url: urls[0] }, searched('googlebooks', 'alternative')], warnings: [], incomplete: false } });
        });
        await page.getByRole('button', { name: 'Utiliser', exact: true }).click();
        await page.getByRole('button', { name: 'Changer l’image' }).click();
        expect(calls).toBe(0);
        const button = page.getByRole('button', { name: 'Rechercher d’autres images' });
        await button.evaluate(element => { element.click(); element.click(); });
        await expect(page.getByRole('button', { name: 'Recherche d’images...' })).toBeDisabled();
        expect(calls).toBe(1);
        expect(traffic.media).toHaveLength(0);
        release();
        await expect(page.getByText('Images trouvées.', { exact: true })).toBeVisible();
        await expect(page.getByAltText('Image sélectionnée')).toHaveAttribute('src', urls[0]);
        await expect(page.getByRole('radio', { name: /openlibrary · cover ·/ })).toHaveCount(2);
        await expect(page.getByRole('radio', { name: /googlebooks · cover ·/ })).toHaveCount(1);
        await expect(page.getByText('Résultat de recherche', { exact: true })).toHaveCount(1);
        await page.getByRole('radio', { name: /googlebooks · cover ·/ }).check();
        expect(traffic.media).toHaveLength(0);
        await page.route('**/api/acquisition/images/import', route => {
            const body = route.request().postDataJSON();
            expect(traffic.creations).toHaveLength(1);
            expect(body.imageUrl).toBe('https://example.test/alternative.jpg');
            expect(body.provider).toBe('googlebooks');
            expect(body.isPrimary).toBe(true);
            return route.fulfill({ status: 201, json: { id: 1 } });
        });
        let id;
        try {
            id = await create(page);
            expect(traffic.media).toHaveLength(1);
            expect(traffic.media[0].postDataJSON().itemId).toBe(id);
            expect(calls).toBe(1);
        } finally { release(); await deleteItem(request, id); }
    });

    for (const [name, response, message] of [
        ['partial success', { results: [searched('openlibrary', 'available')], warnings: [{ provider: 'googlebooks', code: 'provider_unavailable' }], incomplete: true }, 'Recherche incomplète : googlebooks'],
        ['incomplete empty', { results: [], warnings: [{ provider: 'googlebooks', code: 'provider_error' }], incomplete: true }, 'La recherche est incomplète.'],
        ['clean empty', { results: [], warnings: [], incomplete: false }, 'Aucune autre image trouvée.'],
        ['all errors', null, 'La recherche d’images est indisponible.']
    ]) {
        test(`Media search ${name} keeps the initial selection and allows local/none choices`, async ({ page }) => {
            const traffic = await openSuggestion(page);
            await previews(page);
            await page.route('**/api/acquisition/media/search', route => route.fulfill(response ? { json: response } : { status: 503, json: { code: 'provider_error' } }));
            await page.getByRole('button', { name: 'Changer l’image' }).click();
            await page.getByRole('button', { name: 'Rechercher d’autres images' }).click();
            await expect(page.getByRole('status').filter({ hasText: message })).toBeVisible();
            await expect(page.getByAltText('Image sélectionnée')).toHaveAttribute('src', urls[0]);
            await page.getByLabel('Importer un fichier').setInputFiles({ name: 'selected.png', mimeType: 'image/png', buffer: png });
            await expect(page.getByAltText('Image sélectionnée')).toHaveAttribute('src', /^blob:/);
            await page.getByRole('radio', { name: 'Aucune image', exact: true }).check();
            await expect(page.getByAltText('Image sélectionnée')).toHaveCount(0);
            expect(traffic.media).toHaveLength(0);
        });
    }

    test('Repeated media search replaces results deterministically while preserving a selected remote result or explicitly chosen file', async ({ page }) => {
        await openSuggestion(page);
        await previews(page);
        let calls = 0;
        await page.route('**/api/acquisition/media/search', route => {
            calls += 1;
            return route.fulfill({ json: { results: [searched('googlebooks', `result${calls}`)], warnings: [], incomplete: false } });
        });
        await page.getByRole('button', { name: 'Changer l’image' }).click();
        await page.getByRole('button', { name: 'Rechercher d’autres images' }).click();
        await page.getByRole('radio', { name: /googlebooks · cover ·/ }).check();
        await page.getByRole('button', { name: 'Rechercher d’autres images' }).click();
        await expect(page.getByRole('radio', { name: /googlebooks · cover ·/ })).toHaveCount(2);
        await expect(page.getByAltText('Image sélectionnée')).toHaveAttribute('src', 'https://example.test/result1-thumb.jpg');
        await page.getByLabel('Importer un fichier').setInputFiles({ name: 'keep.png', mimeType: 'image/png', buffer: png });
        await expect(page.getByAltText('Image sélectionnée')).toHaveAttribute('src', /^blob:/);
        const filePreview = await page.getByAltText('Image sélectionnée').getAttribute('src');
        await page.getByRole('button', { name: 'Rechercher d’autres images' }).click();
        await expect(page.getByRole('radio', { name: /googlebooks · cover ·/ })).toHaveCount(1);
        await expect(page.getByAltText('Image sélectionnée')).toHaveAttribute('src', filePreview);
        expect(calls).toBe(3);
    });

    test('Late media response from a discarded acquisition result cannot reappear in a fresh result', async ({ page }) => {
        await openSuggestion(page);
        let release;
        const gate = new Promise(resolve => { release = resolve; });
        await page.route('**/api/acquisition/media/search', async route => {
            await gate;
            await route.fulfill({ json: { results: [searched('googlebooks', 'obsolete')], warnings: [], incomplete: false } });
        });
        await page.getByRole('button', { name: 'Changer l’image' }).click();
        const started = page.waitForRequest('**/api/acquisition/media/search');
        await page.getByRole('button', { name: 'Rechercher d’autres images' }).click();
        await started;
        await page.getByRole('button', { name: 'Rechercher', exact: true }).click();
        await expect(page.getByRole('button', { name: 'Changer l’image' })).toBeVisible();
        const completed = page.waitForResponse('**/api/acquisition/media/search');
        release();
        await completed;
        await page.getByRole('button', { name: 'Changer l’image' }).click();
        await expect(page.getByRole('radio', { name: /googlebooks/ })).toHaveCount(0);
        await expect(page.getByAltText('Image sélectionnée')).toHaveAttribute('src', urls[0]);
    });

    for (const [plugin, kind, key, value, suggestion, mockMetadataSearch] of [
        ['movies', 'poster', 'tmdbId', 78, movieSuggestion(), mockMovieSearch],
        ['games', 'cover', 'igdbId', 119133, gameSuggestion(), mockGameSearch]
    ]) {
        test(`${plugin} uses the generic media query/picker and imports the searched ${kind} after itemId`, async ({ page, request }) => {
            await (plugin === 'movies' ? mockMovieProviders : mockGameProviders)(page);
            await mockMetadataSearch(page, route => route.fulfill({ json: { results: [{ ...suggestion, images: [{ kind, source: suggestion.provider, url: 'https://example.test/initial.jpg' }] }] } }));
            await previews(page);
            let calls = 0;
            let itemId;
            await page.route('**/api/acquisition/media/search', route => {
                calls += 1;
                const query = route.request().postDataJSON();
                expect(query.plugin).toBe(plugin);
                expect(query.kind).toBe(kind);
                expect(query.identifiers).toEqual({ [key]: value });
                return route.fulfill({ json: { results: [searched(suggestion.provider, 'new-image', kind)], warnings: [], incomplete: false } });
            });
            await page.route('**/api/acquisition/images/import', route => {
                const body = route.request().postDataJSON();
                itemId = body.itemId;
                expect(body.imageUrl).toBe('https://example.test/new-image.jpg');
                expect(body.isPrimary).toBe(true);
                return route.fulfill({ status: 201, json: { id: 1 } });
            });
            await page.goto(`/collections/${plugin}/items/new`);
            await page.getByLabel('Titre').fill(suggestion.title);
            await page.getByRole('button', { name: 'Rechercher', exact: true }).click();
            await page.getByRole('button', { name: 'Utiliser', exact: true }).click();
            await page.getByRole('button', { name: 'Changer l’image' }).click();
            expect(calls).toBe(0);
            expect(itemId).toBeUndefined();
            await page.getByRole('button', { name: 'Rechercher d’autres images' }).click();
            await page.getByRole('radio', { name: new RegExp(`${suggestion.provider} · ${kind} · 2`) }).check();
            let id;
            try {
                id = await create(page);
                expect(itemId).toBe(id);
                expect(calls).toBe(1);
            } finally { await deleteItem(request, id); }
        });
    }
    test('Identical media requests share one in-flight request across picker instances, without caching completed searches', async ({ page }) => {
        await openSuggestion(page);
        let calls = 0;
        await page.route('**/api/acquisition/media/search', route => {
            calls += 1;
            return route.fulfill({ json: { results: [], warnings: [], incomplete: false } });
        });
        await page.evaluate(async () => {
            const { searchAcquisitionMedia } = await import('/src/services/acquisition-api.js');
            const query = { plugin: 'books', kind: 'cover', identifiers: { isbn: '9782952221702' } };
            const reversed = { identifiers: query.identifiers, kind: query.kind, plugin: query.plugin };
            await Promise.all([searchAcquisitionMedia(query), searchAcquisitionMedia(reversed)]);
        });
        expect(calls).toBe(1);
        await page.evaluate(async () => {
            const { searchAcquisitionMedia } = await import('/src/services/acquisition-api.js');
            await searchAcquisitionMedia({ plugin: 'books', kind: 'cover', identifiers: { isbn: '9782952221702' } });
        });
        expect(calls).toBe(2);
    });

});
