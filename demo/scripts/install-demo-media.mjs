#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DATASET = path.resolve(
    SCRIPT_DIR,
    '../datasets/collectionmgnt-demo-v1.json'
);

const IMAGE_WIDTH = 800;
const IMAGE_HEIGHT = 600;

const COLLECTION_LABELS = {
    books: 'LIVRES',
    consoles: 'CONSOLES',
    games: 'JEUX VIDEO',
    movies: 'FILMS',
    others: 'OBJETS'
};

const FIELD_BY_PLUGIN = {
    books: ['author', 'genre', 'publisher'],
    consoles: ['manufacturer', 'type', 'region'],
    games: ['platform', 'genre', 'publisher'],
    movies: ['director', 'genre', 'format'],
    others: ['category', 'maker', 'location']
};

const FONT = {
    ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
    '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
    '&': ['01100', '10010', '10100', '01000', '10101', '10010', '01101'],
    '(': ['00010', '00100', '01000', '01000', '01000', '00100', '00010'],
    ')': ['01000', '00100', '00010', '00010', '00010', '00100', '01000'],
    '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
    ',': ['00000', '00000', '00000', '00000', '00000', '00100', '01000'],
    '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
    '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
    '/': ['00001', '00010', '00100', '01000', '10000', '00000', '00000'],
    ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
    '=': ['00000', '11111', '00000', '11111', '00000', '00000', '00000'],
    '@': ['01110', '10001', '10111', '10101', '10111', '10000', '01110'],
    '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
    '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
    '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
    '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
    '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
    '5': ['11111', '10000', '10000', '11110', '00001', '00001', '11110'],
    '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
    '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
    '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
    '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
    A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
    B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
    C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
    D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
    E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
    F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
    G: ['01110', '10001', '10000', '10111', '10001', '10001', '01110'],
    H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
    I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
    J: ['00111', '00010', '00010', '00010', '10010', '10010', '01100'],
    K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
    L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
    M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
    N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
    O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
    P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
    Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
    R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
    S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
    T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
    U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
    V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
    W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
    X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
    Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
    Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111']
};

main().catch(error => {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
});

async function main() {
    const options = parseArgs(process.argv.slice(2));

    if (options.help) {
        printUsage();
        return;
    }

    validateOptions(options);

    const dataset = await readDataset(options.dataset);
    const token = await login(options);
    const importReport = await importDataset(options, token);
    const createdItems = Array.isArray(importReport.createdItems)
        ? importReport.createdItems
        : [];

    const sourceItems = indexDatasetItems(dataset);
    const summary = {
        errors: [],
        imagesSkipped: 0,
        imagesUploaded: 0,
        itemsImported: createdItems.length
    };

    for (const createdItem of createdItems) {
        await processCreatedItem({
            createdItem,
            options,
            sourceItems,
            summary,
            token
        });
    }

    printSummary(summary);

    if (summary.errors.length > 0) {
        process.exitCode = 1;
    }
}

function parseArgs(args) {
    const options = {
        baseUrl: null,
        dataset: DEFAULT_DATASET,
        force: false,
        help: false,
        password: null,
        skipExisting: false,
        username: null
    };

    for (let index = 0; index < args.length; index += 1) {
        const arg = args[index];

        if (arg === '--help' || arg === '-h') {
            options.help = true;
            continue;
        }

        if (arg === '--skip-existing') {
            options.skipExisting = true;
            continue;
        }

        if (arg === '--force') {
            options.force = true;
            continue;
        }

        const [name, inlineValue] = arg.split('=', 2);

        if (!name.startsWith('--')) {
            throw new Error(`Unexpected argument: ${arg}`);
        }

        const key = name.slice(2);
        const value = inlineValue ?? args[index + 1];

        if (inlineValue === undefined) {
            index += 1;
        }

        if (!value || value.startsWith('--')) {
            throw new Error(`Missing value for ${name}`);
        }

        if (key === 'base-url') {
            options.baseUrl = value;
        } else if (key === 'dataset') {
            options.dataset = path.resolve(value);
        } else if (key === 'password') {
            options.password = value;
        } else if (key === 'username') {
            options.username = value;
        } else {
            throw new Error(`Unknown option: ${name}`);
        }
    }

    return options;
}

function validateOptions(options) {
    if (!options.baseUrl) {
        throw new Error('--base-url is required');
    }

    if (!options.username) {
        throw new Error('--username is required');
    }

    if (!options.password) {
        throw new Error('--password is required');
    }

    if (options.force && options.skipExisting) {
        throw new Error('--force and --skip-existing cannot be used together');
    }

    options.baseUrl = options.baseUrl.replace(/\/+$/, '');
}

function printUsage() {
    console.log(`Usage:
node demo/scripts/install-demo-media.mjs \\
  --base-url http://localhost:3000 \\
  --username admin \\
  --password '<password>' \\
  [--dataset demo/datasets/collectionmgnt-demo-v1.json] \\
  [--skip-existing] [--force]

The script imports the demo dataset in add_only mode, generates one PNG image
for each imported item, then uploads it through the existing media API.`);
}

async function readDataset(datasetPath) {
    const content = await fs.readFile(datasetPath, 'utf8');
    const dataset = JSON.parse(content);

    if (
        dataset.format !== 'collectionmgnt.native-export' ||
        dataset.format_version !== 1 ||
        !Array.isArray(dataset.collections)
    ) {
        throw new Error('Dataset must be a CollectionMgnt native export v1');
    }

    return dataset;
}

async function login(options) {
    const response = await fetchJson(
        `${options.baseUrl}/api/auth/login`,
        {
            body: JSON.stringify({
                password: options.password,
                username: options.username
            }),
            headers: {
                'content-type': 'application/json'
            },
            method: 'POST'
        }
    );

    if (!response.token) {
        throw new Error('Login response did not include a token');
    }

    return response.token;
}

async function importDataset(options, token) {
    const buffer = await fs.readFile(options.dataset);
    const form = new FormData();

    form.append(
        'file',
        new Blob([buffer], { type: 'application/json' }),
        path.basename(options.dataset)
    );

    return fetchJson(
        `${options.baseUrl}/api/admin/imports/native-json`,
        {
            body: form,
            headers: authHeaders(token),
            method: 'POST'
        }
    );
}

function indexDatasetItems(dataset) {
    const items = new Map();

    for (const collection of dataset.collections) {
        for (const item of collection.items) {
            items.set(
                getDatasetItemKey(collection.plugin, item.source_id),
                {
                    ...item,
                    plugin: collection.plugin,
                    pluginName: collection.plugin_name
                }
            );
        }
    }

    return items;
}

async function processCreatedItem({
    createdItem,
    options,
    sourceItems,
    summary,
    token
}) {
    const itemId = Number(createdItem.new_id);

    if (!Number.isInteger(itemId) || itemId <= 0) {
        summary.errors.push(
            `Missing new_id for ${createdItem.plugin}/${createdItem.source_id}`
        );
        return;
    }

    const sourceItem = sourceItems.get(
        getDatasetItemKey(createdItem.plugin, createdItem.source_id)
    );

    if (!sourceItem) {
        summary.errors.push(
            `Dataset item not found for ${createdItem.plugin}/${createdItem.source_id}`
        );
        return;
    }

    if (options.skipExisting && !options.force) {
        const existingMedia = await fetchJson(
            `${options.baseUrl}/api/items/${itemId}/media`,
            {
                headers: authHeaders(token),
                method: 'GET'
            }
        );

        if (Array.isArray(existingMedia) && existingMedia.length > 0) {
            summary.imagesSkipped += 1;
            return;
        }
    }

    const image = createDemoImage(sourceItem);
    const form = new FormData();

    form.append(
        'item_id',
        String(itemId)
    );

    form.append(
        'is_primary',
        'true'
    );

    form.append(
        'file',
        new Blob([image], { type: 'image/png' }),
        `${sourceItem.plugin}-${createdItem.source_id}.png`
    );

    await fetchJson(
        `${options.baseUrl}/api/media`,
        {
            body: form,
            headers: authHeaders(token),
            method: 'POST'
        }
    );

    summary.imagesUploaded += 1;
}

function createDemoImage(item) {
    const seed = hashString(`${item.plugin}:${item.source_id}:${item.title}`);
    const background = hslToRgb(seed % 360, 58, 38);
    const accent = hslToRgb((seed + 54) % 360, 72, 62);
    const accentDark = hslToRgb((seed + 180) % 360, 46, 24);
    const image = new RgbaImage(IMAGE_WIDTH, IMAGE_HEIGHT);

    image.fill(background);
    image.drawRect(0, 0, IMAGE_WIDTH, 96, accentDark);
    image.drawRect(0, IMAGE_HEIGHT - 72, IMAGE_WIDTH, 72, accentDark);

    for (let i = 0; i < 9; i += 1) {
        const x = (seed + i * 97) % IMAGE_WIDTH;
        const y = 120 + ((seed >> (i % 8)) + i * 53) % 330;
        const size = 42 + ((seed >> (i % 12)) % 80);
        image.drawRect(x - size / 2, y - size / 2, size, size, [
            accent[0],
            accent[1],
            accent[2],
            60
        ]);
    }

    image.drawRect(56, 142, IMAGE_WIDTH - 112, 292, [255, 255, 255, 218]);
    image.drawRect(56, 142, 10, 292, accent);

    image.drawText(
        COLLECTION_LABELS[item.plugin] ?? item.plugin.toUpperCase(),
        72,
        36,
        4,
        [255, 255, 255, 255]
    );

    const titleLines = wrapText(normalizeText(item.title), 22, 3);
    titleLines.forEach((line, index) => {
        image.drawText(
            line,
            88,
            182 + index * 56,
            5,
            [28, 34, 44, 255]
        );
    });

    const metadataLines = getMetadataLines(item);
    metadataLines.forEach((line, index) => {
        image.drawText(
            normalizeText(line),
            88,
            378 + index * 30,
            2,
            [54, 64, 78, 255]
        );
    });

    image.drawText(
        `SOURCE ${item.source_id}`,
        72,
        548,
        2,
        [255, 255, 255, 255]
    );

    image.drawText(
        'COLLECTIONMGNT DEMO',
        452,
        548,
        2,
        [255, 255, 255, 255]
    );

    return encodePng(image);
}

function getMetadataLines(item) {
    const fields = FIELD_BY_PLUGIN[item.plugin] ?? [];

    return fields
        .map(field => item.metadata?.[field])
        .filter(value => value !== undefined && value !== null && value !== '')
        .map(String)
        .slice(0, 3);
}

class RgbaImage {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.pixels = Buffer.alloc(width * height * 4);
    }

    fill(color) {
        this.drawRect(0, 0, this.width, this.height, color);
    }

    drawRect(x, y, width, height, color) {
        const startX = Math.max(0, Math.floor(x));
        const startY = Math.max(0, Math.floor(y));
        const endX = Math.min(this.width, Math.ceil(x + width));
        const endY = Math.min(this.height, Math.ceil(y + height));
        const alpha = color[3] ?? 255;

        for (let row = startY; row < endY; row += 1) {
            for (let column = startX; column < endX; column += 1) {
                this.setPixel(column, row, color, alpha);
            }
        }
    }

    drawText(text, x, y, scale, color) {
        let cursorX = x;

        for (const char of text) {
            const glyph = FONT[char] ?? FONT[' '];
            this.drawGlyph(glyph, cursorX, y, scale, color);
            cursorX += 6 * scale;
        }
    }

    drawGlyph(glyph, x, y, scale, color) {
        glyph.forEach((row, rowIndex) => {
            [...row].forEach((pixel, columnIndex) => {
                if (pixel === '1') {
                    this.drawRect(
                        x + columnIndex * scale,
                        y + rowIndex * scale,
                        scale,
                        scale,
                        color
                    );
                }
            });
        });
    }

    setPixel(x, y, color, alpha) {
        const offset = (y * this.width + x) * 4;
        const targetAlpha = alpha / 255;
        const inverseAlpha = 1 - targetAlpha;

        this.pixels[offset] = Math.round(
            color[0] * targetAlpha + this.pixels[offset] * inverseAlpha
        );
        this.pixels[offset + 1] = Math.round(
            color[1] * targetAlpha + this.pixels[offset + 1] * inverseAlpha
        );
        this.pixels[offset + 2] = Math.round(
            color[2] * targetAlpha + this.pixels[offset + 2] * inverseAlpha
        );
        this.pixels[offset + 3] = 255;
    }
}

function encodePng(image) {
    const stride = image.width * 4;
    const raw = Buffer.alloc((stride + 1) * image.height);

    for (let row = 0; row < image.height; row += 1) {
        const rawOffset = row * (stride + 1);
        const pixelOffset = row * stride;
        raw[rawOffset] = 0;
        image.pixels.copy(raw, rawOffset + 1, pixelOffset, pixelOffset + stride);
    }

    const header = Buffer.alloc(13);
    header.writeUInt32BE(image.width, 0);
    header.writeUInt32BE(image.height, 4);
    header[8] = 8;
    header[9] = 6;
    header[10] = 0;
    header[11] = 0;
    header[12] = 0;

    return Buffer.concat([
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        pngChunk('IHDR', header),
        pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
        pngChunk('IEND', Buffer.alloc(0))
    ]);
}

function pngChunk(type, data) {
    const typeBuffer = Buffer.from(type, 'ascii');
    const length = Buffer.alloc(4);
    const crc = Buffer.alloc(4);

    length.writeUInt32BE(data.length, 0);
    crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);

    return Buffer.concat([
        length,
        typeBuffer,
        data,
        crc
    ]);
}

function crc32(buffer) {
    let crc = 0xffffffff;

    for (const byte of buffer) {
        crc ^= byte;

        for (let bit = 0; bit < 8; bit += 1) {
            crc = crc & 1
                ? (crc >>> 1) ^ 0xedb88320
                : crc >>> 1;
        }
    }

    return (crc ^ 0xffffffff) >>> 0;
}

function wrapText(text, maxLength, maxLines) {
    const words = text.split(/\s+/).filter(Boolean);
    const lines = [];
    let currentLine = '';

    for (const word of words) {
        const nextLine = currentLine ? `${currentLine} ${word}` : word;

        if (nextLine.length > maxLength && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = nextLine;
        }

        if (lines.length === maxLines) {
            break;
        }
    }

    if (currentLine && lines.length < maxLines) {
        lines.push(currentLine);
    }

    if (lines.length === 0) {
        lines.push(text.slice(0, maxLength));
    }

    return lines.map(line => line.slice(0, maxLength));
}

function normalizeText(text) {
    return String(text)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[’']/g, '')
        .replace(/["]/g, '')
        .replace(/[^A-Za-z0-9 !&()+,./:=@-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();
}

function hslToRgb(hue, saturation, lightness) {
    const s = saturation / 100;
    const l = lightness / 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
    const m = l - c / 2;
    const [r, g, b] = hue < 60
        ? [c, x, 0]
        : hue < 120
            ? [x, c, 0]
            : hue < 180
                ? [0, c, x]
                : hue < 240
                    ? [0, x, c]
                    : hue < 300
                        ? [x, 0, c]
                        : [c, 0, x];

    return [
        Math.round((r + m) * 255),
        Math.round((g + m) * 255),
        Math.round((b + m) * 255),
        255
    ];
}

function hashString(value) {
    let hash = 2166136261;

    for (const char of value) {
        hash ^= char.codePointAt(0);
        hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
}

function getDatasetItemKey(plugin, sourceId) {
    return `${plugin}:${sourceId}`;
}

async function fetchJson(url, options) {
    const response = await fetch(url, options);
    const text = await response.text();
    const body = text ? JSON.parse(text) : {};

    if (!response.ok) {
        throw new Error(
            `${options.method ?? 'GET'} ${url} failed with ${response.status}: ${body.error ?? text}`
        );
    }

    return body;
}

function authHeaders(token) {
    return {
        authorization: `Bearer ${token}`
    };
}

function printSummary(summary) {
    console.log('Demo media installation summary');
    console.log(`Items imported: ${summary.itemsImported}`);
    console.log(`Images uploaded: ${summary.imagesUploaded}`);
    console.log(`Images skipped: ${summary.imagesSkipped}`);
    console.log(`Errors: ${summary.errors.length}`);

    for (const error of summary.errors) {
        console.log(`- ${error}`);
    }
}
