<template>
    <main class="dashboard-page">
        <header class="dashboard-header">
            <div>
                <p class="eyebrow">Collection Manager</p>
                <h1>Dashboard</h1>
            </div>

            <button
                type="button"
                @click="logout"
            >
                Logout
            </button>
        </header>

        <section class="user-panel">
            <h2>Signed in</h2>
            <dl>
                <div>
                    <dt>Username</dt>
                    <dd>{{ auth.user?.username }}</dd>
                </div>

                <div>
                    <dt>Language</dt>
                    <dd>{{ auth.user?.preferred_language }}</dd>
                </div>
            </dl>

            <RouterLink
                class="primary-link"
                :to="{ name: 'collections' }"
            >
                Ouvrir les collections
            </RouterLink>
        </section>
    </main>
</template>

<script setup>
import {
    useRouter
} from 'vue-router';

import {
    useAuthStore
} from '../stores/auth.js';

const auth =
    useAuthStore();

const router =
    useRouter();

async function logout() {

    await auth.logout();

    await router.push({
        name:
            'login'
    });

}
</script>

<style scoped>
.dashboard-page {
    background: #f5f7fa;
    color: #172033;
    min-height: 100vh;
    padding: 32px;
}

.dashboard-header {
    align-items: center;
    display: flex;
    gap: 20px;
    justify-content: space-between;
    margin: 0 auto 24px;
    max-width: 960px;
}

.eyebrow {
    color: #5f6f89;
    font-size: 0.85rem;
    margin: 0 0 4px;
}

h1,
h2 {
    margin: 0;
}

button {
    background: #172033;
    border: 0;
    border-radius: 6px;
    color: #ffffff;
    cursor: pointer;
    font: inherit;
    font-weight: 600;
    padding: 10px 14px;
}

.user-panel {
    background: #ffffff;
    border: 1px solid #d8dee8;
    border-radius: 8px;
    margin: 0 auto;
    max-width: 960px;
    padding: 24px;
}

dl {
    display: grid;
    gap: 16px;
    margin: 20px 0 0;
}

dl div {
    display: grid;
    gap: 4px;
}

dt {
    color: #5f6f89;
    font-size: 0.85rem;
}

dd {
    margin: 0;
}

.primary-link {
    color: #1f6feb;
    display: inline-block;
    font-weight: 600;
    margin-top: 22px;
    text-decoration: none;
}

.primary-link:hover {
    text-decoration: underline;
}
</style>
