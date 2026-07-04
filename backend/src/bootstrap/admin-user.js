import {
    UserRepository
} from '../repositories/user-repository.js';

import {
    hashPassword
} from '../auth/password-service.js';

export async function createInitialAdmin(
    db
) {

    const repository =
        new UserRepository(
            db
        );

    if (
        repository.count() > 0
    ) {

        return;

    }

    const username =
        process.env.ADMIN_USERNAME || 'admin';

    const password =
        process.env.ADMIN_PASSWORD;

    if (
        !password
    ) {

        throw new Error(
            'ADMIN_PASSWORD is required to create the initial admin user'
        );

    }

    const passwordHash =
        await hashPassword(
            password
        );

    repository.create({
        username,
        password_hash:
            passwordHash,
        role:
            'admin',
        preferred_language:
            'fr'
    });

    console.log(
        'Initial admin user created.'
    );

}
