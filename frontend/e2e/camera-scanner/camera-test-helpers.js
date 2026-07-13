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

module.exports = {
    expect,
    test,
    withScannerModules
};
