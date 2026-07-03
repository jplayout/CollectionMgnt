const {
    expect,
    test
} = require('@playwright/test');

const path =
    require('node:path');

const adminUsername =
    'admin';

const adminPassword =
    'e2e-admin-password';

const datasetPath =
    path.resolve(
        __dirname,
        '../../demo/datasets/collectionmgnt-demo-v1.json'
    );

async function loginAsAdmin(page) {

    await page.goto(
        '/login'
    );

    await page.getByLabel(
        'Username'
    ).fill(
        adminUsername
    );

    await page.getByLabel(
        'Password'
    ).fill(
        adminPassword
    );

    const [
        loginResponse
    ] =
        await Promise.all([
            page.waitForResponse(
                response => response.url().includes(
                    '/api/auth/login'
                ) &&
                    response.request().method() === 'POST'
            ),
            page.getByRole(
                'button',
                {
                    name:
                        'Sign in'
                }
            ).click()
        ]);

    expect(
        loginResponse.status()
    ).toBe(
        200
    );

    await expect(
        page
    ).toHaveURL(
        /\/collections$/
    );

    await expect(
        page.getByRole(
            'heading',
            {
                name:
                    'Collections'
            }
        )
    ).toBeVisible();

}

test(
    'admin can log in and reaches Collections',
    async ({ page }) => {

        await loginAsAdmin(
            page
        );

    }
);

test(
    'admin imports the demo dataset and opens an item',
    async ({ page }) => {

        await loginAsAdmin(
            page
        );

        await page.goto(
            '/admin'
        );

        await expect(
            page.getByRole(
                'heading',
                {
                    name:
                        'Administration'
                }
            )
        ).toBeVisible();

        await page.getByLabel(
            'Fichier JSON'
        ).setInputFiles(
            datasetPath
        );

        await page.getByRole(
            'button',
            {
                name:
                    'Importer des données'
            }
        ).click();

        const createdItemsSummary =
            page.locator(
                '.summary-list div'
            ).filter({
                hasText:
                    'Items créés'
            });

        await expect(
            createdItemsSummary
        ).toContainText(
            '94'
        );

        await page.goto(
            '/collections'
        );

        await page.getByRole(
            'link',
            {
                name:
                    'Jeux Vidéo'
            }
        ).click();

        await expect(
            page
        ).toHaveURL(
            /\/collections\/games\/items/
        );

        await expect(
            page.getByRole(
                'heading',
                {
                    name:
                        'Jeux Vidéo'
                }
            )
        ).toBeVisible();

        await expect(
            page.getByText(
                '36 items'
            )
        ).toBeVisible();

        await page.getByRole(
            'link',
            {
                name:
                    'Ouvrir'
            }
        ).first().click();

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
                        'Description'
                }
            )
        ).toBeVisible();

        await page.goto(
            '/admin'
        );

        await expect(
            page.getByRole(
                'heading',
                {
                    name:
                        'Administration'
                }
            )
        ).toBeVisible();

    }
);
