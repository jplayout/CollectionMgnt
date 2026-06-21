<template>
    <div class="app-layout">
        <TopNavigation />

        <div class="app-content">
            <slot />
        </div>
    </div>
</template>

<script setup>
import TopNavigation
from '../components/navigation/TopNavigation.vue';
</script>

<style scoped>
.app-layout {
    background: #f5f7fa;
    color: #172033;
    min-height: 100vh;
}

.app-content {
    padding: 32px;
}

/* Responsive convention: mobile <= 639px, tablet 640px-899px, desktop >= 900px. */
@media (max-width: 899px) {
    .app-content {
        padding: 28px 24px;
    }
}

@media (max-width: 639px) {
    .app-content {
        padding: 20px 16px;
    }
}
</style>
