import {
    createNativeBarcodeAdapter
} from './native-barcode-adapter.js';

import {
    createZxingBarcodeAdapter
} from './zxing-barcode-adapter.js';

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
                await this.mediaDevices.getUserMedia({
                    audio:
                        false,
                    video: {
                        facingMode: {
                            ideal:
                                'environment'
                        }
                    }
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

            await this.attachStream(
                video
            );

            if (
                !this.isCurrentSession(
                    sessionId
                )
            ) {

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

    async attachStream(video) {

        video.srcObject =
            this.stream;

        video.setAttribute(
            'playsinline',
            ''
        );

        video.muted =
            true;

        if (
            typeof video.play === 'function'
        ) {

            await video.play();

        }

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

        stream?.getTracks()
            ?.forEach(
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
