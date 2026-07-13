const {
    expect,
    test,
    withScannerModules
} = require('./camera-test-helpers');

test.describe(
    'camera scanner UI',
    () => {
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
