import {
    normalizeBarcodeResult
} from './formats.js';

const defaultScanIntervalMs =
    300;

async function loadZxingModules() {

    const [
        browser,
        library
    ] =
        await Promise.all([
            import(
                '@zxing/browser'
            ),
            import(
                '@zxing/library'
            )
        ]);

    return {
        browser,
        library
    };

}

const zxingFormatNames =
    new Map([
        [
            'EAN_13',
            'ean_13'
        ],
        [
            'UPC_A',
            'upc_a'
        ]
    ]);

export class ZxingBarcodeAdapter {

    constructor({
        moduleLoader =
            loadZxingModules,
        scanIntervalMs =
            defaultScanIntervalMs
    } = {}) {

        this.moduleLoader =
            moduleLoader;

        this.scanIntervalMs =
            scanIntervalMs;

        this.reader =
            null;

        this.timeoutId =
            null;

        this.zxing =
            null;

        this.zxingLibrary =
            null;

        this.lastLoadError =
            null;

        this.stopped =
            true;

    }

    async isSupported() {

        try {

            await this.loadReader();

            return true;

        } catch (error) {

            this.lastLoadError =
                error;

            return false;

        }

    }

    async start({
        onDiagnostic = () => {},
        onError,
        onResult,
        video
    }) {

        await this.loadReader();

        this.stopped =
            false;

        const scan =
            () => {

                if (
                    this.stopped
                ) {

                    return;

                }

                try {

                    if (
                        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
                    ) {

                        onDiagnostic({
                            type:
                                'detection attempt'
                        });

                        const decoded =
                            this.reader.decode(
                                video
                            );

                        const result =
                            normalizeBarcodeResult({
                                adapter:
                                    'zxing',
                                format:
                                    this.normalizeZxingFormat(
                                        decoded.getBarcodeFormat()
                                    ),
                                rawValue:
                                    decoded.getText()
                            });

                        if (
                            result
                        ) {

                            onResult(
                                result
                            );

                            return;

                        }

                    }

                } catch (error) {

                    if (
                        !this.isRetryableDecodeError(
                            error
                        )
                    ) {

                        onDiagnostic({
                            ...this.describeFatalError(
                                error
                            ),
                            errorType:
                                'fatal',
                            type:
                                'detection fatal'
                        });

                        onError(
                            error
                        );

                        return;

                    }

                    onDiagnostic({
                        errorName:
                            this.getErrorName(
                                error
                            ),
                        errorType:
                            this.getDecodeErrorType(
                                error
                            ),
                        type:
                            'detection retryable'
                    });

                }

                if (
                    !this.stopped
                ) {

                    this.scheduleNextScan(
                        scan
                    );

                }

            };

        scan();

    }

    stop() {

        this.stopped =
            true;

        if (
            this.timeoutId
        ) {

            window.clearTimeout(
                this.timeoutId
            );

            this.timeoutId =
                null;

        }

        if (
            this.reader &&
            typeof this.reader.reset === 'function'
        ) {

            this.reader.reset();

        }

        if (
            this.zxing?.BrowserCodeReader?.releaseAllStreams
        ) {

            this.zxing.BrowserCodeReader.releaseAllStreams();

        }

    }

    async loadReader() {

        if (
            this.reader
        ) {

            return;

        }

        try {

            const modules =
                await this.moduleLoader();

            this.zxing =
                modules.browser ?? modules;

            this.zxingLibrary =
                modules.library ?? modules;

        } catch (error) {

            this.lastLoadError =
                error;

            throw error;

        }

        this.reader =
            new this.zxing.BrowserMultiFormatOneDReader(
                undefined,
                {
                    delayBetweenScanAttempts:
                        this.scanIntervalMs,
                    delayBetweenScanSuccess:
                        this.scanIntervalMs
                }
            );

        this.reader.possibleFormats =
            [
                this.zxing.BarcodeFormat.EAN_13,
                this.zxing.BarcodeFormat.UPC_A
            ];

        this.lastLoadError =
            null;

    }

    normalizeZxingFormat(format) {

        return zxingFormatNames.get(
            this.zxing?.BarcodeFormat?.[format] ??
            format
        ) ?? null;

    }

    scheduleNextScan(scan) {

        if (
            this.timeoutId
        ) {

            window.clearTimeout(
                this.timeoutId
            );

        }

        this.timeoutId =
            window.setTimeout(
                () => {

                    this.timeoutId =
                        null;

                    scan();

                },
                this.scanIntervalMs
            );

    }

    isRetryableDecodeError(error) {

        return this.getDecodeErrorType(
            error
        ) !== 'fatal';

    }

    getDecodeErrorType(error) {

        if (
            this.isInstanceOfZxingError(
                error,
                'NotFoundException'
            )
        ) {

            return 'notFound';

        }

        if (
            this.isInstanceOfZxingError(
                error,
                'ChecksumException'
            )
        ) {

            return 'checksum';

        }

        if (
            this.isInstanceOfZxingError(
                error,
                'FormatException'
            )
        ) {

            return 'format';

        }

        return this.getFallbackDecodeErrorType(
            error
        );

    }

    isInstanceOfZxingError(error, className) {

        const ErrorClass =
            this.zxingLibrary?.[className];

        return typeof ErrorClass === 'function' &&
            error instanceof ErrorClass;

    }

    getFallbackDecodeErrorType(error) {

        const errorName =
            this.getErrorName(
                error
            );

        if (
            errorName === 'NotFoundException'
        ) {

            return 'notFound';

        }

        if (
            errorName === 'ChecksumException'
        ) {

            return 'checksum';

        }

        if (
            errorName === 'FormatException'
        ) {

            return 'format';

        }

        return 'fatal';

    }

    describeFatalError(error) {

        return {
            constructorName:
                error?.constructor?.name ?? '',
            errorName:
                error?.name ?? '',
            message:
                this.sanitizeErrorMessage(
                    error?.message
                ),
            objectType:
                Object.prototype.toString.call(
                    error
                )
        };

    }

    sanitizeErrorMessage(message) {

        if (
            typeof message !== 'string'
        ) {

            return '';

        }

        return message.replace(
            /[\r\n\t]+/gu,
            ' '
        ).slice(
            0,
            80
        );

    }

    getErrorName(error) {

        return error?.name === 'NotFoundException' ||
            error?.name === 'ChecksumException' ||
            error?.name === 'FormatException' ?
            error.name :
            error?.constructor?.name ?? '';

    }

}

export function createZxingBarcodeAdapter(options) {

    return new ZxingBarcodeAdapter(
        options
    );

}
