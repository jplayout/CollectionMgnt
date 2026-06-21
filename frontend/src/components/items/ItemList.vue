<template>
    <div class="item-list-layout">
        <div class="list-scroll">
            <table class="items-list">
                <thead>
                    <tr>
                        <th scope="col">
                            Titre
                        </th>

                        <th
                            v-for="column in metadataColumns"
                            :key="column.name"
                            scope="col"
                        >
                            {{ column.label ?? column.name }}
                        </th>

                        <th
                            class="action-heading"
                            scope="col"
                        >
                            Action
                        </th>
                    </tr>
                </thead>

                <tbody>
                    <tr
                        v-for="item in items"
                        :key="item.id"
                    >
                        <th
                            class="title-cell"
                            scope="row"
                        >
                            {{ item.title }}
                        </th>

                        <td
                            v-for="column in metadataColumns"
                            :key="column.name"
                        >
                            {{ formatCellValue(column, item.metadata?.[column.name]) }}
                        </td>

                        <td class="action-cell">
                            <RouterLink
                                class="open-link"
                                :to="getItemDetailsTarget(item)"
                            >
                                Ouvrir
                            </RouterLink>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="mobile-list">
            <article
                v-for="item in items"
                :key="item.id"
                class="mobile-row"
            >
                <div class="mobile-row-main">
                    <h2>{{ item.title }}</h2>

                    <dl
                        v-if="mobileMetadataColumns.length"
                        class="mobile-metadata"
                    >
                        <div
                            v-for="column in mobileMetadataColumns"
                            :key="column.name"
                        >
                            <dt>{{ column.label ?? column.name }}</dt>
                            <dd>{{ formatCellValue(column, item.metadata?.[column.name]) }}</dd>
                        </div>
                    </dl>
                </div>

                <RouterLink
                    class="open-link mobile-open-link"
                    :to="getItemDetailsTarget(item)"
                >
                    Ouvrir
                </RouterLink>
            </article>
        </div>
    </div>
</template>

<script setup>
import {
    computed
} from 'vue';

import {
    useRoute
} from 'vue-router';

import {
    formatMetadataValue,
    isEmptyMetadataValue
} from '../../utils/metadata-formatters.js';

const props =
    defineProps({
        items: {
            default:
                () => [],
            type:
                Array
        },
        fields: {
            default:
                () => [],
            type:
                Array
        },
        displayPreferences: {
            default:
                null,
            type:
                Object
        }
    });

const route =
    useRoute();

const metadataColumns =
    computed(
        () => {

            const fieldsByName =
                new Map(
                    props.fields.map(
                        field => [
                            field.name,
                            field
                        ]
                    )
                );

            const highlightedFields =
                Array.isArray(
                    props.displayPreferences?.list?.highlightedFields
                )
                    ? props.displayPreferences.list.highlightedFields
                    : [];

            return highlightedFields
                .map(
                    fieldName => fieldsByName.get(
                        fieldName
                    )
                )
                .filter(Boolean);

        }
    );

const mobileMetadataColumns =
    computed(
        () => metadataColumns.value.slice(
            0,
            3
        )
    );

function formatCellValue(
    field,
    value
) {

    if (
        isEmptyMetadataValue(
            value
        )
    ) {

        return '—';

    }

    return formatMetadataValue(
        field,
        value
    );

}

function getItemDetailsTarget(
    item
) {

    return {
        name:
            'item-details',
        params: {
            id:
                item.id
        },
        query: {
            returnTo:
                route.fullPath
        }
    };

}
</script>

<style scoped>
.item-list-layout {
    width: 100%;
}

.list-scroll {
    background: #ffffff;
    border: 1px solid #d8dee8;
    border-radius: 8px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    width: 100%;
}

.mobile-list {
    display: none;
}

.items-list {
    border-collapse: collapse;
    min-width: 680px;
    width: 100%;
}

th,
td {
    border-bottom: 1px solid #e4e9f2;
    padding: 12px 14px;
    text-align: left;
    vertical-align: top;
}

thead th {
    background: #f8fafc;
    color: #5f6f89;
    font-size: 0.78rem;
    font-weight: 700;
    text-transform: uppercase;
}

tbody tr:last-child th,
tbody tr:last-child td {
    border-bottom: 0;
}

tbody tr:hover {
    background: #f8fbff;
}

.title-cell {
    color: #172033;
    font-weight: 700;
    min-width: 180px;
}

td {
    color: #30394b;
    overflow-wrap: anywhere;
}

.action-heading,
.action-cell {
    text-align: right;
    white-space: nowrap;
}

.open-link {
    background: #172033;
    border-radius: 6px;
    color: #ffffff;
    display: inline-block;
    font-weight: 700;
    min-height: 40px;
    padding: 8px 11px;
    text-decoration: none;
}

.open-link:hover {
    background: #26324a;
}

@media (max-width: 639px) {
    .list-scroll {
        display: none;
    }

    .mobile-list {
        display: grid;
        gap: 12px;
    }

    .mobile-row {
        background: #ffffff;
        border: 1px solid #d8dee8;
        border-radius: 8px;
        display: grid;
        gap: 14px;
        padding: 14px;
    }

    .mobile-row-main {
        display: grid;
        gap: 10px;
        min-width: 0;
    }

    .mobile-row h2 {
        color: #172033;
        font-size: 1rem;
        margin: 0;
        overflow-wrap: anywhere;
    }

    .mobile-metadata {
        display: grid;
        gap: 8px;
        margin: 0;
    }

    .mobile-metadata div {
        display: grid;
        gap: 2px;
    }

    .mobile-metadata dt {
        color: #5f6f89;
        font-size: 0.78rem;
        font-weight: 700;
    }

    .mobile-metadata dd {
        color: #30394b;
        margin: 0;
        overflow-wrap: anywhere;
    }

    .mobile-open-link {
        justify-self: stretch;
        min-height: 44px;
        text-align: center;
    }
}
</style>
