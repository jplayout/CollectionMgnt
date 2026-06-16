<template>
    <div class="user-menu">
        <button
            aria-haspopup="menu"
            :aria-expanded="isOpen"
            class="user-menu-trigger"
            type="button"
            @click="toggleMenu"
        >
            <span
                aria-hidden="true"
                class="user-avatar"
            >
                {{ userInitial }}
            </span>
        </button>

        <div
            v-if="isOpen"
            class="user-menu-panel"
            role="menu"
        >
            <div class="user-menu-identity">
                {{ userLabel }}
            </div>

            <button
                class="menu-item disabled"
                disabled
                role="menuitem"
                type="button"
            >
                Mon compte
                <span>À venir</span>
            </button>

            <RouterLink
                class="menu-item"
                role="menuitem"
                :to="{ name: 'admin' }"
                @click="closeMenu"
            >
                Administration
            </RouterLink>

            <button
                class="menu-item"
                role="menuitem"
                type="button"
                @click="logout"
            >
                Déconnexion
            </button>
        </div>
    </div>
</template>

<script setup>
import {
    computed,
    ref
} from 'vue';

import {
    useRouter
} from 'vue-router';

import {
    useAuthStore
} from '../../stores/auth.js';

const auth =
    useAuthStore();

const router =
    useRouter();

const isOpen =
    ref(false);

const userLabel =
    computed(
        () => auth.user?.username ??
            auth.user?.email ??
            'Utilisateur'
    );

const userInitial =
    computed(
        () => userLabel.value.trim().charAt(0).toUpperCase() || 'U'
    );

function toggleMenu() {

    isOpen.value =
        !isOpen.value;

}

function closeMenu() {

    isOpen.value =
        false;

}

async function logout() {

    closeMenu();

    await auth.logout();

    await router.push({
        name:
            'login'
    });

}
</script>

<style scoped>
.user-menu {
    justify-self: end;
    position: relative;
}

.user-menu-trigger {
    align-items: center;
    background: #ffffff;
    border: 1px solid #d8dee8;
    border-radius: 999px;
    color: #172033;
    cursor: pointer;
    display: flex;
    font: inherit;
    font-weight: 700;
    padding: 4px;
}

.user-menu-trigger:hover {
    background: #eef2f7;
}

.user-avatar {
    align-items: center;
    background: #172033;
    border-radius: 999px;
    color: #ffffff;
    display: inline-flex;
    height: 32px;
    justify-content: center;
    width: 32px;
}

.user-menu-panel {
    background: #ffffff;
    border: 1px solid #d8dee8;
    border-radius: 8px;
    box-shadow: 0 12px 24px rgb(23 32 51 / 0.14);
    display: grid;
    gap: 4px;
    min-width: 190px;
    padding: 8px;
    position: absolute;
    right: 0;
    top: calc(100% + 8px);
    z-index: 20;
}

.user-menu-identity {
    border-bottom: 1px solid #eef2f7;
    color: #5f6f89;
    font-size: 0.9rem;
    font-weight: 700;
    margin-bottom: 4px;
    overflow: hidden;
    padding: 8px 10px 10px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.menu-item {
    background: transparent;
    border: 0;
    border-radius: 6px;
    color: #172033;
    cursor: pointer;
    display: flex;
    font: inherit;
    justify-content: space-between;
    padding: 9px 10px;
    text-align: left;
    text-decoration: none;
}

.menu-item:hover:not(:disabled) {
    background: #eef2f7;
}

.menu-item.disabled {
    color: #8a96a8;
    cursor: not-allowed;
}

.menu-item span {
    color: #5f6f89;
    font-size: 0.8rem;
}

@media (max-width: 640px) {
    .user-menu {
        justify-self: start;
    }

    .user-menu-panel {
        left: 0;
        right: auto;
    }
}
</style>
