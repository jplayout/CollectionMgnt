import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildApp } from '../../src/app.js';
import { parseTrustedProxies } from '../../src/config/trusted-proxies.js';
import { createTestApp } from '../helpers/test-app.js';

const require = createRequire(import.meta.url);
const proxyAddr = require('@fastify/proxy-addr');
const LocalStore = require(path.join(path.dirname(require.resolve('@fastify/rate-limit')), 'store/LocalStore.js'));
const PROXY = '192.0.2.10';
const CLIENT = '198.51.100.10';

test('TRUSTED_PROXIES defaults to false and accepts only explicit IPs/canonical CIDRs', () => {
    for (const value of [undefined, '', ' \t ']) assert.equal(parseTrustedProxies(value), false);
    assert.deepEqual(parseTrustedProxies(' 192.0.2.10,192.0.2.0/24,2001:db8::/32,::1,::ffff:192.0.2.10 '),
        ['192.0.2.10', '192.0.2.0/24', '2001:db8::/32', '::1', '::ffff:192.0.2.10']);
});

test('TRUSTED_PROXIES rejects global, numeric, malformed and ambiguous configurations safely', () => {
    const invalid = [null, true, false, 1, [], ['192.0.2.1'], 'true', 'false', '1', '0', '*', 'loopback',
        'uniquelocal', 'localhost', '192.0.2.1:3000', '[::1]', 'fe80::1%eth0', '192.000.2.1',
        '0.0.0.0', '::', '::ffff:0.0.0.0', '::ffff:0:0', '0:0:0:0:0:ffff:0:0',
        '0.0.0.0/0', '::/0', '::/1', '0.0.0.0/1,128.0.0.0/1', '::/1,8000::/1',
        '192.0.2.0/33', '2001:db8::/129', '192.0.2.0/024', '192.0.2.0/-1', '192.0.2.0/24/32',
        '192.0.2.1/24', '2001:db8::1/64', '192.0.2.0/255.255.255.0', '192.0.2.0/',
        ',192.0.2.1', '192.0.2.1,', '192.0.2.1,,192.0.2.2',
        '::ffff:10.0.0.0/8', '::ffff:10.0.0.0/104', '::ffff:c000:200/120',
        '0:0:0:0:0:ffff:c000:200/120', '::ffff:192.0.2.10/128', 'private-value-do-not-echo'];
    for (const value of invalid) {
        assert.throws(() => buildApp({ trustedProxies: value }), error => {
            assert.match(error.message, /^Invalid TRUSTED_PROXIES:/);
            assert.equal(error.message.includes('private-value-do-not-echo'), false);
            return true;
        }, String(value));
    }
});

test('combining accepted CIDRs cannot authorize unspecified addresses or global trust', () => {
    const accepted = ['128.0.0.0/1', '64.0.0.0/2', '32.0.0.0/3',
        '8000::/1', '4000::/2', '2000::/3'];
    for (const entry of accepted) assert.deepEqual(parseTrustedProxies(entry), [entry]);
    const trust = proxyAddr.compile(parseTrustedProxies(accepted.join(',')));
    for (const address of ['0.0.0.0', '::', '::ffff:0.0.0.0', '1.2.3.4', '100::1']) {
        assert.equal(trust(address), false);
    }
    // Completing either whole address family necessarily introduces a zero-base
    // CIDR, which the existing per-entry validation must continue to reject.
    for (const entries of [accepted.concat('0.0.0.0/3'), accepted.concat('::/3'),
        ['0.0.0.0/1', '128.0.0.0/1'], ['::/1', '8000::/1']]) {
        assert.throws(() => parseTrustedProxies(entries.join(',')), /^Error: Invalid TRUSTED_PROXIES:/);
    }

    // These 32 canonical CIDRs cover all IPv4 except 0.0.0.0. A mapped exact
    // spelling of that excluded address must not complete global IPv4 trust.
    const allIPv4ExceptZero = Array.from({ length: 32 }, (_, bit) => {
        const value = 2 ** bit;
        return `${[24, 16, 8, 0].map(shift => (value >>> shift) & 255).join('.')}/${32 - bit}`;
    });
    const ipv4Trust = proxyAddr.compile(parseTrustedProxies(allIPv4ExceptZero.join(',')));
    assert.equal(ipv4Trust('0.0.0.0'), false);
    assert.equal(ipv4Trust('198.51.100.10'), true);
    for (const zero of ['0.0.0.0', '::ffff:0.0.0.0', '::ffff:0:0']) {
        assert.throws(() => parseTrustedProxies([...allIPv4ExceptZero, zero].join(',')), /^Error: Invalid TRUSTED_PROXIES:/);
    }
});

test('production initialization reads the environment and fails before opening application data', () => {
    const dataDir = path.join(tmpdir(), `collectionmgnt-invalid-proxy-${process.pid}`);
    const result = spawnSync(process.execPath, ['src/server.js'], {
        cwd: new URL('../../', import.meta.url),
        env: { ...process.env, TRUSTED_PROXIES: 'private-value-do-not-echo', DATA_DIR: dataDir },
        encoding: 'utf8', timeout: 10000
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Invalid TRUSTED_PROXIES/);
    assert.equal(result.stderr.includes('private-value-do-not-echo'), false);
    assert.equal(existsSync(dataDir), false);
});

test('the resolved proxy-addr fixes CVE-2026-92395 for mapped and zero-leading IPv6 subnets', () => {
    // Exercise the package Fastify actually resolves, rather than a version string.
    const fastifyRequire = createRequire(require.resolve('fastify'));
    assert.equal(fastifyRequire.resolve('@fastify/proxy-addr'), require.resolve('@fastify/proxy-addr'));
    for (const range of ['::ffff:10.0.0.0/8', '::/1']) {
        for (const ranges of [[range], [range, PROXY]]) {
            for (const address of [CLIENT, '::ffff:198.51.100.10']) {
                assert.equal(proxyAddr.compile(ranges)(address), false);
            }
        }
    }
    const trust = proxyAddr.compile(['::ffff:10.0.0.0/104']);
    assert.equal(trust('10.1.2.3'), true);
    assert.equal(trust('198.51.100.10'), false);
});

async function contextFor(t, trustedProxies = '') {
    const observed = [];
    const context = await createTestApp({
        trustedProxies,
        configureApp(app) {
            app.log.level = 'silent';
            app.addHook('onRequest', async request => {
                observed.push({ ip: request.ip, ips: request.ips, host: request.host,
                    hostname: request.hostname, protocol: request.protocol });
            });
        }
    });
    t.after(() => context.close());
    return { ...context, observed };
}

function login(context, remoteAddress, headers = {}, payload = { username: 'unknown-proxy-test', password: 'wrong-password' }) {
    return context.app.inject({ method: 'POST', url: '/api/auth/login', remoteAddress, headers, payload });
}

function assertLimited(response, seconds) {
    assert.equal(response.statusCode, 429);
    assert.equal(response.headers['x-ratelimit-limit'], '5');
    assert.equal(response.headers['x-ratelimit-remaining'], '0');
    const retry = Number(response.headers['retry-after']);
    assert.ok(Number.isInteger(retry) && retry > 0 && retry <= seconds);
}

for (const trustedProxies of ['', PROXY]) {
    test(`direct clients cannot rotate forwarding headers (trust=${trustedProxies || 'disabled'})`, async t => {
        const context = await contextFor(t, trustedProxies);
        for (let i = 0; i < 6; i++) {
            const response = await login(context, CLIENT, {
                'x-forwarded-for': `203.0.113.${i + 1}`, 'x-real-ip': `203.0.113.${i + 1}`,
                forwarded: `for=203.0.113.${i + 1}`, 'x-forwarded-host': 'forged.example',
                'x-forwarded-proto': 'https', host: 'app.example:3000'
            });
            if (i < 5) assert.equal(response.statusCode, 401);
            else assertLimited(response, 300);
        }
        assert.ok(context.observed.every(request => request.ip === CLIENT && request.host === 'app.example:3000' &&
            request.hostname === 'app.example' && request.protocol === 'http'));
    });
}

test('without configuration clients behind a proxy still share the existing quota', async t => {
    const context = await contextFor(t);
    for (let i = 0; i < 6; i++) {
        const response = await login(context, PROXY, { 'x-forwarded-for': `198.51.100.${i + 1}` });
        if (i < 5) assert.equal(response.statusCode, 401);
        else assertLimited(response, 300);
    }
});

for (const [trustedProxies, remoteAddress] of [
    [PROXY, PROXY], ['192.0.2.0/24', '::ffff:192.0.2.10'],
    ['2001:db8:ffff::/64', '2001:db8:ffff::10'], ['::ffff:192.0.2.10', PROXY]
]) {
    test(`trusted proxy ${remoteAddress} isolates clients with ${trustedProxies}`, async t => {
        const context = await contextFor(t, trustedProxies);
        for (let i = 0; i < 5; i++) {
            assert.equal((await login(context, remoteAddress, { 'x-forwarded-for': CLIENT })).statusCode, 401);
        }
        assertLimited(await login(context, remoteAddress, { 'x-forwarded-for': CLIENT }, context.admin), 300);
        const valid = await login(context, remoteAddress, { 'x-forwarded-for': '198.51.100.20' }, context.admin);
        assert.equal(valid.statusCode, 200);
        assert.equal(valid.json().user.password_hash, undefined);
        const me = await context.app.inject({ url: '/api/auth/me', remoteAddress,
            headers: { 'x-forwarded-for': '198.51.100.20', authorization: `Bearer ${valid.json().token}` } });
        assert.equal(me.statusCode, 200);
        assert.equal(me.json().user.role, 'admin');
    });
}

for (const [label, trustedProxies, suffix, expected] of [
    ['forged prefix', PROXY, CLIENT, CLIENT],
    ['trusted chain', `${PROXY},192.0.2.20`, `${CLIENT}, 192.0.2.20`, CLIENT],
    ['mixed chain', PROXY, `${CLIENT}, 192.0.2.20`, '192.0.2.20']
]) {
    test(`${label} stops at the nearest untrusted address`, async t => {
        const context = await contextFor(t, trustedProxies);
        for (let i = 0; i < 6; i++) {
            const response = await login(context, PROXY, { 'x-forwarded-for': `203.0.113.${i + 1}, ${suffix}` });
            if (i < 5) assert.equal(response.statusCode, 401);
            else assertLimited(response, 300);
        }
        assert.ok(context.observed.every(request => request.ip === expected));
        assert.ok(context.observed.every(request => !request.ips.some(ip => ip.startsWith('203.0.113.'))));
    });
}

test('a trusted proxy without XFF falls back to its socket, ignoring alternative IP headers', async t => {
    const context = await contextFor(t, PROXY);
    for (const headers of [{ 'x-real-ip': CLIENT, forwarded: `for=${CLIENT}` },
        { 'x-forwarded-for': '' }, { 'x-forwarded-for': ' , , ' }]) {
        assert.equal((await login(context, PROXY, headers)).statusCode, 401);
    }
    assert.ok(context.observed.every(request => request.ip === PROXY));
    assert.equal((await login(context, PROXY, { 'x-forwarded-for': `not-an-ip, ${CLIENT}` })).statusCode, 401);
    assert.equal(context.observed.at(-1).ip, CLIENT);
});

test('native IPv6 proxy CIDRs never authorize an unrelated IPv4 or mapped peer', async t => {
    const context = await contextFor(t, '2001:db8::/32');
    for (const remoteAddress of [CLIENT, '::ffff:198.51.100.10', '2001:db9::10']) {
        await login(context, remoteAddress, { 'x-forwarded-for': '203.0.113.99',
            'x-forwarded-host': 'forged.example', 'x-forwarded-proto': 'https' });
        const observed = context.observed.at(-1);
        assert.equal(observed.ip, remoteAddress);
        assert.equal(observed.host, 'localhost:80');
        assert.equal(observed.protocol, 'http');
    }
});

test('only trusted peers can supply forwarded host, hostname and protocol', async t => {
    const context = await contextFor(t, PROXY);
    const headers = { host: 'app.example:3000', 'x-forwarded-for': CLIENT,
        'x-forwarded-host': 'ignored.example, public.example:443', 'x-forwarded-proto': 'http, https' };
    await login(context, PROXY, headers);
    assert.deepEqual(context.observed[0], { ip: CLIENT, ips: [PROXY, CLIENT], host: 'public.example:443',
        hostname: 'public.example', protocol: 'https' });
    await login(context, '192.0.2.99', headers);
    assert.deepEqual(context.observed[1], { ip: '192.0.2.99', ips: ['192.0.2.99'], host: 'app.example:3000',
        hostname: 'app.example', protocol: 'http' });
});

for (const [method, url, window] of [
    ['POST', '/api/auth/login', 300], ['GET', '/api/admin/media-audit', 60],
    ['POST', '/api/admin/media-cleanup/preview', 60], ['POST', '/api/admin/media-cleanup/execute', 60]
]) {
    test(`${method} ${url}: invalid client IP keeps security headers without calling LocalStore.incr`, async t => {
        const context = await contextFor(t, PROXY);
        const incr = t.mock.method(LocalStore.prototype, 'incr');
        const token = context.app.jwt.sign({ id: 1, role: 'admin', username: 'admin' });
        const send = ip => context.app.inject({ method, url, remoteAddress: PROXY,
            headers: { 'x-forwarded-for': ip, authorization: `Bearer ${token}` },
            ...(url.endsWith('/login') ? { payload: context.admin } :
                url.endsWith('/execute') ? { payload: { candidateIds: [] } } : {}) });

        for (const ip of ['not-an-ip', '198.51.100.10:1234', '[2001:db8::1]', 'fe80::1%eth0', `${CLIENT}, invalid`]) {
            const response = await send(ip);
            assert.equal(response.statusCode, 400);
            assert.deepEqual(response.json(), { error: 'Invalid client IP address' });
            assert.equal(response.headers['x-content-type-options'], 'nosniff');
            assert.equal(response.headers['x-frame-options'], 'DENY');
            assert.equal(response.headers['referrer-policy'], 'strict-origin-when-cross-origin');
            assert.equal(response.headers['permissions-policy'], 'geolocation=(), microphone=(), payment=(), usb=()');
            assert.equal(response.headers['x-ratelimit-limit'], undefined);
            assert.equal(incr.mock.callCount(), 0);
        }

        // The spy calls the real store: five valid requests must still fit, and
        // the sixth must still hit the original route quota and Retry-After.
        for (let attempt = 0; attempt < 5; attempt++) {
            assert.equal((await send(CLIENT)).statusCode, 200);
            assert.equal(incr.mock.callCount(), attempt + 1);
        }
        assertLimited(await send(CLIENT), window);
        assert.equal(incr.mock.callCount(), 6);
    });
}

for (const [label, addresses, independent] of [
    ['IPv4 and mapped forms', [CLIENT, '::ffff:198.51.100.10', '::ffff:c633:640a'], '198.51.100.11'],
    ['IPv6 canonical forms and /64', ['2001:db8:1:2::1', '2001:0db8:0001:0002:0:0:0:1', '2001:db8:1:2::abcd'], '2001:db8:1:3::1']
]) {
    test(`${label} preserve native rate-limit key normalization`, async t => {
        const context = await contextFor(t, PROXY);
        for (let i = 0; i < 6; i++) {
            const response = await login(context, PROXY, { 'x-forwarded-for': addresses[i % addresses.length] });
            if (i < 5) assert.equal(response.statusCode, 401);
            else assertLimited(response, 300);
        }
        assert.equal((await login(context, PROXY, { 'x-forwarded-for': independent })).statusCode, 401);
    });
}

test('media quotas remain separate, per client, and preserve JWT/admin checks behind proxies', async t => {
    const context = await contextFor(t, PROXY);
    const token = context.app.jwt.sign({ id: 1, role: 'admin', username: 'admin' });
    const headers = { 'x-forwarded-for': CLIENT, authorization: `Bearer ${token}` };
    const routes = [ ['GET', '/api/admin/media-audit'], ['POST', '/api/admin/media-cleanup/preview'],
        ['POST', '/api/admin/media-cleanup/execute'] ];
    for (const [method, url] of routes) {
        for (let i = 0; i < 6; i++) {
            const response = await context.app.inject({ method, url, remoteAddress: PROXY, headers,
                ...(url.endsWith('/execute') ? { payload: { candidateIds: [] } } : {}) });
            if (i < 5) assert.equal(response.statusCode, 200);
            else assertLimited(response, 60);
        }
        assert.equal((await context.app.inject({ method, url, remoteAddress: PROXY,
            headers: { ...headers, 'x-forwarded-for': '198.51.100.20' },
            ...(url.endsWith('/execute') ? { payload: { candidateIds: [] } } : {}) })).statusCode, 200);
        for (const authorization of [undefined, 'Bearer invalid', `Bearer ${context.app.jwt.sign({ id: 1, role: 'user' })}`]) {
            const response = await context.app.inject({ method, url, remoteAddress: PROXY,
                headers: { 'x-forwarded-for': '198.51.100.30', ...(authorization ? { authorization } : {}) } });
            assert.equal(response.statusCode, authorization?.includes('invalid') || !authorization ? 401 : 403);
        }
    }
});
