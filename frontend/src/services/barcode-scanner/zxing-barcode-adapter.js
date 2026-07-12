import {
    normalizeBarcodeResult
} from './formats.js';

const defaultScanIntervalMs =
    300;

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
            () => import(
                '@zxing/browser'
            ),
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
                        !this.isNotFoundError(
                            error
                        )
                    ) {

                        onError(
                            error
                        );

                        return;

                    }

                }

                this.timeoutId =
                    window.setTimeout(
                        scan,
                        this.scanIntervalMs
                    );

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

            this.zxing =
                await this.moduleLoader();

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

    isNotFoundError(error) {

        return error?.name === 'NotFoundException' ||
            error?.constructor?.name === 'NotFoundException';

    }

}

export function createZxingBarcodeAdapter(options) {

    return new ZxingBarcodeAdapter(
        options
    );

}
