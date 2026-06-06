<template>
    <main class="login-page">
        <section class="login-panel">
            <h1>Collection Manager</h1>

            <form
                class="login-form"
                @submit.prevent="submit"
            >
                <label>
                    Username
                    <input
                        v-model="username"
                        autocomplete="username"
                        :disabled="auth.loading"
                        required
                        type="text"
                    >
                </label>

                <label>
                    Password
                    <input
                        v-model="password"
                        autocomplete="current-password"
                        :disabled="auth.loading"
                        required
                        type="password"
                    >
                </label>

                <p
                    v-if="error"
                    class="error-message"
                >
                    {{ error }}
                </p>

                <button
                    :disabled="auth.loading"
                    type="submit"
                >
                    {{ auth.loading ? 'Signing in...' : 'Sign in' }}
                </button>
            </form>
        </section>
    </main>
</template>

<script setup>
import {
    ref
} from 'vue';

import {
    useRoute,
    useRouter
} from 'vue-router';

import {
    useAuthStore
} from '../stores/auth.js';

const auth =
    useAuthStore();

const route =
    useRoute();

const router =
    useRouter();

const username =
    ref('');

const password =
    ref('');

const error =
    ref('');

async function submit() {

    error.value =
        '';

    try {

        await auth.login(
            username.value,
            password.value
        );

        password.value =
            '';

        await router.push(
            getRedirectPath()
        );

    } catch {

        error.value =
            auth.error || 'Invalid credentials';

        password.value =
            '';

    }

}

function getRedirectPath() {

    const redirect =
        route.query.redirect;

    if (
        typeof redirect === 'string' &&
        redirect.startsWith('/') &&
        !redirect.startsWith('//')
    ) {

        return redirect;

    }

    return '/dashboard';

}
</script>

<style scoped>
.login-page {
    align-items: center;
    background: #f5f7fa;
    display: flex;
    min-height: 100vh;
    justify-content: center;
    padding: 24px;
}

.login-panel {
    background: #ffffff;
    border: 1px solid #d8dee8;
    border-radius: 8px;
    box-shadow: 0 10px 30px rgba(31, 41, 55, 0.08);
    max-width: 380px;
    padding: 28px;
    width: 100%;
}

h1 {
    color: #172033;
    font-size: 1.5rem;
    margin: 0 0 24px;
}

.login-form {
    display: grid;
    gap: 16px;
}

label {
    color: #30394b;
    display: grid;
    font-size: 0.9rem;
    gap: 6px;
}

input {
    border: 1px solid #b8c2d1;
    border-radius: 6px;
    font: inherit;
    padding: 10px 12px;
}

button {
    background: #1f6feb;
    border: 0;
    border-radius: 6px;
    color: #ffffff;
    cursor: pointer;
    font: inherit;
    font-weight: 600;
    padding: 11px 14px;
}

button:disabled {
    cursor: wait;
    opacity: 0.65;
}

.error-message {
    color: #b42318;
    font-size: 0.9rem;
    margin: 0;
}
</style>
