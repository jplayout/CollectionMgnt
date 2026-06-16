<template>
    <RouterLink
        class="collection-card"
        :to="{
            name: 'collection-items',
            params: {
                pluginId: collection.code
            }
        }"
    >
        <h2>{{ collectionTitle }}</h2>
    </RouterLink>
</template>

<script setup>
import {
    computed
} from 'vue';

const props =
    defineProps({
    collection: {
        required:
            true,
        type:
            Object
    }
});

const collectionTitle =
    computed(
        () => props.collection.display_name ||
            props.collection.code
    );
</script>

<style scoped>
.collection-card {
    align-items: center;
    background: #ffffff;
    border: 1px solid #d8dee8;
    border-radius: 8px;
    color: #172033;
    display: flex;
    justify-content: center;
    min-height: 160px;
    padding: 20px;
    text-align: center;
    text-decoration: none;
    transition: border-color 0.15s ease, transform 0.15s ease;
}

.collection-card:hover {
    border-color: #1f6feb;
    transform: translateY(-1px);
}

h2 {
    font-size: 1.45rem;
    line-height: 1.2;
    margin: 0;
    overflow-wrap: anywhere;
}
</style>
