const {
    expect,
    test,
    withScannerModules
} = require('./camera-test-helpers');

test.describe(
    'zxing barcode adapter',
    () => {
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

                            const errors =
                                [];

                            const errorTypes =
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

                                        errorTypes.push(
                                            adapter.getDecodeErrorType(
                                                error
                                            )
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

                                        errorTypes.push(
                                            adapter.getDecodeErrorType(
                                                error
                                            )
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

                                        errorTypes.push(
                                            adapter.getDecodeErrorType(
                                                error
                                            )
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
                                errorTypes,
                                errors,
                                scanned
                            };

                        }
                    );

                expect(
                    result.errors
                ).toEqual([]);

                expect(
                    result.errorTypes
                ).toEqual([
                    'notFound',
                    'checksum',
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
                                        onError: error => errors.push(
                                            error.code
                                        ),
                                        onResult: resolve,
                                        video
                                    })
                                );

                            return {
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
                                onError: () => {},
                                onResult: () => {},
                                video
                            });

                            adapter.stop();

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

    }
);
