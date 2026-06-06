import {
    defineStore
} from 'pinia';

import {
    ApiError,
    apiFetch
} from '../services/api.js';

const TOKEN_STORAGE_KEY = 'auth_token';

export const useAuthStore =
    defineStore(
        'auth',
        {
            state: () => ({
                user: null,
                token:
                    sessionStorage.getItem(
                        TOKEN_STORAGE_KEY
                    ),
                initialized: false,
                loading: false,
                error: null
            }),

            getters: {
                isAuthenticated:
                    state => Boolean(
                        state.token &&
                        state.user
                    )
            },

            actions: {
                setToken(
                    token
                ) {

                    this.token =
                        token;

                    sessionStorage.setItem(
                        TOKEN_STORAGE_KEY,
                        token
                    );

                },

                clearAuth() {

                    this.user =
                        null;

                    this.token =
                        null;

                    this.error =
                        null;

                    sessionStorage.removeItem(
                        TOKEN_STORAGE_KEY
                    );

                },

                async login(
                    username,
                    password
                ) {

                    this.loading =
                        true;

                    this.error =
                        null;

                    try {

                        const response =
                            await apiFetch(
                                '/api/auth/login',
                                {
                                    method:
                                        'POST',
                                    body: {
                                        username,
                                        password
                                    }
                                }
                            );

                        this.setToken(
                            response.token
                        );

                        this.user =
                            response.user;

                        this.initialized =
                            true;

                        return response.user;

                    } catch (error) {

                        this.clearAuth();

                        this.error =
                            getAuthErrorMessage(
                                error
                            );

                        throw error;

                    } finally {

                        this.loading =
                            false;

                    }

                },

                async fetchCurrentUser() {

                    if (
                        !this.token
                    ) {

                        this.initialized =
                            true;

                        return null;

                    }

                    this.loading =
                        true;

                    this.error =
                        null;

                    try {

                        const response =
                            await apiFetch(
                                '/api/auth/me'
                            );

                        this.user =
                            response.user;

                        return response.user;

                    } catch (error) {

                        if (
                            error instanceof ApiError &&
                            error.status === 401
                        ) {

                            this.clearAuth();

                        }

                        this.error =
                            getAuthErrorMessage(
                                error
                            );

                        return null;

                    } finally {

                        this.initialized =
                            true;

                        this.loading =
                            false;

                    }

                },

                async logout() {

                    try {

                        if (
                            this.token
                        ) {

                            await apiFetch(
                                '/api/auth/logout',
                                {
                                    method:
                                        'POST'
                                }
                            );

                        }

                    } catch {

                        // Logout remains local for this stateless JWT flow.

                    } finally {

                        this.clearAuth();
                        this.initialized =
                            true;

                    }

                }
            }
        }
    );

function getAuthErrorMessage(
    error
) {

    if (
        error instanceof ApiError
    ) {

        return error.message;

    }

    return 'Unable to contact the server';

}
