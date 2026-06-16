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

@media (max-width: 640px) {
    .app-content {
        padding: 20px;
    }
}
</style>
