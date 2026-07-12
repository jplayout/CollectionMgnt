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

        await expect(
            page.getByRole(
                'button',
                {
                    name:
                        'Importer la couverture proposée'
                }
            )
        ).toBeVisible();

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

        await expect(
            page.getByRole(
                'button',
                {
                    name:
                        'Importer la couverture proposée'
                }
            )
        ).toBeVisible();

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
