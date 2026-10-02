#!/usr/bin/env node
import { appendFileSync } from 'node:fs';
import { getBuildInfo } from '../backend/src/config/build-info.js';

const info = getBuildInfo({
    allowGit: true,
    allowMissing: false,
    revision: process.env.APP_REVISION ?? process.env.GITHUB_SHA
});
if (process.argv.includes('--github-output')) {
    if (!process.env.GITHUB_OUTPUT) {
        throw new Error('GITHUB_OUTPUT is required.');
    }
    appendFileSync(process.env.GITHUB_OUTPUT, `version=${info.version}\nrevision=${info.revision}\n`);
} else {
    console.log(JSON.stringify(info));
}
