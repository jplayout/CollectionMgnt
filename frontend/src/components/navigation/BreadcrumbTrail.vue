<template>
    <nav
        aria-label="Fil d’Ariane"
        class="breadcrumb-trail"
    >
        <ol>
            <li
                v-for="(item, index) in items"
                :key="getBreadcrumbItemKey(item, index)"
                :aria-current="isLastItem(index) ? 'page' : undefined"
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
const props =
    defineProps({
    items: {
        required:
            true,
        type:
            Array
    }
});

function isLastItem(index) {

    return index === props.items.length - 1;

}

function getBreadcrumbItemKey(
    item,
    index
) {

    return item.key ??
        getRouteTargetKey(
            item.to
        ) ??
        `${index}-${item.label}`;

}

function getRouteTargetKey(to) {

    if (
        !to
    ) {

        return null;

    }

    if (
        typeof to === 'string'
    ) {

        return to;

    }

    if (
        typeof to === 'object'
    ) {

        if (
            to.name
        ) {

            return [
                to.name,
                JSON.stringify(
                    to.params ?? {}
                ),
                JSON.stringify(
                    to.query ?? {}
                )
            ].join(':');

        }

        if (
            to.path
        ) {

            return to.path;

        }

    }

    return null;

}
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
