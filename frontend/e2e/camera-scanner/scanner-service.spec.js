const {
    expect,
    test,
    withScannerModules
} = require('./camera-test-helpers');

test.describe(
    'scanner service camera lifecycle',
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

    }
);
