<template>
    <main class="item-details-page">
        <header class="item-header">
            <RouterLink
                class="back-link"
                :to="{ name: 'dashboard' }"
            >
                Dashboard
            </RouterLink>

            <div>
                <p class="eyebrow">Item details</p>
                <h1>Item #{{ itemId }}</h1>
            </div>
        </header>

        <MediaGallery :item-id="itemId" />
    </main>
</template>

<script setup>
import {
    computed
} from 'vue';

import {
    useRoute
} from 'vue-router';

import MediaGallery
from '../components/media/MediaGallery.vue';

const route =
    useRoute();

const itemId =
    computed(
        () => route.params.id
    );
</script>

<style scoped>
.item-details-page {
    background: #f5f7fa;
    color: #172033;
    min-height: 100vh;
    padding: 32px;
}

.item-header {
    display: grid;
    gap: 14px;
    margin: 0 auto 24px;
    max-width: 1080px;
}

.back-link {
    color: #1f6feb;
    font-weight: 600;
    text-decoration: none;
}

.back-link:hover {
    text-decoration: underline;
}

.eyebrow {
    color: #5f6f89;
    font-size: 0.85rem;
    margin: 0 0 4px;
}

h1 {
    margin: 0;
}
</style>
