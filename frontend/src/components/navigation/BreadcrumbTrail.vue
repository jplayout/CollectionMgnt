<template>
    <nav
        aria-label="Fil d’Ariane"
        class="breadcrumb-trail"
    >
        <ol>
            <li
                v-for="(item, index) in items"
                :key="`${index}-${item.label}`"
            >
                <RouterLink
                    v-if="item.to"
                    :to="item.to"
                >
                    {{ item.label }}
                </RouterLink>

                <span v-else>
                    {{ item.label }}
                </span>
            </li>
        </ol>
    </nav>
</template>

<script setup>
defineProps({
    items: {
        required:
            true,
        type:
            Array
    }
});
</script>

<style scoped>
.breadcrumb-trail {
    color: #5f6f89;
    font-size: 0.9rem;
    font-weight: 600;
}

ol {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    list-style: none;
    margin: 0;
    padding: 0;
}

li {
    align-items: center;
    display: flex;
    gap: 6px;
}

li:not(:last-child)::after {
    color: #9aa8bb;
    content: "/";
}

a {
    color: #1f6feb;
    text-decoration: none;
}

a:hover {
    text-decoration: underline;
}

span {
    color: #172033;
}
</style>
