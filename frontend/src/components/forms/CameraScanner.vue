<template>
    <Teleport to="body">
        <div
            v-if="open"
            ref="modalElement"
            aria-labelledby="camera-scanner-title"
            aria-modal="true"
            class="camera-scanner-backdrop"
            role="dialog"
            tabindex="-1"
            @click="handleBackdropClick"
            @keydown.esc.prevent="closeWithReason('escape', $event)"
            @keydown.tab="trapFocus"
            @pointerdown="handleBackdropPointerDown"
            @pointerup="handleBackdropPointerUp"
        >
            <section class="camera-scanner-modal">
                <header class="camera-scanner-header">
                    <h2 id="camera-scanner-title">Scanner un code-barres</h2>

                    <button
                        ref="closeButton"
                        aria-label="Fermer le scanner camera"
                        class="camera-scanner-close"
                        type="button"
                        @click.stop="closeWithReason('close-button', $event)"
                    >
                        x
                    </button>
                </header>

                <div class="camera-scanner-preview">
                    <video
                        ref="videoElement"
                        aria-hidden="true"
                        autoplay
                        muted
                        playsinline
                        webkit-playsinline
                    />

                    <div
                        aria-hidden="true"
                        class="camera-scanner-frame"
                    />

                    <aside
                        v-if="isCameraDebugEnabled()"
                        class="camera-debug-panel"
                    >
                        <header class="camera-debug-header">
                            <strong>Diagnostic camera</strong>

                            <button
                                type="button"
                                @click="copyDiagnostic"
                            >
                                Copier le diagnostic
                            </button>
                        </header>

                        <label class="camera-debug-toggle">
                            <input
                                v-model="previewOnly"
                                type="checkbox"
                            >
                            Desactiver la detection
                        </label>

                        <dl class="camera-debug-grid">
                            <template
                                v-for="row in diagnosticRows"
                                :key="row.label"
                            >
                                <dt>{{ row.label }}</dt>
                                <dd>{{ row.value }}</dd>
                            </template>
                        </dl>

                        <ol class="camera-debug-events">
                            <li
                                v-for="entry in diagnosticState.events"
                                :key="entry.id"
                            >
                                {{ entry.time }}ms {{ entry.type }}
                            </li>
                        </ol>
                    </aside>
                </div>

                <p
                    v-if="message"
                    aria-live="polite"
                    class="camera-scanner-message"
                    role="status"
                    :class="{ error: hasError }"
                >
                    {{ message }}
                </p>
            </section>
        </div>
    </Teleport>
</template>

<script setup>
import {
    computed,
    nextTick,
    onBeforeUnmount,
    reactive,
    ref,
    watch
} from 'vue';

import {
    createScannerService
} from '../../services/barcode-scanner/scanner-service.js';

const props =
    defineProps({
        open: {
            default:
                false,
            type:
                Boolean
        },
        scannerFactory: {
            default:
                createScannerService,
            type:
                Function
        },
        triggerElement: {
            default:
                null,
            type:
                Object
        }
    });

const emit =
    defineEmits([
        'close',
        'error',
        'result'
    ]);

function isCameraDebugEnabled() {

    return window.location.href.includes(
        'cameraDebug=1'
    );

}

const closeButton =
    ref(null);

const modalElement =
    ref(null);

const status =
    ref('closed');

const previewOnly =
    ref(false);

const videoElement =
    ref(null);

let scannerService =
    null;

let scannerRunId =
    0;

let openedAt =
    0;

let permissionResolvedAt =
    0;

let pointerDownStartedOnBackdrop =
    false;

let pointerDownAt =
    0;

let diagnosticTimer =
    null;

let diagnosticEventId =
    0;

const diagnosticState =
    reactive({
        adapter:
            'none',
        closeReason:
            '',
        component:
            'mounted',
        detectionAttempts:
            0,
        detectionChecksum:
            0,
        detectionFatal:
            0,
        detectionFormat:
            0,
        detectionNotFound:
            0,
        documentVisibility:
            document.visibilityState,
        error:
            '',
        events: [],
        firstStreamId:
            '',
        getUserMediaCalls:
            0,
        playCalls:
            0,
        sessionId:
            0,
        srcObjectAssignments:
            0,
        srcObjectClears:
            0,
        stopCalls:
            0,
        streamActive:
            false,
        streamId:
            '',
        streamPresent:
            false,
        streamStable:
            true,
        trackEvents: {
            ended:
                0,
            mute:
                0,
            unmute:
                0
        },
        tracks: [],
        video: {
            height:
                0,
            paused:
                true,
            readyState:
                0,
            srcObjectPresent:
                false,
            width:
                0
        }
    });

const protectedStates =
    [
        'opening',
        'requesting-permission',
        'preparing-video'
    ];

const message =
    computed(
        () => {

            if (
                status.value === 'loading'
                || status.value === 'opening'
                || status.value === 'requesting-permission'
            ) {

                return 'Demande d acces a la camera...';

            }

            if (
                status.value === 'scanning'
            ) {

                return 'Placez le code EAN-13 ou UPC-A dans le cadre.';

            }

            if (
                status.value === 'permission-denied'
            ) {

                return 'Acces camera refuse. La saisie manuelle reste disponible.';

            }

            if (
                status.value === 'camera-not-found'
            ) {

                return 'Aucune camera disponible. La saisie manuelle reste disponible.';

            }

            if (
                status.value === 'camera-unavailable'
            ) {

                return 'Camera indisponible ou deja utilisee. La saisie manuelle reste disponible.';

            }

            if (
                status.value === 'video-play-failed'
            ) {

                return 'La camera est autorisee mais la lecture video n a pas demarre. La saisie manuelle reste disponible.';

            }

            if (
                status.value === 'video-preview-unavailable'
            ) {

                return 'La camera est autorisee mais l apercu video n a pas demarre. La saisie manuelle reste disponible.';

            }

            if (
                status.value === 'camera-track-muted'
            ) {

                return 'La camera est autorisee mais le flux video a ete interrompu. La saisie manuelle reste disponible.';

            }

            if (
                status.value === 'insecure-context'
            ) {

                return 'Le scan camera requiert un contexte securise HTTPS. La saisie manuelle reste disponible.';

            }

            if (
                status.value === 'unsupported'
            ) {

                return 'Scan camera non supporte dans ce navigateur. La saisie manuelle reste disponible.';

            }

            if (
                status.value === 'fallback-unavailable'
            ) {

                return 'Module de scan camera indisponible. La saisie manuelle reste disponible.';

            }

            if (
                status.value === 'read-error'
            ) {

                return 'Lecture impossible pour le moment. La saisie manuelle reste disponible.';

            }

            return '';

        }
    );

const hasError =
    computed(
        () => [
            'camera-not-found',
            'camera-unavailable',
            'insecure-context',
            'fallback-unavailable',
            'permission-denied',
            'read-error',
            'unsupported',
            'camera-track-muted',
            'video-play-failed',
            'video-preview-unavailable'
        ].includes(
            status.value
        )
    );

const diagnosticRows =
    computed(
        () => [
            {
                label:
                    'sessionId',
                value:
                    diagnosticState.sessionId
            },
            {
                label:
                    'etat',
                value:
                    status.value
            },
            {
                label:
                    'adaptateur',
                value:
                    diagnosticState.adapter
            },
            {
                label:
                    'getUserMedia',
                value:
                    diagnosticState.getUserMediaCalls
            },
            {
                label:
                    'stream',
                value:
                    `${diagnosticState.streamPresent}/${diagnosticState.streamActive}`
            },
            {
                label:
                    'tracks',
                value:
                    formatTracks()
            },
            {
                label:
                    'srcObject',
                value:
                    `${diagnosticState.video.srcObjectPresent} stable=${diagnosticState.streamStable}`
            },
            {
                label:
                    'video',
                value:
                    `paused=${diagnosticState.video.paused} ready=${diagnosticState.video.readyState} ${diagnosticState.video.width}x${diagnosticState.video.height}`
            },
            {
                label:
                    'play/stop/src',
                value:
                    `${diagnosticState.playCalls}/${diagnosticState.stopCalls}/${diagnosticState.srcObjectAssignments}/${diagnosticState.srcObjectClears}`
            },
            {
                label:
                    'component',
                value:
                    diagnosticState.component
            },
            {
                label:
                    'closeReason',
                value:
                    diagnosticState.closeReason
            },
            {
                label:
                    'erreur',
                value:
                    diagnosticState.error
            },
            {
                label:
                    'detection',
                value:
                    `attempts=${diagnosticState.detectionAttempts} notFound=${diagnosticState.detectionNotFound} checksum=${diagnosticState.detectionChecksum} format=${diagnosticState.detectionFormat} fatal=${diagnosticState.detectionFatal}`
            },
            {
                label:
                    'visibility',
                value:
                    diagnosticState.documentVisibility
            },
            {
                label:
                    'temps',
                value:
                    `${Math.round(
                        now() - openedAt
                    )}ms`
            }
        ]
    );

watch(
    () => props.open,
    async isOpen => {

        if (
            isOpen
        ) {

            await openScanner();

            return;

        }

        stopScanner();

        status.value =
            'closed';

        debugClose(
            'parent-state-change'
        );

    },
    {
        immediate:
            true
    }
);

onBeforeUnmount(
    () => {

        diagnosticState.component =
            'unmounted';

        recordDiagnosticEvent(
            'unmount'
        );

        debugClose(
            'unmount'
        );

        stopScanner();

    }
);

async function openScanner() {

    stopScanner();

    const runId =
        nextScannerRunId();

    openedAt =
        now();

    permissionResolvedAt =
        0;

    resetDiagnosticState();

    status.value =
        'opening';

    debugClose(
        'open'
    );

    scannerService =
        props.scannerFactory();

    await nextTick();

    if (
        !isCurrentScannerRun(
            runId
        ) ||
        !props.open
    ) {

        return;

    }

    modalElement.value?.focus?.({
        preventScroll:
            true
    });

    try {

        await scannerService.start({
            onDiagnostic:
                handleDiagnosticEvent,
            onError:
                handleError,
            onResult:
                handleResult,
            onState:
                handleScannerState,
            previewOnly:
                isCameraDebugEnabled() && previewOnly.value,
            video:
                videoElement.value
        });

        if (
            !isCurrentScannerRun(
                runId
            ) ||
            !props.open
        ) {

            stopScanner();

            return;

        }

        status.value =
            'scanning';

        updateDiagnosticSnapshot();
        startDiagnosticPolling();

        debugClose(
            'scanning'
        );

    } catch (error) {

        if (
            !isCurrentScannerRun(
                runId
            ) ||
            !props.open
        ) {

            return;

        }

        handleError(
            error
        );

    }

}

function handleResult(result) {

    status.value =
        'idle';

    emit(
        'result',
        result
    );

    closeWithReason(
        'result'
    );

}

function handleError(error) {

    status.value =
        error?.code ?? 'read-error';

    diagnosticState.error =
        status.value;

    recordDiagnosticEvent(
        `error ${status.value}`
    );

    emit(
        'error',
        {
            code:
                status.value
        }
    );

}

function handleScannerState(nextStatus) {

    status.value =
        nextStatus;

    recordDiagnosticEvent(
        nextStatus
    );

    if (
        nextStatus === 'preparing-video'
    ) {

        permissionResolvedAt =
            now();

        debugClose(
            'permission-return'
        );

    }

}

function closeWithReason(reason, event) {

    diagnosticState.closeReason =
        reason;

    recordDiagnosticEvent(
        `close ${reason}`
    );

    debugClose(
        reason,
        event
    );

    stopScanner();

    restoreFocus();

    emit(
        'close'
    );

}

function handleBackdropPointerDown(event) {

    pointerDownStartedOnBackdrop =
        event.target === modalElement.value;

    pointerDownAt =
        now();

    debugClose(
        'backdrop-pointerdown',
        event
    );

}

function handleBackdropPointerUp(event) {

    debugClose(
        'backdrop-pointerup',
        event
    );

    if (
        !canCloseFromBackdrop(
            event
        )
    ) {

        pointerDownStartedOnBackdrop =
            false;

        return;

    }

    pointerDownStartedOnBackdrop =
        false;

    closeWithReason(
        'backdrop',
        event
    );

}

function handleBackdropClick(event) {

    debugClose(
        'backdrop-click-ignored',
        event
    );

}

function canCloseFromBackdrop(event) {

    return status.value === 'scanning' &&
        event.target === modalElement.value &&
        pointerDownStartedOnBackdrop &&
        pointerDownAt > openedAt &&
        pointerDownAt > permissionResolvedAt &&
        !protectedStates.includes(
            status.value
        );

}

function stopScanner() {

    nextScannerRunId();

    diagnosticState.stopCalls +=
        1;

    recordDiagnosticEvent(
        'stop'
    );

    scannerService?.stop();

    scannerService =
        null;

    stopDiagnosticPolling();

}

function now() {

    return window.performance?.now?.() ?? Date.now();

}

function debugClose(reason, event) {

    if (
        import.meta.env?.DEV !== true ||
        typeof window.console?.debug !== 'function'
    ) {

        return;

    }

    window.console.debug(
        '[CameraScanner]',
        {
            currentTarget:
                describeEventTarget(
                    event?.currentTarget
                ),
            eventType:
                event?.type,
            openedAt,
            permissionResolvedAt,
            reason,
            sessionId:
                scannerRunId,
            status:
                status.value,
            target:
                describeEventTarget(
                    event?.target
                ),
            timestamp:
                now(),
            visibilityState:
                document.visibilityState
        }
    );

}

function describeEventTarget(target) {

    if (
        !target
    ) {

        return null;

    }

    return {
        className:
            typeof target.className === 'string' ?
                target.className :
                undefined,
        tagName:
            target.tagName
    };

}

function resetDiagnosticState() {

    diagnosticEventId =
        0;

    diagnosticState.adapter =
        'none';
    diagnosticState.closeReason =
        '';
    diagnosticState.component =
        'mounted';
    diagnosticState.detectionAttempts =
        0;
    diagnosticState.detectionChecksum =
        0;
    diagnosticState.detectionFatal =
        0;
    diagnosticState.detectionFormat =
        0;
    diagnosticState.detectionNotFound =
        0;
    diagnosticState.documentVisibility =
        document.visibilityState;
    diagnosticState.error =
        '';
    diagnosticState.events =
        [];
    diagnosticState.firstStreamId =
        '';
    diagnosticState.getUserMediaCalls =
        0;
    diagnosticState.playCalls =
        0;
    diagnosticState.sessionId =
        scannerRunId;
    diagnosticState.srcObjectAssignments =
        0;
    diagnosticState.srcObjectClears =
        0;
    diagnosticState.stopCalls =
        0;
    diagnosticState.streamActive =
        false;
    diagnosticState.streamId =
        '';
    diagnosticState.streamPresent =
        false;
    diagnosticState.streamStable =
        true;
    diagnosticState.trackEvents.ended =
        0;
    diagnosticState.trackEvents.mute =
        0;
    diagnosticState.trackEvents.unmute =
        0;
    diagnosticState.tracks =
        [];
    diagnosticState.video.height =
        0;
    diagnosticState.video.paused =
        true;
    diagnosticState.video.readyState =
        0;
    diagnosticState.video.srcObjectPresent =
        false;
    diagnosticState.video.width =
        0;

    recordDiagnosticEvent(
        'open'
    );

}

function handleDiagnosticEvent(event) {

    diagnosticState.sessionId =
        event.sessionId ?? diagnosticState.sessionId;
    diagnosticState.getUserMediaCalls =
        event.getUserMediaCalls ?? diagnosticState.getUserMediaCalls;

    if (
        event.type === 'stream attached'
    ) {

        diagnosticState.srcObjectAssignments +=
            1;

    }

    if (
        event.type === 'video play requested'
    ) {

        diagnosticState.playCalls +=
            1;

    }

    if (
        event.type === 'adapter-started'
    ) {

        diagnosticState.adapter =
            event.adapter ?? 'none';

    }

    if (
        event.type === 'detection attempt'
    ) {

        diagnosticState.detectionAttempts +=
            1;

    }

    if (
        event.type === 'detection retryable'
    ) {

        if (
            event.errorType === 'checksum'
        ) {

            diagnosticState.detectionChecksum +=
                1;

        } else if (
            event.errorType === 'format'
        ) {

            diagnosticState.detectionFormat +=
                1;

        } else {

            diagnosticState.detectionNotFound +=
                1;

        }

    }

    if (
        event.type === 'detection fatal'
    ) {

        diagnosticState.detectionFatal +=
            1;

    }

    if (
        event.type === 'track mute'
    ) {

        diagnosticState.trackEvents.mute +=
            1;

    }

    if (
        event.type === 'track unmute'
    ) {

        diagnosticState.trackEvents.unmute +=
            1;

    }

    if (
        event.type === 'track ended'
    ) {

        diagnosticState.trackEvents.ended +=
            1;

    }

    applyStreamSnapshot(
        event
    );

    recordDiagnosticEvent(
        formatDiagnosticEvent(
            event
        )
    );

    updateDiagnosticSnapshot();

}

function formatDiagnosticEvent(event) {

    if (
        event.type === 'detection fatal'
    ) {

        return [
            event.type,
            event.errorName ? `name=${event.errorName}` : '',
            event.constructorName ? `constructor=${event.constructorName}` : '',
            event.objectType ? `object=${event.objectType}` : '',
            event.message ? `message=${event.message}` : ''
        ].filter(
            Boolean
        ).join(
            ' '
        );

    }

    if (
        event.errorType
    ) {

        return `${event.type} ${event.errorType}`;

    }

    if (
        event.errorName
    ) {

        return `${event.type} ${event.errorName}`;

    }

    return event.type;

}

function applyStreamSnapshot(snapshot) {

    if (
        !Object.prototype.hasOwnProperty.call(
            snapshot,
            'streamId'
        ) &&
        !snapshot.tracks
    ) {

        return;

    }

    diagnosticState.streamPresent =
        Boolean(
            snapshot.streamId
        );
    diagnosticState.streamActive =
        Boolean(
            snapshot.active
        );
    diagnosticState.streamId =
        snapshot.streamId ?? '';
    diagnosticState.tracks =
        snapshot.tracks ?? [];

    if (
        snapshot.streamId &&
        !diagnosticState.firstStreamId
    ) {

        diagnosticState.firstStreamId =
            snapshot.streamId;

    }

    diagnosticState.streamStable =
        !diagnosticState.firstStreamId ||
        diagnosticState.firstStreamId === snapshot.streamId;

}

function startDiagnosticPolling() {

    if (
        !isCameraDebugEnabled()
    ) {

        return;

    }

    stopDiagnosticPolling();

    diagnosticTimer =
        window.setInterval(
            updateDiagnosticSnapshot,
            250
        );

}

function stopDiagnosticPolling() {

    if (
        diagnosticTimer
    ) {

        window.clearInterval(
            diagnosticTimer
        );

        diagnosticTimer =
            null;

    }

    updateDiagnosticSnapshot();

}

function updateDiagnosticSnapshot() {

    diagnosticState.documentVisibility =
        document.visibilityState;

    const video =
        videoElement.value;

    diagnosticState.video.srcObjectPresent =
        Boolean(
            video?.srcObject
        );
    diagnosticState.video.paused =
        video?.paused ?? true;
    diagnosticState.video.readyState =
        video?.readyState ?? 0;
    diagnosticState.video.width =
        video?.videoWidth ?? 0;
    diagnosticState.video.height =
        video?.videoHeight ?? 0;

    if (
        video &&
        video.srcObject === null
    ) {

        diagnosticState.srcObjectClears =
            Math.max(
                diagnosticState.srcObjectClears,
                diagnosticState.stopCalls
            );

    }

    const snapshot =
        scannerService?.getDebugSnapshot?.();

    if (
        snapshot
    ) {

        diagnosticState.adapter =
            normalizeAdapterName(
                snapshot.adapter
            );
        diagnosticState.getUserMediaCalls =
            snapshot.getUserMediaCalls ?? diagnosticState.getUserMediaCalls;
        diagnosticState.sessionId =
            snapshot.sessionId ?? diagnosticState.sessionId;
        applyStreamSnapshot(
            snapshot.stream ?? {}
        );

    }

}

function recordDiagnosticEvent(type) {

    if (
        !isCameraDebugEnabled()
    ) {

        return;

    }

    diagnosticEventId +=
        1;

    diagnosticState.events.push({
        id:
            diagnosticEventId,
        time:
            Math.max(
                0,
                Math.round(
                    now() - openedAt
                )
            ),
        type
    });

    if (
        diagnosticState.events.length > 30
    ) {

        diagnosticState.events.shift();

    }

}

function formatTracks() {

    if (
        diagnosticState.tracks.length === 0
    ) {

        return '0';

    }

    return diagnosticState.tracks.map(
        track => `${track.readyState ?? 'unknown'} muted=${track.muted ?? 'unknown'}`
    ).join(
        ', '
    );

}

function normalizeAdapterName(adapter) {

    if (
        adapter === 'NativeBarcodeAdapter'
    ) {

        return 'native';

    }

    if (
        adapter === 'ZxingBarcodeAdapter'
    ) {

        return 'zxing';

    }

    return adapter ?? 'none';

}

function buildDiagnosticText() {

    updateDiagnosticSnapshot();

    return [
        'Camera diagnostic',
        `sessionId=${diagnosticState.sessionId}`,
        `state=${status.value}`,
        `adapter=${diagnosticState.adapter}`,
        `getUserMedia=${diagnosticState.getUserMediaCalls}`,
        `stream=${diagnosticState.streamPresent}/${diagnosticState.streamActive}`,
        `tracks=${formatTracks()}`,
        `srcObject=${diagnosticState.video.srcObjectPresent} stable=${diagnosticState.streamStable}`,
        `video=${diagnosticState.video.readyState} ${diagnosticState.video.width}x${diagnosticState.video.height} paused=${diagnosticState.video.paused}`,
        `play=${diagnosticState.playCalls} stop=${diagnosticState.stopCalls} srcSet=${diagnosticState.srcObjectAssignments} srcNull=${diagnosticState.srcObjectClears}`,
        `component=${diagnosticState.component}`,
        `closeReason=${diagnosticState.closeReason}`,
        `error=${diagnosticState.error}`,
        `detection=attempts:${diagnosticState.detectionAttempts} notFound:${diagnosticState.detectionNotFound} checksum:${diagnosticState.detectionChecksum} format:${diagnosticState.detectionFormat} fatal:${diagnosticState.detectionFatal}`,
        `visibility=${diagnosticState.documentVisibility}`,
        'events=',
        ...diagnosticState.events.map(
            entry => `${entry.time}ms ${entry.type}`
        )
    ].join(
        '\n'
    );

}

async function copyDiagnostic() {

    const text =
        buildDiagnosticText();

    await navigator.clipboard?.writeText?.(
        text
    );

    recordDiagnosticEvent(
        'diagnostic copied'
    );

}

function nextScannerRunId() {

    scannerRunId +=
        1;

    return scannerRunId;

}

function isCurrentScannerRun(runId) {

    return scannerRunId === runId;

}

function trapFocus(event) {

    const focusableElements =
        modalElement.value?.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) ?? [];

    if (
        focusableElements.length === 0
    ) {

        event.preventDefault();

        return;

    }

    const firstElement =
        focusableElements[0];

    const lastElement =
        focusableElements[focusableElements.length - 1];

    if (
        event.shiftKey &&
        document.activeElement === firstElement
    ) {

        event.preventDefault();
        lastElement.focus();

    } else if (
        !event.shiftKey &&
        document.activeElement === lastElement
    ) {

        event.preventDefault();
        firstElement.focus();

    }

}

function restoreFocus() {

    props.triggerElement?.focus?.({
        preventScroll:
            true
    });

    window.setTimeout(
        () => props.triggerElement?.focus?.({
            preventScroll:
                true
        }),
        0
    );

}
</script>

<style scoped>
.camera-scanner-backdrop {
    align-items: center;
    background: rgba(8, 13, 24, 0.78);
    display: flex;
    inset: 0;
    justify-content: center;
    padding: 16px;
    position: fixed;
    z-index: 1000;
}

.camera-scanner-modal {
    background: #111827;
    border: 1px solid #39445a;
    border-radius: 8px;
    color: #ffffff;
    display: grid;
    gap: 12px;
    max-width: 520px;
    padding: 14px;
    width: min(100%, 520px);
}

.camera-scanner-header {
    align-items: center;
    display: flex;
    gap: 12px;
    justify-content: space-between;
}

.camera-scanner-header h2 {
    font-size: 1rem;
    margin: 0;
}

.camera-scanner-close {
    align-items: center;
    background: #ffffff;
    border: 0;
    border-radius: 6px;
    color: #111827;
    cursor: pointer;
    display: inline-flex;
    font: inherit;
    font-size: 1.1rem;
    height: 40px;
    justify-content: center;
    width: 40px;
}

.camera-scanner-preview {
    aspect-ratio: 4 / 3;
    background: #000000;
    border-radius: 6px;
    overflow: hidden;
    position: relative;
}

.camera-scanner-preview video {
    display: block;
    height: 100%;
    inset: 0;
    object-fit: cover;
    opacity: 1;
    position: absolute;
    width: 100%;
    z-index: 0;
}

.camera-scanner-frame {
    border: 2px solid #ffffff;
    border-radius: 6px;
    box-shadow: 0 0 0 999px rgba(0, 0, 0, 0.28);
    height: 34%;
    left: 50%;
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 78%;
    z-index: 1;
}

.camera-debug-panel {
    background: rgba(17, 24, 39, 0.88);
    border: 1px solid #94a3b8;
    border-radius: 6px;
    color: #ffffff;
    font-size: 0.72rem;
    left: 8px;
    max-height: calc(100% - 16px);
    max-width: min(360px, calc(100% - 16px));
    overflow: auto;
    padding: 8px;
    position: absolute;
    top: 8px;
    z-index: 2;
}

.camera-debug-header {
    align-items: center;
    display: flex;
    gap: 8px;
    justify-content: space-between;
}

.camera-debug-header button {
    background: #ffffff;
    border: 0;
    border-radius: 4px;
    color: #111827;
    cursor: pointer;
    font: inherit;
    padding: 4px 6px;
}

.camera-debug-toggle {
    align-items: center;
    display: flex;
    gap: 6px;
    margin: 6px 0;
}

.camera-debug-grid {
    display: grid;
    gap: 2px 8px;
    grid-template-columns: max-content minmax(0, 1fr);
    margin: 0;
}

.camera-debug-grid dt {
    color: #cbd5e1;
}

.camera-debug-grid dd {
    margin: 0;
    overflow-wrap: anywhere;
}

.camera-debug-events {
    margin: 6px 0 0;
    max-height: 96px;
    overflow: auto;
    padding-left: 18px;
}

.camera-scanner-message {
    color: #d8dee8;
    font-size: 0.9rem;
    margin: 0;
}

.camera-scanner-message.error {
    color: #fecaca;
}

@media (max-width: 639px) {
    .camera-scanner-backdrop {
        align-items: stretch;
        padding: 0;
    }

    .camera-scanner-modal {
        border-radius: 0;
        max-width: none;
        min-height: 100%;
        width: 100%;
    }
}
</style>
