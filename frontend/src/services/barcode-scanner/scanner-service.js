import {
    createNativeBarcodeAdapter
} from './native-barcode-adapter.js';

import {
    createZxingBarcodeAdapter
} from './zxing-barcode-adapter.js';

const defaultPreviewReadyTimeoutMs =
    6000;

const defaultMutedTrackTimeoutMs =
    1200;

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
        mutedTrackTimeoutMs =
            defaultMutedTrackTimeoutMs,
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

        this.mutedTrackTimeoutMs =
            mutedTrackTimeoutMs;

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

        this.trackListenerCleanups =
            new Set();

        this.getUserMediaCalls =
            0;

    }

    async start({
        onDiagnostic = () => {},
        onError,
        onResult,
        onState = () => {},
        previewOnly =
            false,
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

        this.getUserMediaCalls =
            0;

        this.starting =
            true;

        this.onDiagnostic =
            onDiagnostic;

        try {

            this.video =
                video;

            this.assertEnvironment();

            this.debug(
                sessionId,
                'start'
            );

            onState(
                'requesting-permission'
            );

            this.stream =
                await this.createReadableStream({
                    onState,
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

            if (
                previewOnly
            ) {

                this.started =
                    true;

                this.starting =
                    false;

                this.emitDiagnostic(
                    sessionId,
                    'adapter-started',
                    {
                        adapter:
                            'none'
                    }
                );

                return;

            }

            this.adapter =
                await this.selectAdapter();

            this.debug(
                sessionId,
                'adapter-selected',
                {
                    adapter:
                        this.adapter?.constructor?.name ?? 'unknown'
                }
            );

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

            this.emitDiagnostic(
                sessionId,
                'adapter-started',
                {
                    adapter:
                        this.adapter?.constructor?.name ?? 'unknown'
                }
            );

            await this.adapter.start({
                onDiagnostic:
                    event => this.emitDiagnostic(
                        sessionId,
                        event.type,
                        event
                    ),
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
        onState,
        sessionId,
        video
    }) {

        const stream =
            await this.openStream(
                sessionId
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

        this.debug(
            sessionId,
            'stream-selected',
            this.describeStream(
                stream
            )
        );

        this.attachTrackDebugListeners({
            sessionId,
            stream
        });

        onState(
            'preparing-video'
        );

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

    }

    async openStream(sessionId) {

        try {

            return await this.getUserMedia(
                sessionId,
                defaultCameraConstraints[0]
            );

        } catch (error) {

            if (
                !this.shouldFallbackConstraints(
                    error
                )
            ) {

                throw error;

            }

            this.debug(
                sessionId,
                'constraints-fallback',
                {
                    reason:
                        error?.name ?? error?.code ?? 'unknown'
                }
            );

            return this.getUserMedia(
                sessionId,
                defaultCameraConstraints[1]
            );

        }

    }

    async getUserMedia(sessionId, constraints) {

        this.getUserMediaCalls +=
            1;

        this.debug(
            sessionId,
            'getUserMedia',
            {
                call:
                    this.getUserMediaCalls,
                constraints:
                    this.describeConstraints(
                        constraints
                    )
            }
        );

        this.emitDiagnostic(
            sessionId,
            'getUserMedia requested',
            {
                constraints:
                    this.describeConstraints(
                        constraints
                    )
            }
        );

        try {

            const stream =
                await this.mediaDevices.getUserMedia(
                    constraints
                );

            this.emitDiagnostic(
                sessionId,
                'getUserMedia resolved',
                this.describeStream(
                    stream
                )
            );

            return stream;

        } catch (error) {

            this.emitDiagnostic(
                sessionId,
                'getUserMedia rejected',
                {
                    error:
                        error?.name ?? error?.code ?? 'unknown'
                }
            );

            throw error;

        }

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

        this.emitDiagnostic(
            sessionId,
            'stream attached',
            this.describeStream(
                stream
            )
        );

        this.debug(
            sessionId,
            'video-srcObject-set',
            this.describeStream(
                stream
            )
        );

        await this.waitForVideoMetadata({
            sessionId,
            video
        });

        if (
            typeof video.play === 'function'
        ) {

            try {

                this.emitDiagnostic(
                    sessionId,
                    'video play requested'
                );

                await video.play();

                this.emitDiagnostic(
                    sessionId,
                    'video play resolved'
                );

            } catch (error) {

                this.emitDiagnostic(
                    sessionId,
                    'video play rejected',
                    {
                        error:
                            error?.name ?? error?.message ?? 'unknown'
                    }
                );

                throw new ScannerError(
                    'video-play-failed',
                    error
                );

            }

        }

        await this.waitForVideoDimensions({
            stream,
            sessionId,
            video
        });

        this.emitDiagnostic(
            sessionId,
            'first dimensions',
            {
                videoHeight:
                    video.videoHeight,
                videoWidth:
                    video.videoWidth
            }
        );

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
        stream,
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
            retryWhenTimedOut:
                () => this.waitForMutedTrack({
                    sessionId,
                    stream
                }),
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
        retryWhenTimedOut,
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

                const waitForVideoEventAgain =
                    () => {

                        this.waitForVideoEvent({
                            events,
                            predicate,
                            retryWhenTimedOut:
                                null,
                            sessionId,
                            timeoutCode,
                            timeoutMs:
                                this.mutedTrackTimeoutMs,
                            video
                        })
                            .then(
                                resolve,
                                reject
                            );

                    };

                const timeoutId =
                    this.windowObject.setTimeout(
                        async () => {

                            if (
                                settled
                            ) {

                                return;

                            }

                            settled =
                                true;

                            cleanup();

                            const retryResult =
                                retryWhenTimedOut ?
                                    await retryWhenTimedOut() :
                                    false;

                            if (
                                retryResult === true
                            ) {

                                waitForVideoEventAgain();

                                return;

                            }

                            if (
                                retryResult === 'muted'
                            ) {

                                reject(
                                    new ScannerError(
                                        'camera-track-muted'
                                    )
                                );

                                return;

                            }

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

    shouldFallbackConstraints(error) {

        return [
            'ConstraintNotSatisfiedError',
            'DevicesNotFoundError',
            'NotFoundError',
            'OverconstrainedError'
        ].includes(
            error?.name
        );

    }

    waitForMutedTrack({
        sessionId,
        stream
    }) {

        const mutedTrack =
            this.getVideoTracks(
                stream
            )
                .find(
                    track => track.muted === true
                );

        if (
            !mutedTrack
        ) {

            return Promise.resolve(
                false
            );

        }

        this.debug(
            sessionId,
            'track-muted-wait',
            this.describeTrack(
                mutedTrack
            )
        );

        return new Promise(
            resolve => {

                let settled =
                    false;

                const cleanup =
                    () => {

                        mutedTrack.removeEventListener?.(
                            'unmute',
                            handleUnmute
                        );

                        this.windowObject.clearTimeout(
                            timeoutId
                        );

                    };

                const handleUnmute =
                    () => {

                        if (
                            settled
                        ) {

                            return;

                        }

                        settled =
                            true;

                        cleanup();
                        resolve(
                            this.isCurrentSession(
                                sessionId
                            )
                        );

                    };

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
                            resolve(
                                'muted'
                            );

                        },
                        this.mutedTrackTimeoutMs
                    );

                mutedTrack.addEventListener?.(
                    'unmute',
                    handleUnmute,
                    {
                        once:
                            true
                    }
                );

            }
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

        this.trackListenerCleanups.forEach(
            cleanup => cleanup()
        );

        this.trackListenerCleanups.clear();

        this.debug(
            this.sessionId,
            'stop'
        );

        this.adapter?.stop();

        this.stopStream(
            this.stream
        );

        if (
            this.video
        ) {

            this.video.pause?.();

            this.debug(
                this.sessionId,
                'video-srcObject-null'
            );

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
            this.getTracks(
                stream
            );

        tracks?.forEach(
            track => {

                this.debug(
                    this.sessionId,
                    'track-stop',
                    this.describeTrack(
                        track
                    )
                );

                track.stop();

            }
        );

    }

    getTracks(stream) {

        return typeof stream?.getTracks === 'function' ?
            stream.getTracks() :
            stream?.getVideoTracks?.() ?? [];

    }

    getVideoTracks(stream) {

        return typeof stream?.getVideoTracks === 'function' ?
            stream.getVideoTracks() :
            this.getTracks(
                stream
            )
                .filter(
                    track => !track.kind || track.kind === 'video'
                );

    }

    attachTrackDebugListeners({
        sessionId,
        stream
    }) {

        this.getVideoTracks(
            stream
        )
            .forEach(
                track => {

                    const listeners =
                        [
                            'mute',
                            'unmute',
                            'ended'
                        ].map(
                            eventName => {

                                const listener =
                                    () => this.debug(
                                        sessionId,
                                        `track-${eventName}`,
                                        this.describeTrack(
                                            track
                                        )
                                    );

                                const diagnosticListener =
                                    () => this.emitDiagnostic(
                                        sessionId,
                                        `track ${eventName}`,
                                        this.describeTrack(
                                            track
                                        )
                                    );

                                track.addEventListener?.(
                                    eventName,
                                    listener
                                );

                                track.addEventListener?.(
                                    eventName,
                                    diagnosticListener
                                );

                                return () => {

                                    track.removeEventListener?.(
                                        eventName,
                                        listener
                                    );

                                    track.removeEventListener?.(
                                        eventName,
                                        diagnosticListener
                                    );

                                };

                            }
                        );

                    this.trackListenerCleanups.add(
                        () => listeners.forEach(
                            cleanup => cleanup()
                        )
                    );

                }
            );

    }

    describeConstraints(constraints) {

        return {
            audio:
                constraints.audio,
            video:
                constraints.video === true ?
                    true :
                    {
                        facingMode:
                            constraints.video?.facingMode
                    }
        };

    }

    describeStream(stream) {

        return {
            active:
                stream?.active,
            streamId:
                stream?.id,
            tracks:
                this.getVideoTracks(
                    stream
                )
                    .map(
                        track => this.describeTrack(
                            track
                        )
                    )
        };

    }

    describeTrack(track) {

        return {
            muted:
                track?.muted,
            readyState:
                track?.readyState,
            trackId:
                track?.id
        };

    }

    debug(sessionId, event, details = {}) {

        if (
            import.meta.env?.DEV !== true ||
            typeof this.windowObject?.console?.debug !== 'function'
        ) {

            return;

        }

        this.windowObject.console.debug(
            '[CameraScanner]',
            {
                event,
                getUserMediaCalls:
                    this.getUserMediaCalls,
                sessionId,
                timestamp:
                    this.windowObject?.performance?.now?.() ?? Date.now(),
                ...details
            }
        );

    }

    emitDiagnostic(sessionId, type, details = {}) {

        this.onDiagnostic?.({
            ...details,
            getUserMediaCalls:
                this.getUserMediaCalls,
            sessionId,
            timestamp:
                this.windowObject?.performance?.now?.() ?? Date.now(),
            type
        });

    }

    getDebugSnapshot() {

        return {
            adapter:
                this.adapter?.constructor?.name ?? 'none',
            getUserMediaCalls:
                this.getUserMediaCalls,
            sessionId:
                this.sessionId,
            stream:
                this.describeStream(
                    this.stream
                )
        };

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
