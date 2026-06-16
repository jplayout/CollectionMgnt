<template>
    <RouterView v-if="!usesAppLayout" />

    <AppLayout v-else>
        <RouterView />
    </AppLayout>
</template>

<script setup>
import {
    computed
} from 'vue';

import {
    useRoute
} from 'vue-router';

import AppLayout
from './layouts/AppLayout.vue';

const route =
    useRoute();

const usesAppLayout =
    computed(
        () => Boolean(
            route.meta.requiresAuth
        )
    );
</script>
