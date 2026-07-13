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

const closeButton =
    ref(null);

const modalElement =
    ref(null);

const status =
    ref('closed');

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
            onError:
                handleError,
            onResult:
                handleResult,
            onState:
                handleScannerState,
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

    scannerService?.stop();

    scannerService =
        null;

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
