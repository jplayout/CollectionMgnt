import {
    MVP_BARCODE_FORMATS,
    normalizeBarcodeResult
} from './formats.js';

const defaultScanIntervalMs =
    250;

export class NativeBarcodeAdapter {

    constructor({
        barcodeDetectorClass =
            globalThis.BarcodeDetector,
        scanIntervalMs =
            defaultScanIntervalMs
    } = {}) {

        this.barcodeDetectorClass =
            barcodeDetectorClass;

        this.scanIntervalMs =
            scanIntervalMs;

        this.detector =
            null;

        this.timeoutId =
            null;

        this.stopped =
            true;

    }

    async isSupported() {

        if (
            typeof this.barcodeDetectorClass !== 'function' ||
            typeof this.barcodeDetectorClass.getSupportedFormats !== 'function'
        ) {

            return false;

        }

        let supportedFormats;

        try {

            supportedFormats =
                await this.barcodeDetectorClass.getSupportedFormats();

        } catch {

            return false;

        }

        if (
            !MVP_BARCODE_FORMATS.every(
                format => supportedFormats.includes(
                    format
                )
            )
        ) {

            return false;

        }

        try {

            this.detector =
                new this.barcodeDetectorClass({
                    formats:
                        MVP_BARCODE_FORMATS
                });

        } catch {

            return false;

        }

        return true;

    }

    async start({
        onDiagnostic = () => {},
        onError,
        onResult,
        video
    }) {

        if (
            !this.detector
        ) {

            const supported =
                await this.isSupported();

            if (
                !supported
            ) {

                throw new Error(
                    'BARCODE_DETECTOR_UNSUPPORTED'
                );

            }

        }

        this.stopped =
            false;

        const scan =
            async () => {

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

                        const results =
                            await this.detector.detect(
                                video
                            );

                        if (
                            this.stopped
                        ) {

                            return;

                        }

                        const result =
                            normalizeBarcodeResult({
                                adapter:
                                    'native',
                                format:
                                    results?.[0]?.format,
                                rawValue:
                                    results?.[0]?.rawValue
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

                    onError(
                        error
                    );

                    return;

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

    }

}

export function createNativeBarcodeAdapter(options) {

    return new NativeBarcodeAdapter(
        options
    );

}
