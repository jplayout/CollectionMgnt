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
        <div>
            <h2>{{ collectionTitle }}</h2>
        </div>

        <dl>
            <div>
                <dt>Images</dt>
                <dd>{{ collection.supports_images ? 'Oui' : 'Non' }}</dd>
            </div>

            <div>
                <dt>Prets</dt>
                <dd>{{ collection.supports_loans ? 'Oui' : 'Non' }}</dd>
            </div>
        </dl>
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
    background: #ffffff;
    border: 1px solid #d8dee8;
    border-radius: 8px;
    color: #172033;
    display: grid;
    gap: 18px;
    min-height: 160px;
    padding: 20px;
    text-decoration: none;
    transition: border-color 0.15s ease, transform 0.15s ease;
}

.collection-card:hover {
    border-color: #1f6feb;
    transform: translateY(-1px);
}

h2 {
    font-size: 1.25rem;
    margin: 0;
}

dl {
    display: grid;
    gap: 10px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin: 0;
}

dt {
    color: #5f6f89;
    font-size: 0.8rem;
}

dd {
    font-weight: 700;
    margin: 2px 0 0;
}
</style>
