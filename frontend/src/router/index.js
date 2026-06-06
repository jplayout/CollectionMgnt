import {
    createRouter,
    createWebHistory
} from 'vue-router';

import {
    useAuthStore
} from '../stores/auth.js';

import Dashboard
from '../pages/Dashboard.vue';

import Login
from '../pages/Login.vue';

import ItemDetails
from '../pages/ItemDetails.vue';

const router =
    createRouter({
        history:
            createWebHistory(),
        routes: [
            {
                path:
                    '/',
                redirect:
                    '/dashboard'
            },
            {
                path:
                    '/login',
                name:
                    'login',
                component:
                    Login,
                meta: {
                    public:
                        true
                }
            },
            {
                path:
                    '/dashboard',
                name:
                    'dashboard',
                component:
                    Dashboard,
                meta: {
                    requiresAuth:
                        true
                }
            },
            {
                path:
                    '/items/:id',
                name:
                    'item-details',
                component:
                    ItemDetails,
                meta: {
                    requiresAuth:
                        true
                }
            }
        ]
    });

router.beforeEach(
    async to => {

        const auth =
            useAuthStore();

        if (
            !auth.initialized
        ) {

            await auth.fetchCurrentUser();

        }

        if (
            to.meta.requiresAuth &&
            !auth.isAuthenticated
        ) {

            return {
                name:
                    'login',
                query: {
                    redirect:
                        to.fullPath
                }
            };

        }

        if (
            to.name === 'login' &&
            auth.isAuthenticated
        ) {

            return {
                name:
                    'dashboard'
            };

        }

        return true;

    }
);

export default router;
