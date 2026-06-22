import Fastify from 'fastify';

import helmet from '@fastify/helmet';

const PERMISSIONS_POLICY =
    'geolocation=(), microphone=(), payment=(), usb=()';

export function buildApp() {

    return Fastify({
        logger: true
    });

}

export async function registerSecurityHeaders(app) {

    await app.register(
        helmet,
        {
            contentSecurityPolicy:
                false,
            crossOriginEmbedderPolicy:
                false,
            crossOriginOpenerPolicy:
                false,
            crossOriginResourcePolicy:
                false,
            frameguard: {
                action:
                    'deny'
            },
            hsts:
                false,
            originAgentCluster:
                false,
            referrerPolicy: {
                policy:
                    'strict-origin-when-cross-origin'
            }
        }
    );

    app.addHook(
        'onRequest',
        async (
            _request,
            reply
        ) => {

            reply.header(
                'Permissions-Policy',
                PERMISSIONS_POLICY
            );

        }
    );

}
