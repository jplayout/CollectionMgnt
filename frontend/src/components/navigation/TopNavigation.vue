<template>
    <header class="top-navigation">
        <RouterLink
            class="brand-link"
            :to="{ name: 'collections' }"
        >
            CollectionMgnt
        </RouterLink>

        <div class="navigation-spacer"></div>

        <UserMenu />
    </header>
</template>

<script setup>
import UserMenu
from './UserMenu.vue';
</script>

<style scoped>
.top-navigation {
    align-items: center;
    background: #ffffff;
    border-bottom: 1px solid #d8dee8;
    display: flex;
    gap: 18px;
    min-height: 64px;
    padding: 0 32px;
}

.brand-link {
    color: #172033;
    font-size: 1.05rem;
    font-weight: 800;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    text-decoration: none;
    white-space: nowrap;
}

.navigation-spacer {
    flex: 1;
}

@media (max-width: 899px) {
    .top-navigation {
        padding: 0 24px;
    }
}

@media (max-width: 639px) {
    .top-navigation {
        gap: 12px;
        padding: 14px 16px;
    }
}
</style>
