const {
    expect,
    test
} = require('@playwright/test');

async function withScannerModules(page, callback) {

    await page.goto(
        '/'
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
            'falls back to unconstrained video when the ideal environment stream has no preview frames',
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

                            const streams = [
                                {
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
                                },
                                {
                                    active:
                                        true,
                                    getVideoTracks: () => [
                                        {
                                            readyState:
                                                'live',
                                            stop: () => stopped.push(
                                                'fallback'
                                            )
                                        }
                                    ],
                                    label:
                                        'fallback'
                                }
                            ];

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

                                            return streams[
                                                calls.length - 1
                                            ];

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

                            await service.start({
                                onError: () => {},
                                onResult: () => {},
                                video
                            });

                            const resultValue = {
                                calls,
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
                    },
                    {
                        audio:
                            false,
                        video:
                            true
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
                    'ideal',
                    'fallback'
                ]);

                expect(
                    result.srcObject
                ).toBe(
                    'fallback'
                );

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
                    'track',
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
