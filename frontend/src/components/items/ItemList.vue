<template>
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
.list-scroll {
    background: #ffffff;
    border: 1px solid #d8dee8;
    border-radius: 8px;
    overflow-x: auto;
    width: 100%;
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
    padding: 8px 11px;
    text-decoration: none;
}

.open-link:hover {
    background: #26324a;
}

@media (max-width: 640px) {
    .items-list {
        min-width: 620px;
    }

    th,
    td {
        padding: 10px 12px;
    }
}
</style>
