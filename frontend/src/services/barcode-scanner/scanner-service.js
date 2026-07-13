import {
    createNativeBarcodeAdapter
} from './native-barcode-adapter.js';

import {
    createZxingBarcodeAdapter
} from './zxing-barcode-adapter.js';

const defaultPreviewReadyTimeoutMs =
    2500;

const defaultCameraConstraints =
    [
        {
            audio:
                false,
            video: {
                facingMode: {
                    ideal:
                        'environment'
                }
            }
        },
        {
            audio:
                false,
            video:
                true
        }
    ];

export class ScannerError extends Error {

    constructor(code, cause) {

        super(
            code
        );

        this.name =
            'ScannerError';

        this.code =
            code;

        this.cause =
            cause;

    }

}

export class ScannerService {

    constructor({
        createNativeAdapter =
            createNativeBarcodeAdapter,
        createZxingAdapter =
            createZxingBarcodeAdapter,
        mediaDevices =
            globalThis.navigator?.mediaDevices,
        previewReadyTimeoutMs =
            defaultPreviewReadyTimeoutMs,
        secureContext =
            globalThis.isSecureContext,
        windowObject =
            globalThis.window
    } = {}) {

        this.createNativeAdapter =
            createNativeAdapter;

        this.createZxingAdapter =
            createZxingAdapter;

        this.mediaDevices =
            mediaDevices;

        this.previewReadyTimeoutMs =
            previewReadyTimeoutMs;

        this.secureContext =
            secureContext;

        this.windowObject =
            windowObject;

        this.adapter =
            null;

        this.stream =
            null;

        this.video =
            null;

        this.started =
            false;

        this.starting =
            false;

        this.stopping =
            false;

        this.sessionId =
            0;

        this.pendingWaits =
            new Set();

    }

    async start({
        onError,
        onResult,
        video
    }) {

        if (
            this.started ||
            this.starting
        ) {

            return;

        }

        const sessionId =
            this.sessionId + 1;

        this.sessionId =
            sessionId;

        this.starting =
            true;

        try {

            this.video =
                video;

            this.assertEnvironment();

            this.stream =
                await this.createReadableStream({
                    sessionId,
                    video
                });

            if (
                !this.isCurrentSession(
                    sessionId
                )
            ) {

                this.stopStream(
                    this.stream
                );

                this.stream =
                    null;

                return;

            }

            this.adapter =
                await this.selectAdapter();

            if (
                !this.isCurrentSession(
                    sessionId
                )
            ) {

                this.adapter?.stop();
                this.adapter =
                    null;

                return;

            }

            this.started =
                true;

            this.starting =
                false;

            await this.adapter.start({
                onError:
                    error => {

                        if (
                            this.isCurrentSession(
                                sessionId
                            )
                        ) {

                            this.fail(
                                error,
                                onError
                            );

                        }

                    },
                onResult:
                    result => {

                        if (
                            !this.isCurrentSession(
                                sessionId
                            )
                        ) {

                            return;

                        }

                        this.stop();

                        onResult(
                            result
                        );

                    },
                stream:
                    this.stream,
                video
            });

        } catch (error) {

            this.stop();

            throw this.normalizeError(
                error
            );

        } finally {

            if (
                this.isCurrentSession(
                    sessionId
                )
            ) {

                this.starting =
                    false;

            }

        }

    }

    async selectAdapter() {

        const nativeAdapter =
            this.createNativeAdapter();

        if (
            await nativeAdapter.isSupported()
        ) {

            return nativeAdapter;

        }

        const zxingAdapter =
            this.createZxingAdapter();

        if (
            await zxingAdapter.isSupported()
        ) {

            return zxingAdapter;

        }

        throw new ScannerError(
            zxingAdapter.lastLoadError ?
                'fallback-unavailable' :
                'unsupported',
            zxingAdapter.lastLoadError
        );

    }

    assertEnvironment() {

        if (
            this.secureContext === false
        ) {

            throw new ScannerError(
                'insecure-context'
            );

        }

        if (
            !this.mediaDevices ||
            typeof this.mediaDevices.getUserMedia !== 'function'
        ) {

            throw new ScannerError(
                'unsupported'
            );

        }

    }

    async createReadableStream({
        sessionId,
        video
    }) {

        let lastError =
            null;

        for (
            const constraints of defaultCameraConstraints
        ) {

            let stream =
                null;

            try {

                stream =
                    await this.mediaDevices.getUserMedia(
                        constraints
                    );

                if (
                    !this.isCurrentSession(
                        sessionId
                    )
                ) {

                    this.stopStream(
                        stream
                    );

                    return null;

                }

                this.assertUsableStream(
                    stream
                );

                this.stream =
                    stream;

                await this.attachStream({
                    sessionId,
                    stream,
                    video
                });

                if (
                    !this.isCurrentSession(
                        sessionId
                    )
                ) {

                    this.stopStream(
                        stream
                    );

                    return null;

                }

                return stream;

            } catch (error) {

                lastError =
                    error;

                this.stopStream(
                    stream
                );

                if (
                    this.stream === stream
                ) {

                    this.stream =
                        null;

                }

                if (
                    video?.srcObject === stream
                ) {

                    video.pause?.();
                    video.srcObject =
                        null;

                }

                if (
                    error instanceof ScannerError &&
                    error.code === 'video-play-failed'
                ) {

                    throw error;

                }

            }

        }

        throw lastError ?? new ScannerError(
            'video-preview-unavailable'
        );

    }

    async attachStream({
        sessionId,
        stream,
        video
    }) {

        if (
            !video
        ) {

            throw new ScannerError(
                'video-preview-unavailable'
            );

        }

        video.autoplay =
            true;

        video.muted =
            true;

        video.playsInline =
            true;

        video.setAttribute(
            'autoplay',
            ''
        );

        video.setAttribute(
            'muted',
            ''
        );

        video.setAttribute(
            'playsinline',
            ''
        );

        video.setAttribute(
            'webkit-playsinline',
            ''
        );

        video.srcObject =
            stream;

        await this.waitForVideoMetadata({
            sessionId,
            video
        });

        if (
            typeof video.play === 'function'
        ) {

            try {

                await video.play();

            } catch (error) {

                throw new ScannerError(
                    'video-play-failed',
                    error
                );

            }

        }

        await this.waitForVideoDimensions({
            sessionId,
            video
        });

    }

    assertUsableStream(stream) {

        if (
            !stream ||
            stream.active === false
        ) {

            throw new ScannerError(
                'camera-unavailable'
            );

        }

        const videoTracks =
            typeof stream.getVideoTracks === 'function' ?
                stream.getVideoTracks() :
                stream.getTracks?.()
                    ?.filter(
                        track => !track.kind || track.kind === 'video'
                    );

        if (
            !videoTracks?.length ||
            videoTracks.some(
                track => track.readyState &&
                    track.readyState !== 'live'
            )
        ) {

            throw new ScannerError(
                'camera-unavailable'
            );

        }

    }

    waitForVideoMetadata({
        sessionId,
        video
    }) {

        if (
            video.readyState >= HTMLMediaElement.HAVE_METADATA
        ) {

            return Promise.resolve();

        }

        return this.waitForVideoEvent({
            events: [
                'loadedmetadata',
                'canplay'
            ],
            predicate: () => video.readyState >= HTMLMediaElement.HAVE_METADATA,
            sessionId,
            timeoutMs:
                this.previewReadyTimeoutMs,
            video
        });

    }

    waitForVideoDimensions({
        sessionId,
        video
    }) {

        return this.waitForVideoEvent({
            events: [
                'loadedmetadata',
                'canplay',
                'playing',
                'resize'
            ],
            predicate: () => video.videoWidth > 0 &&
                video.videoHeight > 0,
            sessionId,
            timeoutCode:
                'video-preview-unavailable',
            timeoutMs:
                this.previewReadyTimeoutMs,
            video
        });

    }

    waitForVideoEvent({
        events,
        predicate,
        sessionId,
        timeoutCode =
            'video-preview-unavailable',
        timeoutMs,
        video
    }) {

        if (
            predicate()
        ) {

            return Promise.resolve();

        }

        return new Promise(
            (resolve, reject) => {

                let settled =
                    false;

                const cleanup =
                    () => {

                        this.pendingWaits.delete(
                            cancel
                        );

                        this.windowObject.clearTimeout(
                            timeoutId
                        );

                        events.forEach(
                            eventName => video.removeEventListener(
                                eventName,
                                handleEvent
                            )
                        );

                    };

                const cancel =
                    () => {

                        if (
                            settled
                        ) {

                            return;

                        }

                        settled =
                            true;

                        cleanup();
                        resolve();

                    };

                const finish =
                    () => {

                        if (
                            settled
                        ) {

                            return;

                        }

                        if (
                            !this.isCurrentSession(
                                sessionId
                            )
                        ) {

                            settled =
                                true;

                            cleanup();
                            resolve();

                            return;

                        }

                        if (
                            predicate()
                        ) {

                            settled =
                                true;

                            cleanup();
                            resolve();

                        }

                    };

                const handleEvent =
                    () => finish();

                const timeoutId =
                    this.windowObject.setTimeout(
                        () => {

                            if (
                                settled
                            ) {

                                return;

                            }

                            settled =
                                true;

                            cleanup();

                            if (
                                this.isCurrentSession(
                                    sessionId
                                )
                            ) {

                                reject(
                                    new ScannerError(
                                        timeoutCode
                                    )
                                );

                                return;

                            }

                            resolve();

                        },
                        timeoutMs
                    );

                events.forEach(
                    eventName => video.addEventListener(
                        eventName,
                        handleEvent,
                        {
                            once:
                                false
                        }
                    )
                );

                this.pendingWaits.add(
                    cancel
                );

                finish();

            }
        );

    }

    fail(error, onError) {

        this.stop();

        onError(
            this.normalizeError(
                error
            )
        );

    }

    normalizeError(error) {

        if (
            error instanceof ScannerError
        ) {

            return error;

        }

        if (
            error?.name === 'NotAllowedError' ||
            error?.name === 'SecurityError'
        ) {

            return new ScannerError(
                'permission-denied',
                error
            );

        }

        if (
            error?.name === 'NotFoundError' ||
            error?.name === 'DevicesNotFoundError'
        ) {

            return new ScannerError(
                'camera-not-found',
                error
            );

        }

        if (
            error?.name === 'NotReadableError' ||
            error?.name === 'AbortError' ||
            error?.name === 'TrackStartError'
        ) {

            return new ScannerError(
                'camera-unavailable',
                error
            );

        }

        return new ScannerError(
            'read-error',
            error
        );

    }

    stop() {

        if (
            this.stopping
        ) {

            return;

        }

        this.stopping =
            true;

        this.sessionId +=
            1;

        this.pendingWaits.forEach(
            cancel => cancel()
        );

        this.pendingWaits.clear();

        this.adapter?.stop();

        this.stopStream(
            this.stream
        );

        if (
            this.video
        ) {

            this.video.pause?.();
            this.video.srcObject =
                null;

        }

        this.adapter =
            null;

        this.stream =
            null;

        this.started =
            false;

        this.starting =
            false;

        this.stopping =
            false;

    }

    stopStream(stream) {

        const tracks =
            typeof stream?.getTracks === 'function' ?
                stream.getTracks() :
                stream?.getVideoTracks?.();

        tracks?.forEach(
            track => track.stop()
        );

    }

    isCurrentSession(sessionId) {

        return this.sessionId === sessionId;

    }

}

export function createScannerService(options) {

    return new ScannerService(
        options
    );

}
