import { isIP } from 'node:net';

const CONFIG_ERROR = 'Invalid TRUSTED_PROXIES: use a comma-separated list of explicit IPs or canonical CIDRs; global ranges, mapped IPv6 CIDRs, hostnames and hop counts are not allowed';

function addressBits(address, family) {

    if (family === 4) {
        return address.split('.').reduce((bits, octet) => (bits << 8n) | BigInt(octet), 0n);
    }

    // WHATWG URL canonicalizes every valid, unscoped IPv6 spelling, including
    // dotted IPv4 tails. Only configuration addresses are parsed here, never XFF.
    const normalized = new URL(`http://[${address}]/`).hostname.slice(1, -1);
    const [head, tail = ''] = normalized.split('::');
    const left = head ? head.split(':') : [];
    const right = tail ? tail.split(':') : [];
    const groups = [...left, ...Array(8 - left.length - right.length).fill('0'), ...right];

    return groups.reduce((bits, group) => (bits << 16n) | BigInt(`0x${group}`), 0n);

}

export function parseTrustedProxies(value) {

    if (value === undefined || value === '') return false;
    if (typeof value !== 'string') throw new Error(CONFIG_ERROR);
    if (value.trim() === '') return false;

    const entries = value.split(',').map(entry => entry.trim());

    for (const entry of entries) {
        const parts = entry.split('/');
        const [address, prefix] = parts;
        const family = address.includes('%') ? 0 : isIP(address);
        const width = family === 4 ? 32 : 128;

        if (!family || parts.length > 2 ||
            (prefix !== undefined && (!/^[1-9]\d{0,2}$/.test(prefix) || Number(prefix) > width))) {
            throw new Error(CONFIG_ERROR);
        }

        const bits = addressBits(address, family);
        const hostMask = (1n << BigInt(width - Number(prefix ?? width))) - 1n;

        // Reject every mapped CIDR, including hex spellings and /128. Plain
        // IPv4 expresses the intended range without the CVE-2026-92395 ambiguity.
        // Include the mapped spelling of IPv4 zero: otherwise that exact IP
        // could complete a union of CIDRs covering every other IPv4 address.
        // No accepted range may include either family's unspecified address.
        if (bits === 0n || bits === 0xffff00000000n || (bits & hostMask) !== 0n ||
            (prefix !== undefined && family === 6 && (bits >> 32n) === 0xffffn)) {
            throw new Error(CONFIG_ERROR);
        }

    }

    return [...new Set(entries)];

}
