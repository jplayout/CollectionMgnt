<template>
    <main class="admin-page">
        <header class="page-header">
            <RouterLink
                class="back-link"
                :to="{ name: 'dashboard' }"
            >
                Dashboard
            </RouterLink>

            <div>
                <p class="eyebrow">Administration</p>
                <h1>Administration</h1>
            </div>
        </header>

        <section class="admin-grid">
            <article class="admin-panel">
                <div>
                    <h2>Données</h2>
                    <p>Exporter les données applicatives au format JSON natif.</p>
                </div>

                <button
                    :disabled="exporting"
                    type="button"
                    @click="exportGlobalJson"
                >
                    {{ exporting ? 'Export en cours...' : 'Exporter JSON global' }}
                </button>

                <p
                    v-if="exportError"
                    class="error-message"
                >
                    {{ exportError }}
                </p>

                <div class="panel-divider"></div>

                <div>
                    <h3>Import JSON natif</h3>
                    <p>Import non destructif : les items sont ajoutés, rien n’est remplacé.</p>
                    <p>Les fichiers médias physiques ne sont pas restaurés dans ce lot.</p>
                </div>

                <label class="file-field">
                    Fichier JSON
                    <input
                        accept="application/json,.json"
                        type="file"
                        @change="selectImportFile"
                    >
                </label>

                <button
                    :disabled="importing"
                    type="button"
                    @click="importJson"
                >
                    {{ importing ? 'Import en cours...' : 'Importer JSON' }}
                </button>

                <p
                    v-if="importError"
                    class="error-message"
                >
                    {{ importError }}
                </p>

                <dl
                    v-if="importReport"
                    class="summary-list"
                >
                    <div>
                        <dt>Collections traitées</dt>
                        <dd>{{ importReport.summary.collectionsProcessed }}</dd>
                    </div>

                    <div>
                        <dt>Items créés</dt>
                        <dd>{{ importReport.summary.itemsCreated }}</dd>
                    </div>

                    <div>
                        <dt>Items ignorés</dt>
                        <dd>{{ importReport.summary.itemsSkipped }}</dd>
                    </div>

                    <div>
                        <dt>Médias ignorés</dt>
                        <dd>{{ importReport.summary.mediaMetadataSkipped }}</dd>
                    </div>

                    <div>
                        <dt>Erreurs</dt>
                        <dd>{{ importReport.summary.errorCount }}</dd>
                    </div>

                    <div>
                        <dt>Warnings</dt>
                        <dd>{{ importReport.summary.warningCount }}</dd>
                    </div>
                </dl>

                <div
                    v-if="importReport?.warnings.length"
                    class="report-details"
                >
                    <h4>Warnings</h4>

                    <ul>
                        <li
                            v-for="warning in importReport.warnings"
                            :key="`${warning.code}-${warning.message}`"
                        >
                            {{ warning.message }}
                        </li>
                    </ul>
                </div>

                <div
                    v-if="importReport?.errors.length"
                    class="report-details"
                >
                    <h4>Erreurs</h4>

                    <ul>
                        <li
                            v-for="error in importReport.errors"
                            :key="`${error.code}-${error.message}`"
                        >
                            {{ error.message }}
                        </li>
                    </ul>
                </div>
            </article>

            <article class="admin-panel">
                <div>
                    <h2>Médias</h2>
                    <p>Lancer un audit lecture seule des incohérences entre la base et les fichiers.</p>
                </div>

                <button
                    :disabled="auditing"
                    type="button"
                    @click="runAudit"
                >
                    {{ auditing ? 'Audit en cours...' : 'Lancer audit média' }}
                </button>

                <p
                    v-if="auditError"
                    class="error-message"
                >
                    {{ auditError }}
                </p>

                <dl
                    v-if="auditReport"
                    class="summary-list"
                >
                    <div>
                        <dt>Début du scan</dt>
                        <dd>{{ auditReport.scan_started_at }}</dd>
                    </div>

                    <div>
                        <dt>Fin du scan</dt>
                        <dd>{{ auditReport.scan_finished_at }}</dd>
                    </div>

                    <div>
                        <dt>Issues DB</dt>
                        <dd>{{ auditReport.summary.dbIssueCount }}</dd>
                    </div>

                    <div>
                        <dt>Issues disque</dt>
                        <dd>{{ auditReport.summary.filesystemIssueCount }}</dd>
                    </div>

                    <div>
                        <dt>Candidats nettoyage</dt>
                        <dd>{{ auditReport.summary.cleanupCandidateCount }}</dd>
                    </div>

                    <div>
                        <dt>Warnings</dt>
                        <dd>{{ auditReport.summary.warningCount }}</dd>
                    </div>
                </dl>
            </article>

            <article class="admin-panel">
                <div>
                    <h2>Système</h2>
                    <p>Résumé applicatif sans secrets ni informations utilisateurs sensibles.</p>
                </div>

                <div
                    v-if="systemLoading"
                    class="state-text"
                >
                    Chargement du résumé système...
                </div>

                <p
                    v-else-if="systemError"
                    class="error-message"
                >
                    {{ systemError }}
                </p>

                <dl
                    v-else-if="systemSummary"
                    class="summary-list"
                >
                    <div>
                        <dt>Version</dt>
                        <dd>{{ systemSummary.version }}</dd>
                    </div>

                    <div>
                        <dt>Plugins</dt>
                        <dd>{{ systemSummary.counts.plugins }}</dd>
                    </div>

                    <div>
                        <dt>Plugins actifs</dt>
                        <dd>{{ systemSummary.counts.enabledPlugins }}</dd>
                    </div>

                    <div>
                        <dt>Items</dt>
                        <dd>{{ systemSummary.counts.items }}</dd>
                    </div>

                    <div>
                        <dt>Médias</dt>
                        <dd>{{ systemSummary.counts.media }}</dd>
                    </div>
                </dl>
            </article>
        </section>
    </main>
</template>

<script setup>
import {
    onMounted,
    ref
} from 'vue';

import {
    ApiError
} from '../services/api.js';

import {
    downloadApplicationExport
} from '../services/export-api.js';

import {
    getSystemSummary,
    importNativeJson,
    runMediaAudit
} from '../services/admin-api.js';

const exporting =
    ref(false);

const exportError =
    ref('');

const importing =
    ref(false);

const importError =
    ref('');

const importFile =
    ref(null);

const importReport =
    ref(null);

const auditing =
    ref(false);

const auditError =
    ref('');

const auditReport =
    ref(null);

const systemLoading =
    ref(false);

const systemError =
    ref('');

const systemSummary =
    ref(null);

onMounted(
    loadSystemSummary
);

async function exportGlobalJson() {

    exporting.value =
        true;

    exportError.value =
        '';

    try {

        await downloadApplicationExport();

    } catch (error) {

        exportError.value =
            getErrorMessage(
                error,
                'Export JSON global indisponible.'
            );

    } finally {

        exporting.value =
            false;

    }

}

function selectImportFile(event) {

    importFile.value =
        event.target.files?.[0] ?? null;

    importError.value =
        '';

}

async function importJson() {

    if (
        !importFile.value
    ) {

        importError.value =
            'Sélectionnez un fichier JSON à importer.';

        return;

    }

    importing.value =
        true;

    importError.value =
        '';

    importReport.value =
        null;

    try {

        importReport.value =
            await importNativeJson(
                importFile.value
            );

        await loadSystemSummary();

    } catch (error) {

        importError.value =
            getErrorMessage(
                error,
                'Import JSON indisponible.'
            );

    } finally {

        importing.value =
            false;

    }

}

async function runAudit() {

    auditing.value =
        true;

    auditError.value =
        '';

    try {

        auditReport.value =
            await runMediaAudit();

    } catch (error) {

        auditError.value =
            getErrorMessage(
                error,
                'Audit média indisponible.'
            );

    } finally {

        auditing.value =
            false;

    }

}

async function loadSystemSummary() {

    systemLoading.value =
        true;

    systemError.value =
        '';

    try {

        systemSummary.value =
            await getSystemSummary();

    } catch (error) {

        systemError.value =
            getErrorMessage(
                error,
                'Résumé système indisponible.'
            );

    } finally {

        systemLoading.value =
            false;

    }

}

function getErrorMessage(
    error,
    fallback
) {

    if (
        error instanceof ApiError
    ) {

        return error.message;

    }

    return fallback;

}
</script>

<style scoped>
.admin-page {
    background: #f5f7fa;
    color: #172033;
    min-height: 100vh;
    padding: 32px;
}

.page-header,
.admin-grid {
    margin: 0 auto;
    max-width: 1080px;
}

.page-header {
    display: grid;
    gap: 14px;
    margin-bottom: 24px;
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

h1,
h2,
h3,
h4,
p {
    margin: 0;
}

h2 {
    font-size: 1.2rem;
}

h3 {
    font-size: 1rem;
}

h4 {
    font-size: 0.95rem;
}

.admin-grid {
    display: grid;
    gap: 16px;
}

.admin-panel {
    background: #ffffff;
    border: 1px solid #d8dee8;
    border-radius: 8px;
    display: grid;
    gap: 18px;
    padding: 24px;
}

.admin-panel p {
    color: #5f6f89;
    line-height: 1.5;
    margin-top: 6px;
}

.panel-divider {
    background: #d8dee8;
    height: 1px;
}

.file-field {
    color: #30394b;
    display: grid;
    font-size: 0.9rem;
    gap: 8px;
}

input[type="file"] {
    border: 1px solid #b8c2d1;
    border-radius: 6px;
    font: inherit;
    padding: 10px 12px;
}

button {
    background: #172033;
    border: 0;
    border-radius: 6px;
    color: #ffffff;
    cursor: pointer;
    font: inherit;
    font-weight: 600;
    justify-self: start;
    padding: 10px 14px;
}

button:disabled {
    cursor: wait;
    opacity: 0.65;
}

.summary-list {
    display: grid;
    gap: 12px;
    margin: 0;
}

.summary-list div {
    display: grid;
    gap: 4px;
}

dt {
    color: #5f6f89;
    font-size: 0.85rem;
}

dd {
    font-weight: 700;
    margin: 0;
}

.state-text {
    color: #5f6f89;
}

.error-message {
    color: #b42318;
    font-size: 0.9rem;
}

.report-details {
    display: grid;
    gap: 8px;
}

.report-details ul {
    color: #5f6f89;
    display: grid;
    gap: 6px;
    margin: 0;
    padding-left: 18px;
}

@media (min-width: 820px) {
    .admin-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }
}
</style>
