const {
    expect,
    test,
    withScannerModules
} = require('./camera-test-helpers');

test.describe(
    'native barcode adapter',
    () => {
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
            'selects only Bookland EAN-13 candidates in ISBN mode',
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
                            let detectCalls =
                                0;

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

                                    detectCalls +=
                                        1;

                                    if (
                                        detectCalls === 1
                                    ) {

                                        return [
                                            {
                                                format:
                                                    'upc_a',
                                                rawValue:
                                                    '012345678905'
                                            },
                                            {
                                                format:
                                                    'ean_13',
                                                rawValue:
                                                    '4006381333931'
                                            },
                                            {
                                                format:
                                                    'ean_13',
                                                rawValue:
                                                    '9780140328720'
                                            },
                                            {
                                                format:
                                                    'ean_8',
                                                rawValue:
                                                    '12345670'
                                            }
                                        ];

                                    }

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
                                        1,
                                    scanMode:
                                        'isbn'
                                });

                            const video =
                                window.createTestVideo();

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
                                detectCalls,
                                requestedFormats,
                                scanned
                            };

                        }
                    );

                expect(
                    result.requestedFormats
                ).toEqual([
                    'ean_13'
                ]);

                expect(
                    result.detectCalls
                ).toBe(
                    2
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

            }
        );

        test(
            'keeps generic EAN-13 and UPC-A candidates in barcode mode',
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

                            class BarcodeDetectorMock {

                                static async getSupportedFormats() {

                                    return [
                                        'ean_13',
                                        'upc_a'
                                    ];

                                }

                                async detect() {

                                    return [
                                        {
                                            format:
                                                'upc_a',
                                            rawValue:
                                                '012345678905'
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

                            const video =
                                window.createTestVideo();

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

                            return scanned;

                        }
                    );

                expect(
                    result
                ).toEqual({
                    adapter:
                        'native',
                    format:
                        'upc_a',
                    rawValue:
                        '012345678905'
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

    }
);
