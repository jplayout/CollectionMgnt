import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync, spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from 'node:net';
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { createTestApp } from '../helpers/test-app.js';

function request(port, localAddress, url = '/api/auth/login', headers = {}, payload) {
    return new Promise((resolve, reject) => {
        // A flat raw-header array makes Node emit separate HTTP header lines;
        // do not join repeated XFF values before sending them over the socket.
        const rawHeaders = ['Host', 'app.example',
            ...(Array.isArray(headers) ? headers : Object.entries(headers).flat()),
            ...(payload ? ['Content-Type', 'application/json'] : [])];
        const req = http.request({ host: '127.0.0.1', port, localAddress, path: url,
            method: payload ? 'POST' : 'GET', headers: rawHeaders }, response => {
            let body = '';
            response.setEncoding('utf8');
            response.on('data', chunk => { body += chunk; });
            response.on('end', () => resolve({ statusCode: response.statusCode, headers: response.headers, body }));
        });
        req.setTimeout(2000, () => req.destroy(new Error('Local proxy request timed out')));
        req.on('error', reject);
        req.end(payload ? JSON.stringify(payload) : undefined);
    });
}

test('real nginx preserves client isolation and sanitizes forwarding headers on actual login/JWT routes',
    { timeout: 30000 }, async t => {
        const engine = process.env.CONTAINER_ENGINE ?? 'podman';
        assert.ok(['podman', 'docker'].includes(engine));
        const observed = [];
        const context = await createTestApp({ trustedProxies: '127.0.0.1', configureApp(app) {
            app.log.level = 'silent';
            app.addHook('onRequest', async req => {
                observed.push({ peer: req.raw.socket.remoteAddress, ip: req.ip, host: req.host,
                    hostname: req.hostname, protocol: req.protocol, xff: req.headers['x-forwarded-for'],
                    xffHeaderCount: req.raw.rawHeaders.filter((value, index) =>
                        index % 2 === 0 && value.toLowerCase() === 'x-forwarded-for').length });
            });
        } });
        const directory = await mkdtemp(path.join(tmpdir(), 'collectionmgnt-nginx-test-'));
        const name = `collectionmgnt-proxy-test-${randomUUID()}`;
        let container;
        t.after(async () => {
            try {
                if (container) execFileSync(engine, ['rm', '--force', name], { stdio: 'pipe', timeout: 10000 });
            } finally {
                await context.close();
                await rm(directory, { recursive: true, force: true });
            }
        });
        await context.app.listen({ host: '127.0.0.1', port: 0 });
        const backendPort = context.app.server.address().port;
        const reservation = createServer();
        await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
        const frontendPort = reservation.address().port;
        await new Promise(resolve => reservation.close(resolve));
        const source = await readFile(new URL('../../../frontend/nginx.conf', import.meta.url), 'utf8');
        const config = source.replace('listen 80;', `listen 127.0.0.1:${frontendPort};`)
            .replace('http://backend:3000/api/', `http://127.0.0.1:${backendPort}/api/`);
        assert.notEqual(config, source);
        const configFile = path.join(directory, 'default.conf');
        await writeFile(configFile, config);
        const dockerfile = await readFile(new URL('../../../frontend/Dockerfile', import.meta.url), 'utf8');
        const image = dockerfile.match(/^FROM (nginx:\S+)/m)[1];
        // No image pulls, builds, production volumes, or external HTTP services.
        container = spawn(engine, ['run', '--rm', '--pull=never', '--name', name, '--network=host',
            '-v', `${configFile}:/etc/nginx/conf.d/default.conf:ro,Z`, image], { stdio: ['ignore', 'pipe', 'pipe'] });
        let output = '';
        let launchError;
        container.on('error', error => { launchError = error; });
        for (const stream of [container.stdout, container.stderr]) {
            stream.on('data', chunk => { output = (output + chunk).slice(-4000); });
        }
        let ready = false;
        for (let attempt = 0; attempt < 100; attempt++) {
            if (launchError || container.exitCode !== null) break;
            try {
                if ((await request(frontendPort, '127.0.0.2', '/')).statusCode === 200) { ready = true; break; }
            } catch { /* Wait only for this isolated local nginx listener. */ }
            await delay(100);
        }
        assert.ok(ready, `Local nginx failed to start: ${launchError?.message ?? output}`);
        const invalid = { username: 'unknown-network-test', password: 'wrong-password' };
        for (let i = 0; i < 6; i++) {
            const response = await request(frontendPort, '127.0.0.2', '/api/auth/login', {
                'x-forwarded-for': `203.0.113.${i + 1}`, 'x-real-ip': '203.0.113.99',
                'x-forwarded-host': 'forged.example', 'x-forwarded-proto': 'https'
            }, invalid);
            assert.equal(response.statusCode, i < 5 ? 401 : 429);
            if (i === 5) assert.ok(Number(response.headers['retry-after']) > 0);
        }
        const other = await request(frontendPort, '127.0.0.3', '/api/auth/login', {}, context.admin);
        assert.equal(other.statusCode, 200);
        const token = JSON.parse(other.body).token;
        assert.equal((await request(frontendPort, '127.0.0.3', '/api/auth/me',
            { authorization: `Bearer ${token}` })).statusCode, 200);
        // The backend is deliberately reachable: a non-allowlisted direct peer
        // cannot gain proxy privileges even though another peer is trusted.
        for (let i = 0; i < 6; i++) {
            const direct = await request(backendPort, '127.0.0.4', '/api/auth/login',
                { 'x-forwarded-for': `203.0.113.${i + 1}` }, invalid);
            assert.equal(direct.statusCode, i < 5 ? 401 : 429);
        }
        const proxied = observed.filter(req => req.peer === '127.0.0.1');
        assert.equal(proxied.length, 8);
        assert.ok(proxied.some(req => req.ip === '127.0.0.2' && req.xff === '203.0.113.1, 127.0.0.2'));
        assert.ok(proxied.every(req => req.host === 'app.example' && req.hostname === 'app.example' && req.protocol === 'http'),
            'nginx must normalize forwarded host and protocol before Fastify trusts it');
        assert.ok(observed.filter(req => req.peer === '127.0.0.4').every(req => req.ip === '127.0.0.4'));

        for (const [label, port, client] of [
            ['through nginx', frontendPort, '127.0.0.5'],
            ['directly to an untrusted backend peer', backendPort, '127.0.0.6']
        ]) {
            await t.test(`repeated XFF ${label} cannot rotate the effective client's quota`, async () => {
                const start = observed.length;
                for (let i = 0; i < 6; i++) {
                    const response = await request(port, client, '/api/auth/login', [
                        'X-Forwarded-For', `203.0.113.${i + 1}`,
                        'X-Forwarded-For', `malformed-prefix-${i + 1}`
                    ], invalid);
                    assert.equal(response.statusCode, i < 5 ? 401 : 429);
                    if (i === 5) assert.ok(Number(response.headers['retry-after']) > 0);
                }
                const requests = observed.slice(start);
                assert.equal(requests.length, 6);
                assert.ok(requests.every(req => req.ip === client));
                if (port === frontendPort) {
                    assert.ok(requests.every(req => req.xffHeaderCount === 1 && req.xff.split(',').at(-1).trim() === client));
                    assert.ok(requests[0].xff.includes('203.0.113.1') && requests[0].xff.includes('malformed-prefix-1'));
                } else {
                    assert.ok(requests.every(req => req.xffHeaderCount === 2), 'Node must actually receive two XFF header lines');
                }
            });
        }
    });
