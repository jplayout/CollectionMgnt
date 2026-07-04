#!/usr/bin/env node

import { execFileSync } from 'node:child_process';

const DOCS_EXCEPTION_HELP = 'Add "Docs impact: none - <reason>" to the PR body when no documentation update is needed.';

const args = parseArgs(process.argv.slice(2));
const title = args.title ?? process.env.PR_TITLE ?? '';
const body = args.body ?? process.env.PR_BODY ?? '';
const files = args.files.length > 0 ? args.files : getChangedFiles();

const changed = new Set(files);
const errors = [];
const notes = [];

const exception = parseDocsException(body);
if (exception.present && !exception.valid) {
  errors.push([
    'Invalid documentation exception.',
    'The PR body contains a documentation exception without a reason.',
    DOCS_EXCEPTION_HELP,
  ]);
}

if (exception.valid) {
  notes.push(`Documentation exception used: ${exception.reason}`);
}

const hasException = exception.valid;

const applicationFiles = files.filter(isApplicationCode);
if (title.startsWith('feat:') && applicationFiles.length > 0 && !hasException) {
  requireDocs({
    label: 'Feature PR with application code changes',
    files: applicationFiles,
    expectedDocs: ['docs/current-state.md', 'docs/roadmap.md'],
    mode: 'all',
  });
}

if (title.startsWith('docs:')) {
  const codeFiles = files.filter((file) => file.startsWith('backend/') || file.startsWith('frontend/'));
  if (codeFiles.length > 0) {
    errors.push([
      'Documentation PR modifies backend or frontend files.',
      formatFiles(codeFiles),
      'Use a non-docs PR prefix when changing application code.',
    ]);
  }
}

checkPathRule({
  label: 'GitHub workflow changes',
  match: (file) => file.startsWith('.github/workflows/'),
  expectedDocs: ['docs/github-governance.md', 'docs/ci-testing.md'],
});

checkPathRule({
  label: 'Acquisition backend changes',
  match: (file) => file.startsWith('backend/src/acquisition/'),
  expectedDocs: ['docs/acquisition-providers.md', 'docs/assisted-acquisition.md'],
});

checkPathRule({
  label: 'Database changes',
  match: (file) => file.startsWith('backend/src/database/') || file === 'backend/src/database/schema.sql',
  expectedDocs: ['docs/database-schema.md'],
});

checkPathRule({
  label: 'Media service changes',
  match: (file) => file === 'backend/src/services/media-service.js' || file.startsWith('backend/src/media/'),
  expectedDocs: ['docs/media-management.md'],
});

checkPathRule({
  label: 'Plugin changes',
  match: (file) => file.startsWith('backend/plugins/'),
  expectedDocs: ['docs/plugin-api.md', 'docs/current-state.md'],
});

for (const note of notes) {
  console.log(note);
}

if (errors.length > 0) {
  console.error('Documentation & Architecture gate failed.');
  console.error();
  for (const [index, lines] of errors.entries()) {
    console.error(`${index + 1}. ${lines[0]}`);
    for (const line of lines.slice(1)) {
      console.error(line);
    }
    console.error();
  }
  process.exit(1);
}

console.log('Documentation & Architecture gate passed.');

function checkPathRule({ label, match, expectedDocs }) {
  const matchedFiles = files.filter(match);
  if (matchedFiles.length === 0 || hasException) {
    return;
  }

  requireDocs({
    label,
    files: matchedFiles,
    expectedDocs,
    mode: 'any',
  });
}

function requireDocs({ label, files: matchedFiles, expectedDocs, mode }) {
  const hasDocs =
    mode === 'all'
      ? expectedDocs.every((doc) => changed.has(doc))
      : expectedDocs.some((doc) => changed.has(doc));

  if (hasDocs) {
    return;
  }

  const expected = mode === 'all' ? expectedDocs.join(' and ') : expectedDocs.join(' or ');
  errors.push([
    `${label} require documentation updates.`,
    formatFiles(matchedFiles),
    `Expected documentation: ${expected}.`,
    DOCS_EXCEPTION_HELP,
  ]);
}

function getChangedFiles() {
  if (process.env.CHANGED_FILES) {
    return splitFiles(process.env.CHANGED_FILES);
  }

  const baseRef = process.env.BASE_REF;
  if (!baseRef) {
    console.error('Unable to determine changed files: BASE_REF or CHANGED_FILES is required.');
    process.exit(1);
  }

  const output = execFileSync('git', ['diff', '--name-only', `origin/${baseRef}...HEAD`], {
    encoding: 'utf8',
  });
  return splitFiles(output);
}

function parseArgs(rawArgs) {
  const parsed = {
    title: undefined,
    body: undefined,
    files: [],
  };

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    const next = rawArgs[index + 1];

    if (arg === '--title') {
      parsed.title = next ?? '';
      index += 1;
      continue;
    }

    if (arg === '--body') {
      parsed.body = next ?? '';
      index += 1;
      continue;
    }

    if (arg === '--file') {
      if (next) {
        parsed.files.push(next);
      }
      index += 1;
      continue;
    }

    if (arg === '--files') {
      parsed.files.push(...splitFiles(next ?? ''));
      index += 1;
    }
  }

  return parsed;
}

function parseDocsException(prBody) {
  const match = prBody.match(/^Docs impact:\s*none(?:\s*-\s*(.*))?$/im);
  if (!match) {
    return { present: false, valid: false, reason: '' };
  }

  const reason = (match[1] ?? '').trim();
  return {
    present: true,
    valid: reason.length > 0,
    reason,
  };
}

function splitFiles(value) {
  return value
    .split(/\r?\n|,/)
    .map((file) => file.trim())
    .filter(Boolean);
}

function isApplicationCode(file) {
  return file.startsWith('backend/src/') || file.startsWith('backend/plugins/') || file.startsWith('frontend/src/');
}

function formatFiles(matchedFiles) {
  return ['Changed files:', ...matchedFiles.map((file) => `- ${file}`)].join('\n');
}
