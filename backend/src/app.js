import Fastify from 'fastify';

import helmet from '@fastify/helmet';
import { isIP } from 'node:net';
import { parseTrustedProxies } from './config/trusted-proxies.js';

const PERMISSIONS_POLICY =
    'geolocation=(), microphone=(), payment=(), usb=()';

export function buildApp({ trustedProxies = process.env.TRUSTED_PROXIES } = {}) {

    const trustProxy = parseTrustedProxies(trustedProxies);
    return Fastify({
        logger: true,
        trustProxy
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

export function registerClientIpValidation(app) {

    // Register after security headers and before routes/rate-limit hooks.
    // Native request.ips is present only when Fastify proxy trust is enabled.
    app.addHook('onRequest', async (request, reply) => {
        if (request.ips !== undefined && (!isIP(request.ip) || request.ip.includes('%'))) {
            return reply.code(400).send({ error: 'Invalid client IP address' });
        }
    });

}
