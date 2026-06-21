<template>
    <main class="admin-page">
        <header class="page-header">
            <div>
                <h1>Administration</h1>
            </div>
        </header>

        <section class="admin-grid">
            <article class="admin-panel">
                <div>
                    <h2>Données</h2>
                    <p>Crée un export complet au format JSON natif de l'application.</p>
                </div>

                <button
                    :disabled="exporting"
                    type="button"
                    @click="exportGlobalJson"
                >
                    {{ exporting ? 'Export en cours...' : 'Exporter toutes les données' }}
                </button>

                <p
                    v-if="exportError"
                    class="error-message"
                >
                    {{ exportError }}
                </p>

                <div class="panel-divider"></div>

                <div>
                    <h3>Import de données</h3>
                    <p>Importe un export natif de l'application au format JSON.</p>
                    <p>Mode non destructif : les items sont ajoutés, rien n’est remplacé.</p>
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
                    {{ importing ? 'Import en cours...' : 'Importer des données' }}
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
                    <h2>Sauvegarde</h2>
                    <p>Archive ZIP contenant la base de données, les médias et les données nécessaires à une restauration future.</p>
                    <p>Cette sauvegarde contient la base complète et doit être conservée en lieu sûr.</p>
                </div>

                <button
                    :disabled="backupDownloading"
                    type="button"
                    @click="downloadBackup"
                >
                    {{ backupDownloading ? 'Préparation...' : 'Télécharger la sauvegarde' }}
                </button>

                <p
                    v-if="backupError"
                    class="error-message"
                >
                    {{ backupError }}
                </p>
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

                <div class="panel-divider"></div>

                <div>
                    <h3>Nettoyage manuel guidé</h3>
                    <p>Prévisualiser les fichiers et dossiers orphelins sûrs avant suppression.</p>
                </div>

                <button
                    :disabled="cleanupPreviewing"
                    type="button"
                    @click="previewCleanup"
                >
                    {{ cleanupPreviewing ? 'Prévisualisation...' : 'Prévisualiser nettoyage' }}
                </button>

                <p
                    v-if="cleanupError"
                    class="error-message"
                >
                    {{ cleanupError }}
                </p>

                <dl
                    v-if="cleanupPreview"
                    class="summary-list"
                >
                    <div>
                        <dt>Candidats sûrs</dt>
                        <dd>{{ cleanupPreview.summary.candidateCount }}</dd>
                    </div>

                    <div>
                        <dt>Fichiers</dt>
                        <dd>{{ cleanupPreview.summary.fileCount }}</dd>
                    </div>

                    <div>
                        <dt>Dossiers</dt>
                        <dd>{{ cleanupPreview.summary.folderCount }}</dd>
                    </div>

                    <div>
                        <dt>Taille fichiers</dt>
                        <dd>{{ formatBytes(cleanupPreview.summary.totalBytes) }}</dd>
                    </div>
                </dl>

                <div
                    v-if="cleanupPreview?.candidates.length"
                    class="cleanup-controls"
                >
                    <div class="button-row">
                        <button
                            class="secondary-button"
                            type="button"
                            @click="selectAllCleanupCandidates"
                        >
                            Tout sélectionner
                        </button>

                        <button
                            class="secondary-button"
                            type="button"
                            @click="clearCleanupSelection"
                        >
                            Tout désélectionner
                        </button>
                    </div>

                    <ul class="candidate-list">
                        <li
                            v-for="candidate in cleanupPreview.candidates"
                            :key="candidate.id"
                        >
                            <label class="candidate-row">
                                <input
                                    v-model="selectedCleanupCandidateIds"
                                    type="checkbox"
                                    :value="candidate.id"
                                >

                                <span>
                                    <strong>{{ candidate.code }}</strong>
                                    <small>
                                        {{ candidate.relativePath }}
                                        <template v-if="candidate.size !== undefined">
                                            · {{ formatBytes(candidate.size) }}
                                        </template>
                                    </small>
                                    <small>{{ candidate.reason }}</small>
                                </span>
                            </label>
                        </li>
                    </ul>

                    <button
                        :disabled="cleanupExecuting || selectedCleanupCandidateIds.length === 0"
                        type="button"
                        @click="executeCleanup"
                    >
                        {{ cleanupExecuting ? 'Nettoyage...' : 'Nettoyer la sélection' }}
                    </button>
                </div>

                <dl
                    v-if="cleanupResult"
                    class="summary-list"
                >
                    <div>
                        <dt>Demandés</dt>
                        <dd>{{ cleanupResult.summary.requested }}</dd>
                    </div>

                    <div>
                        <dt>Supprimés</dt>
                        <dd>{{ cleanupResult.summary.deleted }}</dd>
                    </div>

                    <div>
                        <dt>Ignorés</dt>
                        <dd>{{ cleanupResult.summary.skipped }}</dd>
                    </div>

                    <div>
                        <dt>Erreurs</dt>
                        <dd>{{ cleanupResult.summary.errors }}</dd>
                    </div>

                    <div>
                        <dt>Octets supprimés</dt>
                        <dd>{{ formatBytes(cleanupResult.summary.bytesDeleted) }}</dd>
                    </div>
                </dl>

                <div
                    v-if="cleanupResult?.skipped.length"
                    class="report-details"
                >
                    <h4>Ignorés</h4>

                    <ul>
                        <li
                            v-for="skipped in cleanupResult.skipped"
                            :key="`${skipped.id}-${skipped.reason}`"
                        >
                            {{ skipped.reason }}<template v-if="skipped.relativePath"> : {{ skipped.relativePath }}</template>
                        </li>
                    </ul>
                </div>

                <div
                    v-if="cleanupResult?.errors.length"
                    class="report-details"
                >
                    <h4>Erreurs</h4>

                    <ul>
                        <li
                            v-for="error in cleanupResult.errors"
                            :key="`${error.id}-${error.reason}`"
                        >
                            {{ error.reason }} : {{ error.relativePath }}
                        </li>
                    </ul>
                </div>
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
    downloadBackupZip,
    executeMediaCleanup,
    getSystemSummary,
    importNativeJson,
    previewMediaCleanup,
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

const backupDownloading =
    ref(false);

const backupError =
    ref('');

const auditing =
    ref(false);

const auditError =
    ref('');

const auditReport =
    ref(null);

const cleanupPreviewing =
    ref(false);

const cleanupExecuting =
    ref(false);

const cleanupError =
    ref('');

const cleanupPreview =
    ref(null);

const cleanupResult =
    ref(null);

const selectedCleanupCandidateIds =
    ref([]);

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

async function downloadBackup() {

    backupDownloading.value =
        true;

    backupError.value =
        '';

    try {

        await downloadBackupZip();

    } catch (error) {

        backupError.value =
            getErrorMessage(
                error,
                'Sauvegarde ZIP indisponible.'
            );

    } finally {

        backupDownloading.value =
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

async function previewCleanup() {

    cleanupPreviewing.value =
        true;

    cleanupError.value =
        '';

    cleanupResult.value =
        null;

    selectedCleanupCandidateIds.value =
        [];

    try {

        cleanupPreview.value =
            await previewMediaCleanup();

    } catch (error) {

        cleanupError.value =
            getErrorMessage(
                error,
                'Prévisualisation du nettoyage indisponible.'
            );

    } finally {

        cleanupPreviewing.value =
            false;

    }

}

function selectAllCleanupCandidates() {

    selectedCleanupCandidateIds.value =
        cleanupPreview.value?.candidates.map(
            candidate => candidate.id
        ) ?? [];

}

function clearCleanupSelection() {

    selectedCleanupCandidateIds.value =
        [];

}

async function executeCleanup() {

    if (
        selectedCleanupCandidateIds.value.length === 0
    ) {

        return;

    }

    const confirmed =
        window.confirm(
            `Supprimer ${selectedCleanupCandidateIds.value.length} candidat(s) média sélectionné(s) ?`
        );

    if (
        !confirmed
    ) {

        return;

    }

    cleanupExecuting.value =
        true;

    cleanupError.value =
        '';

    try {

        cleanupResult.value =
            await executeMediaCleanup(
                selectedCleanupCandidateIds.value
            );

        cleanupPreview.value =
            await previewMediaCleanup();

        selectedCleanupCandidateIds.value =
            [];

    } catch (error) {

        cleanupError.value =
            getErrorMessage(
                error,
                'Nettoyage média indisponible.'
            );

    } finally {

        cleanupExecuting.value =
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

function formatBytes(bytes) {

    if (
        !Number.isFinite(
            bytes
        )
    ) {

        return '0 o';

    }

    if (
        bytes < 1024
    ) {

        return `${bytes} o`;

    }

    const units =
        [
            'Ko',
            'Mo',
            'Go'
        ];

    let value =
        bytes / 1024;

    let unitIndex =
        0;

    while (
        value >= 1024 &&
        unitIndex < units.length - 1
    ) {

        value /=
            1024;

        unitIndex +=
            1;

    }

    return `${value.toFixed(1)} ${units[unitIndex]}`;

}
</script>

<style scoped>
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
    gap: 18px;
}

.admin-panel {
    align-content: start;
    background: #ffffff;
    border: 1px solid #d8dee8;
    border-radius: 8px;
    display: grid;
    gap: 16px;
    min-height: 220px;
    padding: 22px;
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
    min-height: 44px;
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
    min-height: 44px;
    padding: 10px 14px;
}

button:disabled {
    cursor: wait;
    opacity: 0.65;
}

.secondary-button {
    background: #eef2f7;
    color: #172033;
}

.button-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
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
    overflow-wrap: anywhere;
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
    overflow-wrap: anywhere;
    padding-left: 18px;
}

.cleanup-controls,
.candidate-list {
    display: grid;
    gap: 12px;
}

.candidate-list {
    list-style: none;
    margin: 0;
    padding: 0;
}

.candidate-row {
    align-items: start;
    border: 1px solid #d8dee8;
    border-radius: 6px;
    display: grid;
    gap: 10px;
    grid-template-columns: auto minmax(0, 1fr);
    padding: 10px;
}

.candidate-row input {
    margin-top: 3px;
}

.candidate-row span {
    display: grid;
    gap: 4px;
    min-width: 0;
}

.candidate-row small {
    color: #5f6f89;
    overflow-wrap: anywhere;
}

@media (min-width: 900px) {
    .admin-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 639px) {
    .admin-panel {
        gap: 14px;
        padding: 18px;
    }

    button {
        justify-self: stretch;
        width: 100%;
    }

    .button-row {
        display: grid;
        grid-template-columns: 1fr;
    }

    .candidate-row {
        gap: 8px;
    }
}
</style>
