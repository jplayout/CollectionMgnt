const {
    expect,
    test
} = require('@playwright/test');

async function withScannerModules(page, callback, path = '/') {

    await page.goto(
        path
    );

    await page.evaluate(
        () => {

            window.createTestVideo =
                ({
                    height =
                        480,
                    readyState =
                        HTMLMediaElement.HAVE_CURRENT_DATA,
                    width =
                        640
                } = {}) => {

                    const video =
                        document.createElement(
                            'video'
                        );

                    Object.defineProperty(
                        video,
                        'srcObject',
                        {
                            configurable:
                                true,
                            value:
                                null,
                            writable:
                                true
                        }
                    );

                    video.pause =
                        () => {};

                    video.playCalls =
                        0;

                    video.play =
                        async () => {

                            video.playCalls +=
                                1;

                        };

                    Object.defineProperty(
                        video,
                        'readyState',
                        {
                            configurable:
                                true,
                            get: () => readyState
                        }
                    );

                    Object.defineProperty(
                        video,
                        'videoHeight',
                        {
                            configurable:
                                true,
                            get: () => height
                        }
                    );

                    Object.defineProperty(
                        video,
                        'videoWidth',
                        {
                            configurable:
                                true,
                            get: () => width
                        }
                    );

                    return video;

                };

        }
    );

    return page.evaluate(
        callback
    );

}

test.describe(
    'camera scanner foundation',
    () => {

        test(
            'uses BarcodeDetector when required formats are available without loading fallback',
            async ({ page }) => {

                const result =
                    await withScannerModules(
                        page,
                        async () => {

                            const {
                                ScannerService
                            } = await import(
                                '/src/services/barcode-scanner/scanner-service.js'
                            );

                            const stoppedTracks =
                                [];

                            const stream = {
                                getTracks: () => [
                                    {
                                        stop: () => stoppedTracks.push(
                                            'native-track'
                                        )
                                    }
                                ]
                            };

                            const service =
                                new ScannerService({
                                    createNativeAdapter: () => ({
                                        isSupported: async () => true,
                                        start: ({ onResult }) => onResult({
                                            adapter:
                                                'native',
                                            format:
                                                'ean_13',
                                            rawValue:
                                                '9780140328721'
                                        }),
                                        stop: () => {}
                                    }),
                                    createZxingAdapter: () => {

                                        throw new Error(
                                            'fallback-loaded'
                                        );

                                    },
                                    mediaDevices: {
                                        getUserMedia: async () => stream
                                    },
                                    secureContext:
                                        true
                                });

                            const video =
                                window.createTestVideo();

                            let scanned;

                            await service.start({
                                onError: () => {},
                                onResult: value => {

                                    scanned =
                                        value;

                                },
                                video
                            });

                            return {
                                scanned,
                                stoppedTracks
                            };

                        }
                    );

                expect(
                    result.scanned
                ).toEqual({
                    adapter:
                        'native',
                    format:
                        'ean_13',
                    rawValue:
                        '9780140328721'
                });

                expect(
                    result.stoppedTracks
                ).toEqual([
                    'native-track'
                ]);

            }
        );

        test(
            'attaches the stream and explicitly starts iOS-compatible video playback',
            async ({ page }) => {

                const result =
                    await withScannerModules(
                        page,
                        async () => {

                            const {
                                ScannerService
                            } = await import(
                                '/src/services/barcode-scanner/scanner-service.js'
                            );

                            const stream = {
                                active:
                                    true,
                                getVideoTracks: () => [
                                    {
                                        readyState:
                                            'live',
                                        stop: () => {}
                                    }
                                ]
                            };

                            const service =
                                new ScannerService({
                                    createNativeAdapter: () => ({
                                        isSupported: async () => true,
                                        start: () => {},
                                        stop: () => {}
                                    }),
                                    mediaDevices: {
                                        getUserMedia: async () => stream
                                    },
                                    secureContext:
                                        true
                                });

                            const video =
                                window.createTestVideo();

                            await service.start({
                                onError: () => {},
                                onResult: () => {},
                                video
                            });

                            const resultValue = {
                                autoplay:
                                    video.autoplay,
                                muted:
                                    video.muted,
                                playCalls:
                                    video.playCalls,
                                playsInline:
                                    video.playsInline,
                                srcObjectAttached:
                                    video.srcObject === stream,
                                webkitPlaysInline:
                                    video.hasAttribute(
                                        'webkit-playsinline'
                                    )
                            };

                            service.stop();

                            return resultValue;

                        }
                    );

                expect(
                    result
                ).toEqual({
                    autoplay:
                        true,
                    muted:
                        true,
                    playCalls:
                        1,
                    playsInline:
                        true,
                    srcObjectAttached:
                        true,
                    webkitPlaysInline:
                        true
                });

            }
        );

        test(
            'returns a distinct error when video play is rejected',
            async ({ page }) => {

                const code =
                    await withScannerModules(
                        page,
                        async () => {

                            const {
                                ScannerService
                            } = await import(
                                '/src/services/barcode-scanner/scanner-service.js'
                            );

                            const service =
                                new ScannerService({
                                    mediaDevices: {
                                        getUserMedia: async () => ({
                                            active:
                                                true,
                                            getVideoTracks: () => [
                                                {
                                                    readyState:
                                                        'live',
                                                    stop: () => {}
                                                }
                                            ]
                                        })
                                    },
                                    secureContext:
                                        true
                                });

                            const video =
                                window.createTestVideo();

                            video.play =
                                async () => {

                                    throw new Error(
                                        'play-blocked'
                                    );

                                };

                            try {

                                await service.start({
                                    onError: () => {},
                                    onResult: () => {},
                                    video
                                });

                            } catch (error) {

                                return error.code;

                            }

                            return 'none';

                        }
                    );

                expect(
                    code
                ).toBe(
                    'video-play-failed'
                );

            }
        );

        test(
            'does not open a second stream when the ideal stream has no preview frames',
            async ({ page }) => {

                const result =
                    await withScannerModules(
                        page,
                        async () => {

                            const {
                                ScannerService
                            } = await import(
                                '/src/services/barcode-scanner/scanner-service.js'
                            );

                            const calls =
                                [];

                            const stopped =
                                [];

                            const stream = {
                                active:
                                    true,
                                getVideoTracks: () => [
                                    {
                                        readyState:
                                            'live',
                                        stop: () => stopped.push(
                                            'ideal'
                                        )
                                    }
                                ],
                                label:
                                    'ideal'
                            };

                            const service =
                                new ScannerService({
                                    createNativeAdapter: () => ({
                                        isSupported: async () => true,
                                        start: () => {},
                                        stop: () => {}
                                    }),
                                    mediaDevices: {
                                        getUserMedia: async constraints => {

                                            calls.push(
                                                constraints
                                            );

                                            return stream;

                                        }
                                    },
                                    previewReadyTimeoutMs:
                                        1,
                                    secureContext:
                                        true
                                });

                            const video =
                                window.createTestVideo();

                            Object.defineProperty(
                                video,
                                'srcObject',
                                {
                                    configurable:
                                        true,
                                    get() {

                                        return this.currentStream;

                                    },
                                    set(stream) {

                                        this.currentStream =
                                            stream;

                                        Object.defineProperty(
                                            this,
                                            'videoWidth',
                                            {
                                                configurable:
                                                    true,
                                                get: () => stream?.label === 'fallback' ?
                                                    640 :
                                                    0
                                            }
                                        );

                                        Object.defineProperty(
                                            this,
                                            'videoHeight',
                                            {
                                                configurable:
                                                    true,
                                                get: () => stream?.label === 'fallback' ?
                                                    480 :
                                                    0
                                            }
                                        );

                                    }
                                }
                            );

                            let code;

                            try {

                                await service.start({
                                    onError: () => {},
                                    onResult: () => {},
                                    video
                                });

                            } catch (error) {

                                code =
                                    error.code;

                            }

                            const resultValue = {
                                calls,
                                code,
                                srcObject:
                                    video.srcObject?.label,
                                stoppedBeforeStop:
                                    [
                                        ...stopped
                                    ]
                            };

                            service.stop();

                            resultValue.stoppedAfterStop =
                                [
                                    ...stopped
                                ];

                            return resultValue;

                        }
                    );

                expect(
                    result.calls
                ).toEqual([
                    {
                        audio:
                            false,
                        video: {
                            facingMode: {
                                ideal:
                                    'environment'
                            }
                        }
                    }
                ]);

                expect(
                    result.stoppedBeforeStop
                ).toEqual([
                    'ideal'
                ]);

                expect(
                    result.stoppedAfterStop
                ).toEqual([
                    'ideal'
                ]);

                expect(
                    result.code
                ).toBe(
                    'video-preview-unavailable'
                );

            }
        );

        test(
            'falls back to unconstrained video only when the first getUserMedia rejects',
            async ({ page }) => {

                const result =
                    await withScannerModules(
                        page,
                        async () => {

                            const {
                                ScannerService
                            } = await import(
                                '/src/services/barcode-scanner/scanner-service.js'
                            );

                            const calls =
                                [];

                            const stream = {
                                active:
                                    true,
                                getVideoTracks: () => [
                                    {
                                        readyState:
                                            'live',
                                        stop: () => {}
                                    }
                                ],
                                label:
                                    'fallback'
                            };

                            const service =
                                new ScannerService({
                                    createNativeAdapter: () => ({
                                        isSupported: async () => true,
                                        start: () => {},
                                        stop: () => {}
                                    }),
                                    mediaDevices: {
                                        getUserMedia: async constraints => {

                                            calls.push(
                                                constraints
                                            );

                                            if (
                                                calls.length === 1
                                            ) {

                                                const error =
                                                    new Error(
                                                        'overconstrained'
                                                    );

                                                error.name =
                                                    'OverconstrainedError';

                                                throw error;

                                            }

                                            return stream;

                                        }
                                    },
                                    secureContext:
                                        true
                                });

                            const video =
                                window.createTestVideo();

                            await service.start({
                                onError: () => {},
                                onResult: () => {},
                                video
                            });

                            const resultValue = {
                                calls,
                                srcObject:
                                    video.srcObject === stream
                            };

                            service.stop();

                            return resultValue;

                        }
                    );

                expect(
                    result.calls
                ).toEqual([
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
                ]);

                expect(
                    result.srcObject
                ).toBeTruthy();

            }
        );

        test(
            'does not reopen the camera when the active video track stays muted',
            async ({ page }) => {

                const result =
                    await withScannerModules(
                        page,
                        async () => {

                            const {
                                ScannerService
                            } = await import(
                                '/src/services/barcode-scanner/scanner-service.js'
                            );

                            const calls =
                                [];

                            const stopped =
                                [];

                            const track =
                                new EventTarget();

                            track.id =
                                'track-1';

                            track.muted =
                                true;

                            track.readyState =
                                'live';

                            track.stop =
                                () => stopped.push(
                                    'track'
                                );

                            const stream = {
                                active:
                                    true,
                                getVideoTracks: () => [
                                    track
                                ],
                                id:
                                    'stream-1'
                            };

                            const service =
                                new ScannerService({
                                    mediaDevices: {
                                        getUserMedia: async constraints => {

                                            calls.push(
                                                constraints
                                            );

                                            return stream;

                                        }
                                    },
                                    mutedTrackTimeoutMs:
                                        1,
                                    previewReadyTimeoutMs:
                                        1,
                                    secureContext:
                                        true
                                });

                            const video =
                                window.createTestVideo({
                                    height:
                                        0,
                                    width:
                                        0
                                });

                            track.dispatchEvent(
                                new Event(
                                    'mute'
                                )
                            );

                            try {

                                await service.start({
                                    onError: () => {},
                                    onResult: () => {},
                                    video
                                });

                            } catch (error) {

                                return {
                                    calls,
                                    code:
                                        error.code,
                                    stopped
                                };

                            }

                            return {
                                calls,
                                code:
                                    'none',
                                stopped
                            };

                        }
                    );

                expect(
                    result.calls.length
                ).toBe(
                    1
                );

                expect(
                    result.code
                ).toBe(
                    'camera-track-muted'
                );

                expect(
                    result.stopped
                ).toEqual([
                    'track'
                ]);

            }
        );

        test(
            'fails instead of leaving a black preview when the stream never exposes video dimensions',
            async ({ page }) => {

                const result =
                    await withScannerModules(
                        page,
                        async () => {

                            const {
                                ScannerService
                            } = await import(
                                '/src/services/barcode-scanner/scanner-service.js'
                            );

                            const stopped =
                                [];

                            const service =
                                new ScannerService({
                                    mediaDevices: {
                                        getUserMedia: async () => ({
                                            active:
                                                true,
                                            getVideoTracks: () => [
                                                {
                                                    readyState:
                                                        'live',
                                                    stop: () => stopped.push(
                                                        'track'
                                                    )
                                                }
                                            ]
                                        })
                                    },
                                    previewReadyTimeoutMs:
                                        1,
                                    secureContext:
                                        true
                                });

                            const video =
                                window.createTestVideo({
                                    height:
                                        0,
                                    width:
                                        0
                                });

                            try {

                                await service.start({
                                    onError: () => {},
                                    onResult: () => {},
                                    video
                                });

                            } catch (error) {

                                return {
                                    code:
                                        error.code,
                                    srcObjectCleared:
                                        video.srcObject === null,
                                    stopped
                                };

                            }

                            return {
                                code:
                                    'none',
                                srcObjectCleared:
                                    video.srcObject === null,
                                stopped
                            };

                        }
                    );

                expect(
                    result.code
                ).toBe(
                    'video-preview-unavailable'
                );

                expect(
                    result.srcObjectCleared
                ).toBeTruthy();

                expect(
                    result.stopped
                ).toEqual([
                    'track'
                ]);

            }
        );

        test(
            'cleans the pending stream when closed before metadata is available',
            async ({ page }) => {

                const result =
                    await withScannerModules(
                        page,
                        async () => {

                            const {
                                ScannerService
                            } = await import(
                                '/src/services/barcode-scanner/scanner-service.js'
                            );

                            const calls =
                                [];

                            const stopped =
                                [];

                            const service =
                                new ScannerService({
                                    createNativeAdapter: () => ({
                                        isSupported: async () => true,
                                        start: () => calls.push(
                                            'native-start'
                                        ),
                                        stop: () => {}
                                    }),
                                    mediaDevices: {
                                        getUserMedia: async () => ({
                                            active:
                                                true,
                                            getVideoTracks: () => [
                                                {
                                                    readyState:
                                                        'live',
                                                    stop: () => stopped.push(
                                                        'track'
                                                    )
                                                }
                                            ]
                                        })
                                    },
                                    previewReadyTimeoutMs:
                                        1000,
                                    secureContext:
                                        true
                                });

                            const video =
                                window.createTestVideo({
                                    height:
                                        0,
                                    readyState:
                                        0,
                                    width:
                                        0
                                });

                            const startPromise =
                                service.start({
                                    onError: () => {},
                                    onResult: () => {},
                                    video
                                });

                            await new Promise(
                                resolve => window.setTimeout(
                                    resolve,
                                    0
                                )
                            );

                            service.stop();

                            await startPromise;

                            return {
                                calls,
                                srcObjectCleared:
                                    video.srcObject === null,
                                stopped
                            };

                        }
                    );

                expect(
                    result.calls
                ).toEqual([]);

                expect(
                    result.srcObjectCleared
                ).toBeTruthy();

                expect(
                    result.stopped.length
                ).toBeGreaterThanOrEqual(
                    1
                );

            }
        );

        test(
            'loads fallback when BarcodeDetector is absent or lacks MVP formats',
            async ({ page }) => {

                const result =
                    await withScannerModules(
                        page,
                        async () => {

                            const {
                                ScannerService
                            } = await import(
                                '/src/services/barcode-scanner/scanner-service.js'
                            );

                            const starts =
                                [];

                            async function run(nativeSupported) {

                                let fallbackLoaded =
                                    false;

                                const service =
                                    new ScannerService({
                                        createNativeAdapter: () => ({
                                            isSupported: async () => nativeSupported,
                                            stop: () => {}
                                        }),
                                        createZxingAdapter: () => ({
                                            isSupported: async () => {

                                                fallbackLoaded =
                                                    true;

                                                return true;

                                            },
                                            start: ({ onResult }) => {

                                                starts.push(
                                                    'fallback'
                                                );

                                                onResult({
                                                    adapter:
                                                        'zxing',
                                                    format:
                                                        'upc_a',
                                                    rawValue:
                                                        '012345678905'
                                                });

                                            },
                                            stop: () => {}
                                        }),
                                        mediaDevices: {
                                            getUserMedia: async () => ({
                                                getTracks: () => [
                                                    {
                                                        stop: () => {}
                                                    }
                                                ]
                                            })
                                        },
                                        secureContext:
                                            true
                                    });

                                const video =
                                    window.createTestVideo();

                                await service.start({
                                    onError: () => {},
                                    onResult: () => {},
                                    video
                                });

                                return fallbackLoaded;

                            }

                            return {
                                absent:
                                    await run(
                                        false
                                    ),
                                starts,
                                unsupportedFormats:
                                    await run(
                                        false
                                    )
                            };

                        }
                    );

                expect(
                    result.absent
                ).toBeTruthy();

                expect(
                    result.unsupportedFormats
                ).toBeTruthy();

                expect(
                    result.starts
                ).toEqual([
                    'fallback',
                    'fallback'
                ]);

            }
        );

        test(
            'starts ZXing only after the shared video stream is readable',
            async ({ page }) => {

                const result =
                    await withScannerModules(
                        page,
                        async () => {

                            const {
                                ScannerService
                            } = await import(
                                '/src/services/barcode-scanner/scanner-service.js'
                            );

                            let getUserMediaCalls =
                                0;

                            const stream = {
                                active:
                                    true,
                                getVideoTracks: () => [
                                    {
                                        readyState:
                                            'live',
                                        stop: () => {}
                                    }
                                ]
                            };

                            let zxingStartResult;

                            const service =
                                new ScannerService({
                                    createNativeAdapter: () => ({
                                        isSupported: async () => false,
                                        stop: () => {}
                                    }),
                                    createZxingAdapter: () => ({
                                        isSupported: async () => true,
                                        start: ({ video }) => {

                                            zxingStartResult =
                                                {
                                                    readable:
                                                        video.readyState >=
                                                            HTMLMediaElement.HAVE_CURRENT_DATA &&
                                                        video.videoWidth > 0 &&
                                                        video.videoHeight > 0,
                                                    sharedStream:
                                                        video.srcObject === stream
                                                };

                                        },
                                        stop: () => {}
                                    }),
                                    mediaDevices: {
                                        getUserMedia: async () => {

                                            getUserMediaCalls +=
                                                1;

                                            return stream;

                                        }
                                    },
                                    secureContext:
                                        true
                                });

                            await service.start({
                                onError: () => {},
                                onResult: () => {},
                                video:
                                    window.createTestVideo()
                            });

                            return {
                                getUserMediaCalls,
                                zxingStartResult
                            };

                        }
                    );

                expect(
                    result.getUserMediaCalls
                ).toBe(
                    1
                );

                expect(
                    result.zxingStartResult
                ).toEqual({
                    readable:
                        true,
                    sharedStream:
                        true
                });

            }
        );

        test(
            'checks native supported formats and normalizes native success',
            async ({ page }) => {

                const result =
                    await withScannerModules(
                        page,
                        async () => {

                            const {
                                NativeBarcodeAdapter
                            } = await import(
                                '/src/services/barcode-scanner/native-barcode-adapter.js'
                            );

                            let requestedFormats;

                            class BarcodeDetectorMock {

                                static async getSupportedFormats() {

                                    return [
                                        'ean_13',
                                        'upc_a'
                                    ];

                                }

                                constructor(options) {

                                    requestedFormats =
                                        options.formats;

                                }

                                async detect() {

                                    return [
                                        {
                                            format:
                                                'ean_13',
                                            rawValue:
                                                '9780140328721'
                                        }
                                    ];

                                }

                            }

                            const adapter =
                                new NativeBarcodeAdapter({
                                    barcodeDetectorClass:
                                        BarcodeDetectorMock,
                                    scanIntervalMs:
                                        1
                                });

                            const supported =
                                await adapter.isSupported();

                            const video =
                                document.createElement(
                                    'video'
                                );

                            Object.defineProperty(
                                video,
                                'readyState',
                                {
                                    value:
                                        HTMLMediaElement.HAVE_CURRENT_DATA
                                }
                            );

                            const scanned =
                                await new Promise(
                                    resolve => adapter.start({
                                        onError: reject => resolve({
                                            error:
                                                reject.message
                                        }),
                                        onResult: resolve,
                                        video
                                    })
                                );

                            adapter.stop();

                            return {
                                requestedFormats,
                                scanned,
                                supported
                            };

                        }
                    );

                expect(
                    result.supported
                ).toBeTruthy();

                expect(
                    result.requestedFormats
                ).toEqual([
                    'ean_13',
                    'upc_a'
                ]);

                expect(
                    result.scanned
                ).toEqual({
                    adapter:
                        'native',
                    format:
                        'ean_13',
                    rawValue:
                        '9780140328721'
                });

            }
        );

        test(
            'rejects BarcodeDetector presence when required formats are unsupported',
            async ({ page }) => {

                const supported =
                    await withScannerModules(
                        page,
                        async () => {

                            const {
                                NativeBarcodeAdapter
                            } = await import(
                                '/src/services/barcode-scanner/native-barcode-adapter.js'
                            );

                            class BarcodeDetectorMock {

                                static async getSupportedFormats() {

                                    return [
                                        'qr_code'
                                    ];

                                }

                            }

                            return new NativeBarcodeAdapter({
                                barcodeDetectorClass:
                                    BarcodeDetectorMock
                            }).isSupported();

                        }
                    );

                expect(
                    supported
                ).toBeFalsy();

            }
        );

        test(
            'falls back when BarcodeDetector formats or constructor are not usable',
            async ({ page }) => {

                const result =
                    await withScannerModules(
                        page,
                        async () => {

                            const {
                                NativeBarcodeAdapter
                            } = await import(
                                '/src/services/barcode-scanner/native-barcode-adapter.js'
                            );

                            async function supportedFor(detectorClass) {

                                return new NativeBarcodeAdapter({
                                    barcodeDetectorClass:
                                        detectorClass
                                }).isSupported();

                            }

                            class RejectingFormats {

                                static async getSupportedFormats() {

                                    throw new Error(
                                        'formats-failed'
                                    );

                                }

                            }

                            class EmptyFormats {

                                static async getSupportedFormats() {

                                    return [];

                                }

                            }

                            class OneFormatOnly {

                                static async getSupportedFormats() {

                                    return [
                                        'ean_13'
                                    ];

                                }

                            }

                            class ConstructorFailure {

                                static async getSupportedFormats() {

                                    return [
                                        'ean_13',
                                        'upc_a'
                                    ];

                                }

                                constructor() {

                                    throw new Error(
                                        'constructor-failed'
                                    );

                                }

                            }

                            return {
                                constructorFailure:
                                    await supportedFor(
                                        ConstructorFailure
                                    ),
                                empty:
                                    await supportedFor(
                                        EmptyFormats
                                    ),
                                oneFormat:
                                    await supportedFor(
                                        OneFormatOnly
                                    ),
                                rejecting:
                                    await supportedFor(
                                        RejectingFormats
                                    )
                            };

                        }
                    );

                expect(
                    result
                ).toEqual({
                    constructorFailure:
                        false,
                    empty:
                        false,
                    oneFormat:
                        false,
                    rejecting:
                        false
                });

            }
        );

        test(
            'decodes fallback success and releases ZXing resources',
            async ({ page }) => {

                const result =
                    await withScannerModules(
                        page,
                        async () => {

                            const {
                                ZxingBarcodeAdapter
                            } = await import(
                                '/src/services/barcode-scanner/zxing-barcode-adapter.js'
                            );

                            const calls =
                                [];

                            class ReaderMock {

                                set possibleFormats(formats) {

                                    calls.push(
                                        [
                                            'formats',
                                            formats
                                        ]
                                    );

                                }

                                decode() {

                                    return {
                                        getBarcodeFormat: () => 14,
                                        getText: () => '012345678905'
                                    };

                                }

                                reset() {

                                    calls.push(
                                        [
                                            'reset'
                                        ]
                                    );

                                }

                            }

                            const adapter =
                                new ZxingBarcodeAdapter({
                                    moduleLoader: async () => ({
                                        BarcodeFormat: {
                                            14:
                                                'UPC_A',
                                            EAN_13:
                                                7,
                                            UPC_A:
                                                14
                                        },
                                        BrowserCodeReader: {
                                            releaseAllStreams: () => calls.push(
                                                [
                                                    'release'
                                                ]
                                            )
                                        },
                                        BrowserMultiFormatOneDReader:
                                            ReaderMock
                                    }),
                                    scanIntervalMs:
                                        1
                                });

                            const video =
                                document.createElement(
                                    'video'
                                );

                            Object.defineProperty(
                                video,
                                'readyState',
                                {
                                    value:
                                        HTMLMediaElement.HAVE_CURRENT_DATA
                                }
                            );

                            const scanned =
                                await new Promise(
                                    resolve => adapter.start({
                                        onError: error => resolve({
                                            error:
                                                error.message
                                        }),
                                        onResult: resolve,
                                        video
                                    })
                                );

                            adapter.stop();

                            return {
                                calls,
                                scanned
                            };

                        }
                    );

                expect(
                    result.scanned
                ).toEqual({
                    adapter:
                        'zxing',
                    format:
                        'upc_a',
                    rawValue:
                        '012345678905'
                });

                expect(
                    result.calls
                ).toContainEqual([
                    'formats',
                    [
                        7,
                        14
                    ]
                ]);

                expect(
                    result.calls
                ).toContainEqual([
                    'reset'
                ]);

                expect(
                    result.calls
                ).toContainEqual([
                    'release'
                ]);

            }
        );

        test(
            'normalizes permission and camera errors',
            async ({ page }) => {

                const result =
                    await withScannerModules(
                        page,
                        async () => {

                            const {
                                ScannerService
                            } = await import(
                                '/src/services/barcode-scanner/scanner-service.js'
                            );

                            async function getCode(errorName) {

                                const service =
                                    new ScannerService({
                                        mediaDevices: {
                                            getUserMedia: async () => {

                                                const error =
                                                    new Error(
                                                        errorName
                                                    );

                                                error.name =
                                                    errorName;

                                                throw error;

                                            }
                                        },
                                        secureContext:
                                            true
                                    });

                                try {

                                    await service.start({
                                        onError: () => {},
                                        onResult: () => {},
                                        video:
                                            window.createTestVideo()
                                    });

                                } catch (error) {

                                    return error.code;

                                }

                                return 'none';

                            }

                            return {
                                cameraAbsent:
                                    await getCode(
                                        'NotFoundError'
                                    ),
                                permission:
                                    await getCode(
                                        'NotAllowedError'
                                    )
                            };

                        }
                    );

                expect(
                    result.permission
                ).toBe(
                    'permission-denied'
                );

                expect(
                    result.cameraAbsent
                ).toBe(
                    'camera-not-found'
                );

            }
        );

        test(
            'stops tracks on close and tolerates repeated stop calls',
            async ({ page }) => {

                const result =
                    await withScannerModules(
                        page,
                        async () => {

                            const {
                                ScannerService
                            } = await import(
                                '/src/services/barcode-scanner/scanner-service.js'
                            );

                            const stoppedTracks =
                                [];

                            const service =
                                new ScannerService({
                                    createNativeAdapter: () => ({
                                        isSupported: async () => true,
                                        start: () => {},
                                        stop: () => {}
                                    }),
                                    mediaDevices: {
                                        getUserMedia: async () => ({
                                            getTracks: () => [
                                                {
                                                    stop: () => {

                                                        stoppedTracks.push(
                                                            'first'
                                                        );

                                                    }
                                                },
                                                {
                                                    stop: () => {

                                                        stoppedTracks.push(
                                                            'second'
                                                        );

                                                    }
                                                }
                                            ]
                                        })
                                    },
                                    secureContext:
                                        true
                                });

                            const video =
                                window.createTestVideo();

                            await service.start({
                                onError: () => {},
                                onResult: () => {},
                                video
                            });

                            service.stop();
                            service.stop();

                            return {
                                srcObjectCleared:
                                    video.srcObject === null,
                                stoppedTracks
                            };

                        }
                    );

                expect(
                    result.stoppedTracks
                ).toEqual([
                    'first',
                    'second'
                ]);

                expect(
                    result.srcObjectCleared
                ).toBeTruthy();

            }
        );

        test(
            'ignores late permission and callbacks after stop',
            async ({ page }) => {

                const result =
                    await withScannerModules(
                        page,
                        async () => {

                            const {
                                ScannerService
                            } = await import(
                                '/src/services/barcode-scanner/scanner-service.js'
                            );

                            let resolveStream;

                            const stoppedTracks =
                                [];

                            const streamPromise =
                                new Promise(
                                    resolve => {

                                        resolveStream =
                                            resolve;

                                    }
                                );

                            const service =
                                new ScannerService({
                                    createNativeAdapter: () => ({
                                        isSupported: async () => true,
                                        start: ({ onResult }) => {

                                            window.lateResult =
                                                onResult;

                                        },
                                        stop: () => {}
                                    }),
                                    mediaDevices: {
                                        getUserMedia: () => streamPromise
                                    },
                                    secureContext:
                                        true
                                });

                            const scanned =
                                [];

                            const startPromise =
                                service.start({
                                    onError: () => {},
                                    onResult: value => scanned.push(
                                        value
                                    ),
                                    video:
                                        window.createTestVideo()
                                });

                            service.stop();

                            resolveStream({
                                getTracks: () => [
                                    {
                                        stop: () => stoppedTracks.push(
                                            'late-first'
                                        )
                                    },
                                    {
                                        stop: () => stoppedTracks.push(
                                            'late-second'
                                        )
                                    }
                                ]
                            });

                            await startPromise;

                            window.lateResult?.({
                                adapter:
                                    'native',
                                format:
                                    'ean_13',
                                rawValue:
                                    '9780140328721'
                            });

                            return {
                                scanned,
                                stoppedTracks
                            };

                        }
                    );

                expect(
                    result.scanned
                ).toEqual([]);

                expect(
                    result.stoppedTracks
                ).toEqual([
                    'late-first',
                    'late-second'
                ]);

            }
        );

        test(
            'prevents concurrent starts and supports reopen after close',
            async ({ page }) => {

                const result =
                    await withScannerModules(
                        page,
                        async () => {

                            const {
                                ScannerService
                            } = await import(
                                '/src/services/barcode-scanner/scanner-service.js'
                            );

                            let getUserMediaCalls =
                                0;

                            const service =
                                new ScannerService({
                                    createNativeAdapter: () => ({
                                        isSupported: async () => true,
                                        start: () => {},
                                        stop: () => {}
                                    }),
                                    mediaDevices: {
                                        getUserMedia: async () => {

                                            getUserMediaCalls += 1;

                                            return {
                                                getTracks: () => [
                                                    {
                                                        stop: () => {}
                                                    }
                                                ]
                                            };

                                        }
                                    },
                                    secureContext:
                                        true
                                });

                            await Promise.all([
                                service.start({
                                    onError: () => {},
                                    onResult: () => {},
                                    video:
                                        window.createTestVideo()
                                }),
                                service.start({
                                    onError: () => {},
                                    onResult: () => {},
                                    video:
                                        window.createTestVideo()
                                })
                            ]);

                            const callsAfterConcurrentStart =
                                getUserMediaCalls;

                            service.stop();

                            await service.start({
                                onError: () => {},
                                onResult: () => {},
                                video:
                                    window.createTestVideo()
                            });

                            service.stop();

                            return {
                                callsAfterConcurrentStart,
                                getUserMediaCalls
                            };

                        }
                    );

                expect(
                    result.callsAfterConcurrentStart
                ).toBe(
                    1
                );

                expect(
                    result.getUserMediaCalls
                ).toBe(
                    2
                );

            }
        );

        test(
            'retries ZXing decode exceptions without surfacing errors',
            async ({ page }) => {

                const result =
                    await withScannerModules(
                        page,
                        async () => {

                            const {
                                ZxingBarcodeAdapter
                            } = await import(
                                '/src/services/barcode-scanner/zxing-barcode-adapter.js'
                            );

                            class NotFoundException extends Error {}
                            class FormatException extends Error {}

                            const checksumError =
                                new Error(
                                    'checksum'
                                );

                            checksumError.name =
                                'ChecksumException';

                            const diagnostics =
                                [];

                            const errors =
                                [];

                            let decodeCalls =
                                0;

                            class ReaderMock {

                                set possibleFormats(_) {}

                                decode() {

                                    decodeCalls +=
                                        1;

                                    if (
                                        decodeCalls === 1
                                    ) {

                                        throw new NotFoundException(
                                            'missing'
                                        );

                                    }

                                    if (
                                        decodeCalls === 2
                                    ) {

                                        throw checksumError;

                                    }

                                    if (
                                        decodeCalls === 3
                                    ) {

                                        throw new FormatException(
                                            'format'
                                        );

                                    }

                                    return {
                                        getBarcodeFormat: () => 7,
                                        getText: () => '9780140328721'
                                    };

                                }

                                reset() {}

                            }

                            const adapter =
                                new ZxingBarcodeAdapter({
                                    moduleLoader: async () => ({
                                        BarcodeFormat: {
                                            7:
                                                'EAN_13',
                                            EAN_13:
                                                7,
                                            UPC_A:
                                                14
                                        },
                                        BrowserCodeReader: {
                                            releaseAllStreams: () => {}
                                        },
                                        BrowserMultiFormatOneDReader:
                                            ReaderMock
                                    }),
                                    scanIntervalMs:
                                        1
                                });

                            const video =
                                document.createElement(
                                    'video'
                                );

                            Object.defineProperty(
                                video,
                                'readyState',
                                {
                                    value:
                                        HTMLMediaElement.HAVE_CURRENT_DATA
                                }
                            );

                            const scanned =
                                await new Promise(
                                    resolve => adapter.start({
                                        onDiagnostic: event => diagnostics.push(
                                            event
                                        ),
                                        onError: error => errors.push(
                                            error.name
                                        ),
                                        onResult: resolve,
                                        video
                                    })
                                );

                            adapter.stop();

                            return {
                                decodeCalls,
                                diagnostics,
                                errors,
                                scanned
                            };

                        }
                    );

                expect(
                    result.errors
                ).toEqual([]);

                expect(
                    result.decodeCalls
                ).toBe(
                    4
                );

                expect(
                    result.diagnostics
                ).toContainEqual({
                    errorName:
                        'NotFoundException',
                    errorType:
                        'notFound',
                    type:
                        'detection retryable'
                });

                expect(
                    result.diagnostics
                ).toContainEqual({
                    errorName:
                        'ChecksumException',
                    errorType:
                        'checksum',
                    type:
                        'detection retryable'
                });

                expect(
                    result.diagnostics
                ).toContainEqual({
                    errorName:
                        'FormatException',
                    errorType:
                        'format',
                    type:
                        'detection retryable'
                });

                expect(
                    result.scanned
                ).toEqual({
                    adapter:
                        'zxing',
                    format:
                        'ean_13',
                    rawValue:
                        '9780140328721'
                });

            }
        );

        test(
            'classifies real ZXing library exceptions after minification',
            async ({ page }) => {

                const result =
                    await withScannerModules(
                        page,
                        async () => {

                            const {
                                ZxingBarcodeAdapter
                            } = await import(
                                '/src/services/barcode-scanner/zxing-barcode-adapter.js'
                            );

                            const zxingLibrary =
                                await import(
                                    '/node_modules/.vite/deps/@zxing_library.js'
                                );

                            const MinifiedNotFound =
                                class e extends zxingLibrary.NotFoundException {};

                            const MinifiedChecksum =
                                class e extends zxingLibrary.ChecksumException {};

                            const MinifiedFormat =
                                class e extends zxingLibrary.FormatException {};

                            let decodeCalls =
                                0;

                            const diagnostics =
                                [];

                            const errors =
                                [];

                            function minifyErrorName(error) {

                                Object.defineProperty(
                                    error,
                                    'name',
                                    {
                                        configurable:
                                            true,
                                        value:
                                            'e'
                                    }
                                );

                                return error;

                            }

                            class ReaderMock {

                                set possibleFormats(_) {}

                                decode() {

                                    decodeCalls +=
                                        1;

                                    if (
                                        decodeCalls === 1
                                    ) {

                                        const error =
                                            minifyErrorName(
                                                new MinifiedNotFound()
                                            );

                                        throw error;

                                    }

                                    if (
                                        decodeCalls === 2
                                    ) {

                                        const error =
                                            minifyErrorName(
                                                new MinifiedChecksum()
                                            );

                                        throw error;

                                    }

                                    if (
                                        decodeCalls === 3
                                    ) {

                                        const error =
                                            minifyErrorName(
                                                new MinifiedFormat()
                                            );

                                        throw error;

                                    }

                                    return {
                                        getBarcodeFormat: () => 7,
                                        getText: () => '9780140328721'
                                    };

                                }

                                reset() {}

                            }

                            const adapter =
                                new ZxingBarcodeAdapter({
                                    moduleLoader: async () => ({
                                        browser: {
                                            BarcodeFormat: {
                                                7:
                                                    'EAN_13',
                                                EAN_13:
                                                    7,
                                                UPC_A:
                                                    14
                                            },
                                            BrowserCodeReader: {
                                                releaseAllStreams: () => {}
                                            },
                                            BrowserMultiFormatOneDReader:
                                                ReaderMock
                                        },
                                        library:
                                            zxingLibrary
                                    }),
                                    scanIntervalMs:
                                        1
                                });

                            const video =
                                document.createElement(
                                    'video'
                                );

                            Object.defineProperty(
                                video,
                                'readyState',
                                {
                                    value:
                                        HTMLMediaElement.HAVE_CURRENT_DATA
                                }
                            );

                            const scanned =
                                await new Promise(
                                    resolve => adapter.start({
                                        onDiagnostic: event => diagnostics.push(
                                            event
                                        ),
                                        onError: error => {

                                            errors.push(
                                                error.name
                                            );

                                            resolve({
                                                error:
                                                    error.name
                                            });

                                        },
                                        onResult: resolve,
                                        video
                                    })
                                );

                            adapter.stop();

                            return {
                                diagnostics:
                                    diagnostics.map(
                                        event => [
                                            event.type,
                                            event.errorName,
                                            event.errorType
                                        ]
                                    ),
                                errors,
                                scanned
                            };

                        }
                    );

                expect(
                    result.errors
                ).toEqual([]);

                expect(
                    result.diagnostics
                ).toContainEqual([
                    'detection retryable',
                    'e',
                    'notFound'
                ]);

                expect(
                    result.diagnostics
                ).toContainEqual([
                    'detection retryable',
                    'e',
                    'checksum'
                ]);

                expect(
                    result.diagnostics
                ).toContainEqual([
                    'detection retryable',
                    'e',
                    'format'
                ]);

                expect(
                    result.scanned.rawValue
                ).toBe(
                    '9780140328721'
                );

            }
        );

        test(
            'keeps ZXing stream alive through retryable errors until a result',
            async ({ page }) => {

                const result =
                    await withScannerModules(
                        page,
                        async () => {

                            const {
                                ScannerService
                            } = await import(
                                '/src/services/barcode-scanner/scanner-service.js'
                            );

                            const {
                                ZxingBarcodeAdapter
                            } = await import(
                                '/src/services/barcode-scanner/zxing-barcode-adapter.js'
                            );

                            class NotFoundException extends Error {}

                            const checksumError =
                                new Error(
                                    'checksum'
                                );

                            checksumError.name =
                                'ChecksumException';

                            let decodeCalls =
                                0;

                            const srcObjectDuringDecode =
                                [];

                            class ReaderMock {

                                set possibleFormats(_) {}

                                decode(video) {

                                    decodeCalls +=
                                        1;

                                    srcObjectDuringDecode.push(
                                        Boolean(
                                            video.srcObject
                                        )
                                    );

                                    if (
                                        decodeCalls === 1
                                    ) {

                                        throw checksumError;

                                    }

                                    if (
                                        decodeCalls === 2
                                    ) {

                                        throw new NotFoundException(
                                            'missing'
                                        );

                                    }

                                    return {
                                        getBarcodeFormat: () => 7,
                                        getText: () => '9780140328721'
                                    };

                                }

                                reset() {}

                            }

                            let stopCalls =
                                0;

                            const stream =
                                {
                                    getTracks: () => [
                                        {
                                            stop: () => {

                                                stopCalls +=
                                                    1;

                                            }
                                        }
                                    ]
                                };

                            const diagnostics =
                                [];

                            const errors =
                                [];

                            const service =
                                new ScannerService({
                                    createNativeAdapter: () => ({
                                        isSupported: async () => false,
                                        stop: () => {}
                                    }),
                                    createZxingAdapter: () => new ZxingBarcodeAdapter({
                                        moduleLoader: async () => ({
                                            BarcodeFormat: {
                                                7:
                                                    'EAN_13',
                                                EAN_13:
                                                    7,
                                                UPC_A:
                                                    14
                                            },
                                            BrowserCodeReader: {
                                                releaseAllStreams: () => {}
                                            },
                                            BrowserMultiFormatOneDReader:
                                                ReaderMock
                                        }),
                                        scanIntervalMs:
                                            1
                                    }),
                                    mediaDevices: {
                                        getUserMedia: async () => stream
                                    },
                                    secureContext:
                                        true
                                });

                            const video =
                                window.createTestVideo();

                            const scanned =
                                await new Promise(
                                    resolve => service.start({
                                        onDiagnostic: event => diagnostics.push(
                                            event
                                        ),
                                        onError: error => errors.push(
                                            error.code
                                        ),
                                        onResult: resolve,
                                        video
                                    })
                                );

                            return {
                                diagnostics:
                                    diagnostics.map(
                                        event => [
                                            event.type,
                                            event.errorName
                                        ]
                                    ),
                                errors,
                                scanned,
                                srcObjectCleared:
                                    video.srcObject === null,
                                srcObjectDuringDecode,
                                stopCalls
                            };

                        }
                    );

                expect(
                    result.errors
                ).toEqual([]);

                expect(
                    result.srcObjectDuringDecode
                ).toEqual([
                    true,
                    true,
                    true
                ]);

                expect(
                    result.scanned.rawValue
                ).toBe(
                    '9780140328721'
                );

                expect(
                    result.stopCalls
                ).toBe(
                    1
                );

                expect(
                    result.srcObjectCleared
                ).toBeTruthy();

                expect(
                    result.diagnostics
                ).toContainEqual([
                    'detection retryable',
                    'ChecksumException'
                ]);

                expect(
                    result.diagnostics
                ).toContainEqual([
                    'detection retryable',
                    'NotFoundException'
                ]);

            }
        );

        test(
            'keeps unknown ZXing decode errors fatal',
            async ({ page }) => {

                const result =
                    await withScannerModules(
                        page,
                        async () => {

                            const {
                                ScannerService
                            } = await import(
                                '/src/services/barcode-scanner/scanner-service.js'
                            );

                            const {
                                ZxingBarcodeAdapter
                            } = await import(
                                '/src/services/barcode-scanner/zxing-barcode-adapter.js'
                            );

                            class ReaderMock {

                                set possibleFormats(_) {}

                                decode() {

                                    throw new Error(
                                        'canvas failed'
                                    );

                                }

                                reset() {}

                            }

                            let stopCalls =
                                0;

                            const service =
                                new ScannerService({
                                    createNativeAdapter: () => ({
                                        isSupported: async () => false,
                                        stop: () => {}
                                    }),
                                    createZxingAdapter: () => new ZxingBarcodeAdapter({
                                        moduleLoader: async () => ({
                                            BarcodeFormat: {
                                                EAN_13:
                                                    7,
                                                UPC_A:
                                                    14
                                            },
                                            BrowserCodeReader: {
                                                releaseAllStreams: () => {}
                                            },
                                            BrowserMultiFormatOneDReader:
                                                ReaderMock
                                        }),
                                        scanIntervalMs:
                                            1
                                    }),
                                    mediaDevices: {
                                        getUserMedia: async () => ({
                                            getTracks: () => [
                                                {
                                                    stop: () => {

                                                        stopCalls +=
                                                            1;

                                                    }
                                                }
                                            ]
                                        })
                                    },
                                    secureContext:
                                        true
                                });

                            const video =
                                window.createTestVideo();

                            const code =
                                await new Promise(
                                    resolve => service.start({
                                        onError: error => resolve(
                                            error.code
                                        ),
                                        onResult: () => resolve(
                                            'result'
                                        ),
                                        video
                                    })
                                );

                            return {
                                code,
                                srcObjectCleared:
                                    video.srcObject === null,
                                stopCalls
                            };

                        }
                    );

                expect(
                    result.code
                ).toBe(
                    'read-error'
                );

                expect(
                    result.stopCalls
                ).toBe(
                    1
                );

                expect(
                    result.srcObjectCleared
                ).toBeTruthy();

            }
        );

        test(
            'stops ZXing retry loop after manual stop',
            async ({ page }) => {

                const result =
                    await withScannerModules(
                        page,
                        async () => {

                            const {
                                ZxingBarcodeAdapter
                            } = await import(
                                '/src/services/barcode-scanner/zxing-barcode-adapter.js'
                            );

                            class NotFoundException extends Error {}

                            let decodeCalls =
                                0;

                            class ReaderMock {

                                set possibleFormats(_) {}

                                decode() {

                                    decodeCalls +=
                                        1;

                                    throw new NotFoundException(
                                        'missing'
                                    );

                                }

                                reset() {}

                            }

                            const adapter =
                                new ZxingBarcodeAdapter({
                                    moduleLoader: async () => ({
                                        BarcodeFormat: {
                                            EAN_13:
                                                7,
                                            UPC_A:
                                                14
                                        },
                                        BrowserCodeReader: {
                                            releaseAllStreams: () => {}
                                        },
                                        BrowserMultiFormatOneDReader:
                                            ReaderMock
                                    }),
                                    scanIntervalMs:
                                        5
                                });

                            const video =
                                document.createElement(
                                    'video'
                                );

                            Object.defineProperty(
                                video,
                                'readyState',
                                {
                                    value:
                                        HTMLMediaElement.HAVE_CURRENT_DATA
                                }
                            );

                            await adapter.start({
                                onDiagnostic: event => {

                                    if (
                                        event.type === 'detection retryable'
                                    ) {

                                        adapter.stop();

                                    }

                                },
                                onError: () => {},
                                onResult: () => {},
                                video
                            });

                            await new Promise(
                                resolve => window.setTimeout(
                                    resolve,
                                    20
                                )
                            );

                            return decodeCalls;

                        }
                    );

                expect(
                    result
                ).toBe(
                    1
                );

            }
        );

        test(
            'returns stable error when ZXing fallback cannot load',
            async ({ page }) => {

                const code =
                    await withScannerModules(
                        page,
                        async () => {

                            const {
                                ScannerService
                            } = await import(
                                '/src/services/barcode-scanner/scanner-service.js'
                            );

                            const loadError =
                                new Error(
                                    'chunk-load-failed'
                                );

                            const service =
                                new ScannerService({
                                    createNativeAdapter: () => ({
                                        isSupported: async () => false,
                                        stop: () => {}
                                    }),
                                    createZxingAdapter: () => ({
                                        isSupported: async () => false,
                                        lastLoadError:
                                            loadError,
                                        stop: () => {}
                                    }),
                                    mediaDevices: {
                                        getUserMedia: async () => ({
                                            getTracks: () => [
                                                {
                                                    stop: () => {}
                                                }
                                            ]
                                        })
                                    },
                                    secureContext:
                                        true
                                });

                            try {

                                await service.start({
                                    onError: () => {},
                                    onResult: () => {},
                                    video:
                                        window.createTestVideo()
                                });

                            } catch (error) {

                                return error.code;

                            }

                            return 'none';

                        }
                    );

                expect(
                    code
                ).toBe(
                    'fallback-unavailable'
                );

            }
        );

        test(
            'does not persist data or call network while scanning',
            async ({ page }) => {

                const result =
                    await withScannerModules(
                        page,
                        async () => {

                            const {
                                ScannerService
                            } = await import(
                                '/src/services/barcode-scanner/scanner-service.js'
                            );

                            const calls =
                                [];

                            const originalFetch =
                                window.fetch;

                            window.fetch =
                                (...args) => {

                                    calls.push(
                                        [
                                            'fetch',
                                            args[0]
                                        ]
                                    );

                                    return originalFetch(
                                        ...args
                                    );

                                };

                            for (
                                const storage of [
                                    localStorage,
                                    sessionStorage
                                ]
                            ) {

                                const originalSetItem =
                                    storage.setItem.bind(
                                        storage
                                    );

                                storage.setItem =
                                    (...args) => {

                                        calls.push(
                                            [
                                                'storage',
                                                args[0]
                                            ]
                                        );

                                        return originalSetItem(
                                            ...args
                                        );

                                    };

                            }

                            const originalIndexedDb =
                                window.indexedDB;

                            Object.defineProperty(
                                window,
                                'indexedDB',
                                {
                                    configurable:
                                        true,
                                    get: () => {

                                        calls.push(
                                            [
                                                'indexedDB'
                                            ]
                                        );

                                        return originalIndexedDb;

                                    }
                                }
                            );

                            const service =
                                new ScannerService({
                                    createNativeAdapter: () => ({
                                        isSupported: async () => true,
                                        start: ({ onResult }) => onResult({
                                            adapter:
                                                'native',
                                            format:
                                                'ean_13',
                                            rawValue:
                                                '9780140328721'
                                        }),
                                        stop: () => {}
                                    }),
                                    mediaDevices: {
                                        getUserMedia: async () => ({
                                            getTracks: () => [
                                                {
                                                    stop: () => {}
                                                }
                                            ]
                                        })
                                    },
                                    secureContext:
                                        true
                                });

                            const video =
                                window.createTestVideo();

                            await service.start({
                                onError: () => {},
                                onResult: () => {},
                                video
                            });

                            return calls;

                        }
                    );

                expect(
                    result
                ).toEqual([]);

            }
        );

        test(
            'opens and closes the modal, restores focus, and stops on unmount',
            async ({ page }) => {

                const result =
                    await withScannerModules(
                        page,
                        async () => {

                            const {
                                createApp,
                                h,
                                nextTick,
                                ref
                            } = await import(
                                '/node_modules/.vite/deps/vue.js'
                            );

                            const {
                                default: CameraScanner
                            } = await import(
                                '/src/components/forms/CameraScanner.vue'
                            );

                            const events =
                                [];

                            let stopCalls =
                                0;

                            const root =
                                document.createElement(
                                    'div'
                                );

                            document.body.append(
                                root
                            );

                            const trigger =
                                document.createElement(
                                    'button'
                                );

                            trigger.textContent =
                                'Scanner';

                            document.body.append(
                                trigger
                            );

                            const open =
                                ref(
                                    true
                                );

                            const app =
                                createApp({
                                    setup() {

                                        return () => h(
                                            CameraScanner,
                                            {
                                                open:
                                                    open.value,
                                                scannerFactory: () => ({
                                                    start: async () => {},
                                                    stop: () => {

                                                        stopCalls += 1;

                                                    }
                                                }),
                                                triggerElement:
                                                    trigger,
                                                onClose: () => {

                                                    events.push(
                                                        'close'
                                                    );

                                                    open.value =
                                                        false;

                                                },
                                                onResult: value => events.push(
                                                    [
                                                        'result',
                                                        value
                                                    ]
                                                )
                                            }
                                        );

                                    }
                                });

                            app.mount(
                                root
                            );

                            await nextTick();
                            await nextTick();

                            const dialogVisible =
                                Boolean(
                                    document.querySelector(
                                        '[role="dialog"]'
                                    )
                                );

                            document.querySelector(
                                '.camera-scanner-close'
                            ).click();

                            await nextTick();
                            await nextTick();
                            await new Promise(
                                resolve => window.setTimeout(
                                    resolve,
                                    0
                                )
                            );

                            const focusRestored =
                                document.activeElement === trigger;

                            app.unmount();

                            const secondRoot =
                                document.createElement(
                                    'div'
                                );

                            document.body.append(
                                secondRoot
                            );

                            const secondApp =
                                createApp({
                                    render: () => h(
                                        CameraScanner,
                                        {
                                            open:
                                                true,
                                            scannerFactory: () => ({
                                                start: async () => {},
                                                stop: () => {

                                                    stopCalls += 1;

                                                }
                                            }),
                                            triggerElement:
                                                trigger
                                        }
                                    )
                                });

                            secondApp.mount(
                                secondRoot
                            );

                            await nextTick();
                            await nextTick();

                            secondApp.unmount();

                            return {
                                activeElement:
                                    focusRestored,
                                dialogVisible,
                                events,
                                stopCalls
                            };

                        }
                    );

                expect(
                    result.dialogVisible
                ).toBeTruthy();

                expect(
                    result.events
                ).toEqual([
                    'close'
                ]);

                expect(
                    result.activeElement
                ).toBeTruthy();

                expect(
                    result.stopCalls
                ).toBeGreaterThanOrEqual(
                    2
                );

            }
        );

        test(
            'keeps the same video element while moving from loading to scanning',
            async ({ page }) => {

                const result =
                    await withScannerModules(
                        page,
                        async () => {

                            const {
                                createApp,
                                h,
                                nextTick,
                                ref
                            } = await import(
                                '/node_modules/.vite/deps/vue.js'
                            );

                            const {
                                default: CameraScanner
                            } = await import(
                                '/src/components/forms/CameraScanner.vue'
                            );

                            let resolveStart;

                            const startPromise =
                                new Promise(
                                    resolve => {

                                        resolveStart =
                                            resolve;

                                    }
                                );

                            const root =
                                document.createElement(
                                    'div'
                                );

                            document.body.append(
                                root
                            );

                            const app =
                                createApp({
                                    render: () => h(
                                        CameraScanner,
                                        {
                                            open:
                                                true,
                                            scannerFactory: () => ({
                                                start: () => startPromise,
                                                stop: () => {}
                                            })
                                        }
                                    )
                                });

                            app.mount(
                                root
                            );

                            await nextTick();
                            await nextTick();

                            const loadingVideo =
                                document.querySelector(
                                    '.camera-scanner-preview video'
                                );

                            resolveStart();

                            await nextTick();
                            await nextTick();

                            const scanningVideo =
                                document.querySelector(
                                    '.camera-scanner-preview video'
                                );

                            app.unmount();

                            return {
                                sameVideo:
                                    loadingVideo === scanningVideo,
                                videoPresent:
                                    Boolean(
                                        loadingVideo
                                    )
                            };

                        }
                    );

                expect(
                    result.videoPresent
                ).toBeTruthy();

                expect(
                    result.sameVideo
                ).toBeTruthy();

            }
        );

        test(
            'shows camera diagnostics only when cameraDebug is enabled',
            async ({ page }) => {

                const result =
                    await withScannerModules(
                        page,
                        async () => {

                            const {
                                createApp,
                                h,
                                nextTick
                            } = await import(
                                '/node_modules/.vite/deps/vue.js'
                            );

                            const {
                                default: CameraScanner
                            } = await import(
                                '/src/components/forms/CameraScanner.vue'
                            );

                            async function render() {

                                const root =
                                    document.createElement(
                                        'div'
                                    );

                                document.body.append(
                                    root
                                );

                                const app =
                                    createApp({
                                        render: () => h(
                                            CameraScanner,
                                            {
                                                open:
                                                    true,
                                                scannerFactory: () => ({
                                                    start: async () => {},
                                                    stop: () => {}
                                                })
                                            }
                                        )
                                    });

                                app.mount(
                                    root
                                );

                                await nextTick();
                                await nextTick();

                                const present =
                                    Boolean(
                                        document.querySelector(
                                            '.camera-debug-panel'
                                        )
                                    );

                                app.unmount();

                                return present;

                            }

                            return render();

                        }
                    );

                expect(
                    result
                ).toBeFalsy();

                const enabled =
                    await withScannerModules(
                        page,
                        async () => {

                            const {
                                createApp,
                                h,
                                nextTick
                            } = await import(
                                '/node_modules/.vite/deps/vue.js'
                            );

                            const {
                                default: CameraScanner
                            } = await import(
                                '/src/components/forms/CameraScanner.vue'
                            );

                            const root =
                                document.createElement(
                                    'div'
                                );

                            document.body.append(
                                root
                            );

                            const app =
                                createApp({
                                    render: () => h(
                                        CameraScanner,
                                        {
                                            open:
                                                true,
                                            scannerFactory: () => ({
                                                start: async () => {},
                                                stop: () => {}
                                            })
                                        }
                                    )
                                });

                            app.mount(
                                root
                            );

                            await nextTick();
                            await nextTick();

                            const present =
                                Boolean(
                                    document.querySelector(
                                        '.camera-debug-panel'
                                    )
                                );

                            app.unmount();

                            return {
                                local:
                                    localStorage.length,
                                search:
                                    window.location.search,
                                present,
                                session:
                                    sessionStorage.length
                            };

                        },
                        '/?cameraDebug=1'
                    );

                expect(
                    enabled.search
                ).toContain(
                    'cameraDebug=1'
                );

                expect(
                    enabled.present
                ).toBeTruthy();

                expect(
                    enabled.local
                ).toBe(
                    0
                );

                expect(
                    enabled.session
                ).toBe(
                    0
                );

            }
        );

        test(
            'camera diagnostics update, copy safely, and preview-only skips adapters',
            async ({ page }) => {

                const result =
                    await withScannerModules(
                        page,
                        async () => {

                            const {
                                createApp,
                                h,
                                nextTick,
                                ref
                            } = await import(
                                '/node_modules/.vite/deps/vue.js'
                            );

                            const {
                                default: CameraScanner
                            } = await import(
                                '/src/components/forms/CameraScanner.vue'
                            );

                            let copied =
                                '';

                            Object.defineProperty(
                                navigator,
                                'clipboard',
                                {
                                    configurable:
                                        true,
                                    value: {
                                        writeText: async text => {

                                            copied =
                                                text;

                                        }
                                    }
                                }
                            );

                            const root =
                                document.createElement(
                                    'div'
                                );

                            document.body.append(
                                root
                            );

                            const diagnostics =
                                [];

                            const open =
                                ref(
                                    true
                                );

                            const app =
                                createApp({
                                    render: () => h(
                                        CameraScanner,
                                        {
                                            open:
                                                open.value,
                                            scannerFactory: () => ({
                                                getDebugSnapshot: () => ({
                                                    adapter:
                                                        'none',
                                                    getUserMediaCalls:
                                                        1,
                                                    sessionId:
                                                        7,
                                                    stream: {
                                                        active:
                                                            true,
                                                        streamId:
                                                            'stream-safe',
                                                        tracks: [
                                                            {
                                                                muted:
                                                                    true,
                                                                readyState:
                                                                    'live',
                                                                trackId:
                                                                    'track-safe'
                                                            }
                                                        ]
                                                    }
                                                }),
                                                start: async ({
                                                    onDiagnostic,
                                                    previewOnly
                                                }) => {

                                                    diagnostics.push(
                                                        [
                                                            'previewOnly',
                                                            previewOnly
                                                        ]
                                                    );

                                                    onDiagnostic({
                                                        active:
                                                            true,
                                                        getUserMediaCalls:
                                                            1,
                                                        sessionId:
                                                            7,
                                                        streamId:
                                                            'stream-safe',
                                                        tracks: [
                                                            {
                                                                muted:
                                                                    true,
                                                                readyState:
                                                                    'live',
                                                                trackId:
                                                                    'track-safe'
                                                            }
                                                        ],
                                                        type:
                                                            'stream attached'
                                                    });

                                                    onDiagnostic({
                                                        getUserMediaCalls:
                                                            1,
                                                        sessionId:
                                                            7,
                                                        type:
                                                            'track mute'
                                                    });

                                                    onDiagnostic({
                                                        errorName:
                                                            'NotFoundException',
                                                        errorType:
                                                            'notFound',
                                                        getUserMediaCalls:
                                                            1,
                                                        sessionId:
                                                            7,
                                                        type:
                                                            'detection retryable'
                                                    });

                                                    onDiagnostic({
                                                        errorName:
                                                            'ChecksumException',
                                                        errorType:
                                                            'checksum',
                                                        getUserMediaCalls:
                                                            1,
                                                        sessionId:
                                                            7,
                                                        type:
                                                            'detection retryable'
                                                    });

                                                    onDiagnostic({
                                                        errorName:
                                                            'FormatException',
                                                        errorType:
                                                            'format',
                                                        getUserMediaCalls:
                                                            1,
                                                        sessionId:
                                                            7,
                                                        type:
                                                            'detection retryable'
                                                    });

                                                    onDiagnostic({
                                                        constructorName:
                                                            'e',
                                                        errorName:
                                                            'e',
                                                        errorType:
                                                            'fatal',
                                                        getUserMediaCalls:
                                                            1,
                                                        objectType:
                                                            '[object Error]',
                                                        sessionId:
                                                            7,
                                                        type:
                                                            'detection fatal'
                                                    });

                                                },
                                                stop: () => {}
                                            }),
                                            onClose: () => {

                                                open.value =
                                                    false;

                                            }
                                        }
                                    )
                                });

                            app.mount(
                                root
                            );

                            await nextTick();
                            await nextTick();

                            document.querySelector(
                                '.camera-debug-toggle input'
                            ).click();

                            await nextTick();

                            document.querySelector(
                                '.camera-scanner-close'
                            ).click();

                            await nextTick();
                            await nextTick();

                            open.value =
                                true;

                            await nextTick();
                            await nextTick();

                            document.querySelector(
                                '.camera-debug-header button'
                            ).click();

                            await nextTick();
                            await new Promise(
                                resolve => window.setTimeout(
                                    resolve,
                                    0
                                )
                            );

                            const panelText =
                                document.querySelector(
                                    '.camera-debug-panel'
                                ).textContent;

                            app.unmount();

                            return {
                                copied,
                                diagnostics,
                                panelText
                            };

                        },
                        '/?cameraDebug=1'
                    );

                expect(
                    result.diagnostics
                ).toContainEqual([
                    'previewOnly',
                    true
                ]);

                expect(
                    result.panelText
                ).toContain(
                    'stream'
                );

                expect(
                    result.panelText
                ).toContain(
                    'track mute'
                );

                expect(
                    result.panelText
                ).toContain(
                    'notFound=1'
                );

                expect(
                    result.panelText
                ).toContain(
                    'checksum=1'
                );

                expect(
                    result.panelText
                ).toContain(
                    'format=1'
                );

                expect(
                    result.panelText
                ).toContain(
                    'fatal=1'
                );

                expect(
                    result.panelText
                ).toContain(
                    'detection retryable checksum'
                );

                expect(
                    result.copied
                ).toContain(
                    'Camera diagnostic'
                );

                expect(
                    result.copied
                ).not.toContain(
                    'barcode'
                );

                expect(
                    result.copied
                ).not.toContain(
                    'password'
                );

            }
        );

        test(
            'closes from backdrop only after scanning is active',
            async ({ page }) => {

                const result =
                    await withScannerModules(
                        page,
                        async () => {

                            const {
                                createApp,
                                h,
                                nextTick,
                                ref
                            } = await import(
                                '/node_modules/.vite/deps/vue.js'
                            );

                            const {
                                default: CameraScanner
                            } = await import(
                                '/src/components/forms/CameraScanner.vue'
                            );

                            const open =
                                ref(
                                    true
                                );

                            const events =
                                [];

                            let stopCalls =
                                0;

                            const root =
                                document.createElement(
                                    'div'
                                );

                            document.body.append(
                                root
                            );

                            const app =
                                createApp({
                                    render: () => h(
                                        CameraScanner,
                                        {
                                            open:
                                                open.value,
                                            scannerFactory: () => ({
                                                start: async () => {},
                                                stop: () => {

                                                    stopCalls += 1;

                                                }
                                            }),
                                            onClose: () => {

                                                events.push(
                                                    'close'
                                                );

                                                open.value =
                                                    false;

                                            }
                                        }
                                    )
                                });

                            app.mount(
                                root
                            );

                            await nextTick();
                            await nextTick();

                            const backdrop =
                                document.querySelector(
                                    '[role="dialog"]'
                                );

                            backdrop.dispatchEvent(
                                new PointerEvent(
                                    'pointerdown',
                                    {
                                        bubbles:
                                            true
                                    }
                                )
                            );

                            backdrop.dispatchEvent(
                                new PointerEvent(
                                    'pointerup',
                                    {
                                        bubbles:
                                            true
                                    }
                                )
                            );

                            await nextTick();
                            await nextTick();

                            app.unmount();

                            return {
                                closed:
                                    !document.querySelector(
                                        '[role="dialog"]'
                                    ),
                                events,
                                stopCalls
                            };

                        }
                    );

                expect(
                    result.events
                ).toEqual([
                    'close'
                ]);

                expect(
                    result.closed
                ).toBeTruthy();

                expect(
                    result.stopCalls
                ).toBeGreaterThanOrEqual(
                    1
                );

            }
        );

        test(
            'ignores backdrop events while permission is pending',
            async ({ page }) => {

                const result =
                    await withScannerModules(
                        page,
                        async () => {

                            const {
                                createApp,
                                h,
                                nextTick,
                                ref
                            } = await import(
                                '/node_modules/.vite/deps/vue.js'
                            );

                            const {
                                default: CameraScanner
                            } = await import(
                                '/src/components/forms/CameraScanner.vue'
                            );

                            const open =
                                ref(
                                    true
                                );

                            const events =
                                [];

                            let stopCalls =
                                0;

                            let resolveStart;

                            const startPromise =
                                new Promise(
                                    resolve => {

                                        resolveStart =
                                            resolve;

                                    }
                                );

                            const root =
                                document.createElement(
                                    'div'
                                );

                            document.body.append(
                                root
                            );

                            const app =
                                createApp({
                                    render: () => h(
                                        CameraScanner,
                                        {
                                            open:
                                                open.value,
                                            scannerFactory: () => ({
                                                start: ({ onState }) => {

                                                    onState(
                                                        'requesting-permission'
                                                    );

                                                    return startPromise;

                                                },
                                                stop: () => {

                                                    stopCalls += 1;

                                                }
                                            }),
                                            onClose: () => {

                                                events.push(
                                                    'close'
                                                );

                                                open.value =
                                                    false;

                                            }
                                        }
                                    )
                                });

                            app.mount(
                                root
                            );

                            await nextTick();
                            await nextTick();

                            const backdrop =
                                document.querySelector(
                                    '[role="dialog"]'
                                );

                            backdrop.dispatchEvent(
                                new PointerEvent(
                                    'pointerdown',
                                    {
                                        bubbles:
                                            true
                                    }
                                )
                            );

                            backdrop.dispatchEvent(
                                new PointerEvent(
                                    'pointerup',
                                    {
                                        bubbles:
                                            true
                                    }
                                )
                            );

                            await nextTick();
                            await nextTick();

                            const stillOpenDuringPermission =
                                Boolean(
                                    document.querySelector(
                                        '[role="dialog"]'
                                    )
                                );

                            resolveStart();

                            await nextTick();

                            app.unmount();

                            return {
                                events,
                                stillOpenDuringPermission,
                                stopCalls
                            };

                        }
                    );

                expect(
                    result.events
                ).toEqual([]);

                expect(
                    result.stillOpenDuringPermission
                ).toBeTruthy();

                expect(
                    result.stopCalls
                ).toBeGreaterThanOrEqual(
                    1
                );

            }
        );

        test(
            'ignores pointerdown before permission resolution even if pointerup happens later',
            async ({ page }) => {

                const result =
                    await withScannerModules(
                        page,
                        async () => {

                            const {
                                createApp,
                                h,
                                nextTick,
                                ref
                            } = await import(
                                '/node_modules/.vite/deps/vue.js'
                            );

                            const {
                                default: CameraScanner
                            } = await import(
                                '/src/components/forms/CameraScanner.vue'
                            );

                            const open =
                                ref(
                                    true
                                );

                            const events =
                                [];

                            let resolveStart;

                            const startPromise =
                                new Promise(
                                    resolve => {

                                        resolveStart =
                                            resolve;

                                    }
                                );

                            const root =
                                document.createElement(
                                    'div'
                                );

                            document.body.append(
                                root
                            );

                            const app =
                                createApp({
                                    render: () => h(
                                        CameraScanner,
                                        {
                                            open:
                                                open.value,
                                            scannerFactory: () => ({
                                                start: ({ onState }) => {

                                                    onState(
                                                        'requesting-permission'
                                                    );

                                                    window.setTimeout(
                                                        () => {

                                                            onState(
                                                                'preparing-video'
                                                            );

                                                            resolveStart();

                                                        },
                                                        0
                                                    );

                                                    return startPromise;

                                                },
                                                stop: () => {}
                                            }),
                                            onClose: () => {

                                                events.push(
                                                    'close'
                                                );

                                                open.value =
                                                    false;

                                            }
                                        }
                                    )
                                });

                            app.mount(
                                root
                            );

                            await nextTick();
                            await nextTick();

                            const backdrop =
                                document.querySelector(
                                    '[role="dialog"]'
                                );

                            backdrop.dispatchEvent(
                                new PointerEvent(
                                    'pointerdown',
                                    {
                                        bubbles:
                                            true
                                    }
                                )
                            );

                            await new Promise(
                                resolve => window.setTimeout(
                                    resolve,
                                    0
                                )
                            );

                            await nextTick();
                            await nextTick();

                            backdrop.dispatchEvent(
                                new PointerEvent(
                                    'pointerup',
                                    {
                                        bubbles:
                                            true
                                    }
                                )
                            );

                            await nextTick();
                            await nextTick();

                            const stillOpen =
                                Boolean(
                                    document.querySelector(
                                        '[role="dialog"]'
                                    )
                                );

                            app.unmount();

                            return {
                                events,
                                stillOpen
                            };

                        }
                    );

                expect(
                    result.events
                ).toEqual([]);

                expect(
                    result.stillOpen
                ).toBeTruthy();

            }
        );

        test(
            'keeps the modal open for dialog clicks and visibility changes',
            async ({ page }) => {

                const result =
                    await withScannerModules(
                        page,
                        async () => {

                            const {
                                createApp,
                                h,
                                nextTick,
                                ref
                            } = await import(
                                '/node_modules/.vite/deps/vue.js'
                            );

                            const {
                                default: CameraScanner
                            } = await import(
                                '/src/components/forms/CameraScanner.vue'
                            );

                            const open =
                                ref(
                                    true
                                );

                            const events =
                                [];

                            const root =
                                document.createElement(
                                    'div'
                                );

                            document.body.append(
                                root
                            );

                            const app =
                                createApp({
                                    render: () => h(
                                        CameraScanner,
                                        {
                                            open:
                                                open.value,
                                            scannerFactory: () => ({
                                                start: async () => {},
                                                stop: () => {}
                                            }),
                                            onClose: () => {

                                                events.push(
                                                    'close'
                                                );

                                                open.value =
                                                    false;

                                            }
                                        }
                                    )
                                });

                            app.mount(
                                root
                            );

                            await nextTick();
                            await nextTick();

                            const modal =
                                document.querySelector(
                                    '.camera-scanner-modal'
                                );

                            modal.dispatchEvent(
                                new PointerEvent(
                                    'pointerdown',
                                    {
                                        bubbles:
                                            true
                                    }
                                )
                            );

                            modal.dispatchEvent(
                                new PointerEvent(
                                    'pointerup',
                                    {
                                        bubbles:
                                            true
                                    }
                                )
                            );

                            document.dispatchEvent(
                                new Event(
                                    'visibilitychange'
                                )
                            );

                            window.dispatchEvent(
                                new Event(
                                    'blur'
                                )
                            );

                            await nextTick();
                            await nextTick();

                            const stillOpen =
                                Boolean(
                                    document.querySelector(
                                        '[role="dialog"]'
                                    )
                                );

                            app.unmount();

                            return {
                                events,
                                stillOpen
                            };

                        }
                    );

                expect(
                    result.events
                ).toEqual([]);

                expect(
                    result.stillOpen
                ).toBeTruthy();

            }
        );

        test(
            'close button remains available while permission is pending',
            async ({ page }) => {

                const result =
                    await withScannerModules(
                        page,
                        async () => {

                            const {
                                createApp,
                                h,
                                nextTick,
                                ref
                            } = await import(
                                '/node_modules/.vite/deps/vue.js'
                            );

                            const {
                                default: CameraScanner
                            } = await import(
                                '/src/components/forms/CameraScanner.vue'
                            );

                            const open =
                                ref(
                                    true
                                );

                            const events =
                                [];

                            const root =
                                document.createElement(
                                    'div'
                                );

                            document.body.append(
                                root
                            );

                            const app =
                                createApp({
                                    render: () => h(
                                        CameraScanner,
                                        {
                                            open:
                                                open.value,
                                            scannerFactory: () => ({
                                                start: ({ onState }) => {

                                                    onState(
                                                        'requesting-permission'
                                                    );

                                                    return new Promise(
                                                        () => {}
                                                    );

                                                },
                                                stop: () => {}
                                            }),
                                            onClose: () => {

                                                events.push(
                                                    'close'
                                                );

                                                open.value =
                                                    false;

                                            }
                                        }
                                    )
                                });

                            app.mount(
                                root
                            );

                            await nextTick();
                            await nextTick();

                            document.querySelector(
                                '.camera-scanner-close'
                            ).click();

                            await nextTick();
                            await nextTick();

                            app.unmount();

                            return {
                                closed:
                                    !document.querySelector(
                                        '[role="dialog"]'
                                    ),
                                events
                            };

                        }
                    );

                expect(
                    result.events
                ).toEqual([
                    'close'
                ]);

                expect(
                    result.closed
                ).toBeTruthy();

            }
        );

        test(
            'scanner button opens the scanner without submitting the form',
            async ({ page }) => {

                const result =
                    await withScannerModules(
                        page,
                        async () => {

                            const {
                                createApp,
                                h,
                                nextTick
                            } = await import(
                                '/node_modules/.vite/deps/vue.js'
                            );

                            const {
                                default: DynamicForm
                            } = await import(
                                '/src/components/forms/DynamicForm.vue'
                            );

                            const root =
                                document.createElement(
                                    'div'
                                );

                            document.body.append(
                                root
                            );

                            const events =
                                [];

                            const app =
                                createApp({
                                    render: () => h(
                                        DynamicForm,
                                        {
                                            fields: [
                                                {
                                                    label:
                                                        'Barcode',
                                                    name:
                                                        'barcode',
                                                    required:
                                                        false,
                                                    type:
                                                        'barcode'
                                                }
                                            ],
                                            pluginId:
                                                'games',
                                            scannerFactory: () => ({
                                                start: () => new Promise(
                                                    () => {}
                                                ),
                                                stop: () => {}
                                            }),
                                            onSubmit: value => events.push(
                                                [
                                                    'submit',
                                                    value
                                                ]
                                            )
                                        }
                                    )
                                });

                            app.mount(
                                root
                            );

                            await nextTick();
                            await nextTick();

                            const scannerButton =
                                document.querySelector(
                                    '.scanner-button'
                                );

                            scannerButton.click();

                            await nextTick();
                            await nextTick();

                            const resultValue = {
                                buttonType:
                                    scannerButton.getAttribute(
                                        'type'
                                    ),
                                scannerOpen:
                                    Boolean(
                                        document.querySelector(
                                            '[role="dialog"]'
                                        )
                                    ),
                                submitEvents:
                                    events
                            };

                            app.unmount();

                            return resultValue;

                        }
                    );

                expect(
                    result.buttonType
                ).toBe(
                    'button'
                );

                expect(
                    result.scannerOpen
                ).toBeTruthy();

                expect(
                    result.submitEvents
                ).toEqual([]);

            }
        );

        test(
            'closes with Escape and stops the scanner',
            async ({ page }) => {

                const result =
                    await withScannerModules(
                        page,
                        async () => {

                            const {
                                createApp,
                                h,
                                nextTick,
                                ref
                            } = await import(
                                '/node_modules/.vite/deps/vue.js'
                            );

                            const {
                                default: CameraScanner
                            } = await import(
                                '/src/components/forms/CameraScanner.vue'
                            );

                            const open =
                                ref(
                                    true
                                );

                            let stopCalls =
                                0;

                            const root =
                                document.createElement(
                                    'div'
                                );

                            document.body.append(
                                root
                            );

                            const app =
                                createApp({
                                    render: () => h(
                                        CameraScanner,
                                        {
                                            open:
                                                open.value,
                                            scannerFactory: () => ({
                                                start: async () => {},
                                                stop: () => {

                                                    stopCalls += 1;

                                                }
                                            }),
                                            onClose: () => {

                                                open.value =
                                                    false;

                                            }
                                        }
                                    )
                                });

                            app.mount(
                                root
                            );

                            await nextTick();
                            await nextTick();

                            document.querySelector(
                                '[role="dialog"]'
                            ).dispatchEvent(
                                new KeyboardEvent(
                                    'keydown',
                                    {
                                        bubbles:
                                            true,
                                        key:
                                            'Escape'
                                    }
                                )
                            );

                            await nextTick();
                            await nextTick();

                            return {
                                dialogClosed:
                                    !document.querySelector(
                                        '[role="dialog"]'
                                    ),
                                stopCalls
                            };

                        }
                    );

                expect(
                    result.dialogClosed
                ).toBeTruthy();

                expect(
                    result.stopCalls
                ).toBeGreaterThanOrEqual(
                    1
                );

            }
        );

    }
);
