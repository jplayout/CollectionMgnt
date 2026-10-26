import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { REPOSITORY, REPOSITORY_ID, REQUIRED_WORKFLOWS, REQUIRED_CHECKS,
    invocationGuard, parseDependencies } from '../../../.github/scripts/dependabot-policy.mjs';
import { createClient, authorizeInvocation, observe, waitForChecks, mergeCandidate } from '../../../.github/scripts/dependabot-github.mjs';
import { main } from '../../../.github/scripts/dependabot-auto-merge.mjs';

const H = 'a'.repeat(40);
const B = 'b'.repeat(40);
const M = 'c'.repeat(40);
const root = `/repos/${REPOSITORY}`;
const bot = { login: 'dependabot[bot]', id: 49699333, type: 'Bot' };
const metadata = (entries = [['example', '1.2.4', 'patch']]) => `chore: bump dependencies\n\n---\nupdated-dependencies:\n${entries.map(([name, version, type]) =>
    `- dependency-name: "${name}"\n  dependency-version: ${version}\n  update-type: version-update:semver-${type}`).join('\n')}\n...\n`;

function fixture() {
    const repo = { id: REPOSITORY_ID, full_name: REPOSITORY };
    const pr = { number: 131, state: 'open', merged: false, draft: false, commits: 1,
        mergeable: true, mergeable_state: 'blocked', user: { ...bot },
        head: { sha: H, ref: 'dependabot/npm_and_yarn/example', repo },
        base: { sha: B, ref: 'main', repo } };
    const commits = [{ sha: H, author: { ...bot }, committer: { login: 'web-flow', id: 19864447 },
        commit: { message: metadata(), verification: { verified: true, reason: 'valid' } } }];
    const protection = { requiresStrictStatusChecks: true, requiredApprovingReviewCount: 0,
        requiresCodeOwnerReviews: false, requireLastPushApproval: false,
        requiredStatusChecks: REQUIRED_CHECKS.map(context => ({ context, app: { databaseId: 15368 } })) };
    const ruleset = { id: 24453018, name: 'Human Review', target: 'branch', enforcement: 'active',
        conditions: { ref_name: { include: ['refs/heads/main'], exclude: [] } },
        bypass_actors: [{ actor_type: 'Integration', actor_id: 5185016, bypass_mode: 'pull_request' }],
        rules: [{ type: 'deletion' }, { type: 'non_fast_forward' }, { type: 'pull_request', parameters: {
            required_approving_review_count: 1, require_code_owner_review: true, allowed_merge_methods: ['merge']
        } }] };
    const workflows = Object.keys(REQUIRED_WORKFLOWS).map((workflowPath, i) => ({ id: 200 + i, path: workflowPath, state: 'active' }));
    const runs = workflows.map((workflow, i) => ({ id: 10 + i, workflow_id: workflow.id, path: workflow.path,
        event: 'pull_request', actor: { ...bot }, run_number: 100, run_attempt: 1, check_suite_id: 300 + i,
        status: 'completed', conclusion: 'success', repository: repo, head_repository: repo,
        head_sha: H, head_branch: pr.head.ref, pull_requests: [{ number: pr.number, head: pr.head, base: pr.base }] }));
    const jobs = runs.flatMap(run => REQUIRED_WORKFLOWS[run.path].map((name, i) => ({
        id: run.id * 100 + i, name, run_id: run.id, run_attempt: 1, head_sha: H,
        status: 'completed', conclusion: 'success',
        check_run_url: `https://api.github.com${root}/check-runs/${run.id * 100 + i}`
    })));
    const checks = jobs.map(job => ({ id: job.id, name: job.name, head_sha: H,
        app: { id: 15368 }, status: 'completed', conclusion: 'success',
        check_suite: { id: runs.find(run => run.id === job.run_id).check_suite_id } }));
    return { pr, commits, protection, ruleset, workflows, runs, jobs, checks, statuses: [],
        base: B, merge: { sha: M, parents: [{ sha: B }, { sha: H }] },
        comparison: { behind_by: 0, status: 'ahead', merge_base_commit: { sha: B } },
        permission: 'write', calls: [], mergeResult: { merged: true, sha: M } };
}

function clientFor(f) {
    return createClient('fixture-token-not-a-credential', fetchFor(f));
}

function fetchFor(f) {
    return async (url, options) => {
        const parsed = new URL(url);
        assert.equal(parsed.origin, 'https://api.github.com');
        assert.equal(options.redirect, 'error');
        assert.ok(options.signal);
        const call = { path: parsed.pathname, method: options.method,
            body: options.body && JSON.parse(options.body), query: parsed.searchParams };
        f.calls.push(call);
        f.onCall?.(call, f);
        if (f.failure?.(call)) {
            if (f.httpStatus === 'timeout') throw new Error('private provider detail must never escape');
            return new Response('private provider detail must never escape', { status: f.httpStatus });
        }
        let result;
        const p = parsed.pathname;
        if (p === '/graphql') result = { data: { repository: { databaseId: REPOSITORY_ID,
            ref: { target: { oid: f.base }, branchProtectionRule: f.protection } } } };
        else if (p === `${root}/pulls/131`) result = f.pr;
        else if (p === `${root}/pulls/131/commits`) result = f.commits;
        else if (p === `${root}/rulesets`) result = [{ id: 24453018, enforcement: 'active', source: REPOSITORY, source_type: 'Repository' }, ...(f.extraRulesets ?? [])];
        else if (p === `${root}/rulesets/24453018`) result = f.ruleset;
        else if (p.startsWith(`${root}/compare/`)) result = f.comparison;
        else if (p === `${root}/git/ref/pull/131/merge`) result = { object: { sha: f.merge.sha } };
        else if (p === `${root}/git/ref/heads/main`) result = { object: { sha: f.base } };
        else if (p === `${root}/git/commits/${M}`) result = f.merge;
        else if (p === `${root}/actions/workflows`) result = { total_count: f.workflows.length, workflows: f.workflows };
        else if (p === `${root}/actions/runs`) {
            assert.equal(parsed.searchParams.get('event'), 'pull_request');
            assert.equal(parsed.searchParams.get('head_sha'), H);
            result = { total_count: f.runs.length, workflow_runs: f.runs };
        } else if (/\/actions\/runs\/\d+\/attempts\/\d+\/jobs$/.test(p)) {
            const runId = Number(p.match(/\/runs\/(\d+)/)[1]);
            const jobs = f.jobs.filter(job => job.run_id === runId);
            result = { total_count: jobs.length, jobs };
        } else if (p === `${root}/commits/${H}/check-runs`) result = { total_count: f.checks.length, check_runs: f.checks };
        else if (p === `${root}/commits/${M}/check-runs`) result = { total_count: 0, check_runs: [] };
        else if (p === `${root}/commits/${H}/statuses`) result = f.statuses;
        else if (p === `${root}/commits/${M}/statuses`) result = [];
        else if (/\/collaborators\/[^/]+\/permission$/.test(p)) result = { permission: f.permission };
        else if (p === `${root}/pulls/131/merge` && options.method === 'PUT') result = f.mergeResult;
        else assert.fail(`Unexpected mocked route: ${p}`);
        return new Response(JSON.stringify(result), { status: 200 });
    };
}

const writes = f => f.calls.filter(call => call.method === 'PUT');
async function candidateFor(f) {
    const snapshot = await observe(clientFor(f), 131, H, B);
    assert.equal(snapshot.state, 'ready');
    return { ...snapshot, preparedAt: 1000 };
}
async function attempt(f) {
    const client = clientFor(f);
    const candidate = await waitForChecks(previous => observe(client, 131, previous?.head ?? H, previous?.base ?? B), {
        timeoutMs: 2, intervalMs: 1, now: () => f.time ?? 0, sleep: async ms => { f.time = (f.time ?? 0) + ms; }
    });
    return mergeCandidate(client, client, { ...candidate, preparedAt: 1000 }, { now: () => 1000 });
}

for (const entries of [
    [['example', '1.2.4', 'patch']], [['example', 'v1.3.0', 'minor']],
    [['one', '1.2.4', 'patch'], ['two', '2.3.0', 'minor']]
]) {
    test(`eligible signed metadata produces exactly one SHA-bound direct merge: ${JSON.stringify(entries)}`, async () => {
        const f = fixture();
        f.commits[0].commit.message = metadata(entries);
        assert.equal(await attempt(f), M);
        assert.equal(writes(f).length, 1);
        assert.deepEqual(writes(f)[0].body, { sha: H, merge_method: 'merge' });
    });
}

const negatives = {
    'major update': f => { f.commits[0].commit.message = metadata([['example', '2.0.0', 'major']]); },
    'unknown version': f => { f.commits[0].commit.message = metadata([['example', 'unknown', 'patch']]); },
    'unknown update type': f => { f.commits[0].commit.message = metadata([['example', '1.2.4', 'unknown']]); },
    'mixed eligible and major group': f => { f.commits[0].commit.message = metadata([['one', '1.2.4', 'patch'], ['two', '3.0.0', 'major']]); },
    'mixed eligible and unknown group': f => { f.commits[0].commit.message = metadata([['one', '1.2.4', 'patch'], ['two', 'unknown', 'minor']]); },
    'prerelease': f => { f.commits[0].commit.message = metadata([['example', '1.2.4-rc.1', 'patch']]); },
    'human author': f => { f.pr.user = { login: 'human', id: 1, type: 'User' }; },
    'spoofed author ID': f => { f.pr.user.id = 1; },
    'human commit': f => { f.commits[0].author.id = 1; },
    'human committer': f => { f.commits[0].committer.id = 1; },
    'unverified commit': f => { f.commits[0].commit.verification.verified = false; },
    'invalid signature': f => { f.commits[0].commit.verification.reason = 'invalid'; },
    'additional commit': f => { f.pr.commits = 2; f.commits.push(structuredClone(f.commits[0])); },
    'wrong commit SHA': f => { f.commits[0].sha = 'd'.repeat(40); },
    'fork': f => { f.pr.head.repo = { id: 1, full_name: 'other/CollectionMgnt' }; },
    'wrong source branch': f => { f.pr.head.ref = 'feature/dependabot'; },
    'wrong target branch': f => { f.pr.base.ref = 'develop'; },
    'closed PR': f => { f.pr.state = 'closed'; },
    'already merged PR': f => { f.pr.merged = true; },
    'draft PR': f => { f.pr.draft = true; },
    'conflict': f => { f.pr.mergeable = false; f.pr.mergeable_state = 'dirty'; },
    'unknown mergeability': f => { f.pr.mergeable = null; },
    'unrecognized merge state': f => { f.pr.mergeable_state = 'unexpected'; },
    'obsolete branch': f => { f.comparison.behind_by = 1; },
    'wrong merge parents': f => { f.merge.parents[0].sha = H; },
    'missing check': f => { f.checks.shift(); },
    'failed check': f => { f.checks[0].conclusion = 'failure'; },
    'pending check': f => { f.checks[0].status = 'in_progress'; },
    'skipped check': f => { f.checks[0].conclusion = 'skipped'; },
    'neutral check': f => { f.checks[0].conclusion = 'neutral'; },
    'cancelled check': f => { f.checks[0].conclusion = 'cancelled'; },
    'wrong check SHA': f => { f.checks[0].head_sha = B; },
    'wrong check App': f => { f.checks[0].app.id = 1; },
    'wrong check name': f => { f.checks[0].name = 'Impersonated'; },
    'wrong check suite': f => { f.checks[0].check_suite.id = 1; },
    'duplicate check ID': f => { f.checks.push(structuredClone(f.checks[0])); },
    'wrong job SHA': f => { f.jobs[0].head_sha = B; },
    'wrong job URL': f => { f.jobs[0].check_run_url = 'https://attacker.example/job'; },
    'wrong attempt': f => { f.jobs[0].run_attempt = 2; },
    'duplicate job': f => { f.jobs.push(structuredClone(f.jobs[0])); },
    'missing workflow': f => { f.workflows.shift(); },
    'missing run': f => { f.runs.shift(); },
    'failed workflow': f => { f.runs[0].conclusion = 'failure'; },
    'wrong workflow ID': f => { f.runs[0].workflow_id = 1; },
    'wrong run repository': f => { f.runs[0].repository = { id: 1 }; },
    'wrong run SHA': f => { f.runs[0].head_sha = B; },
    'wrong run source branch': f => { f.runs[0].head_branch = 'main'; },
    'human-pushed head despite spoofed signed metadata': f => { f.runs[0].actor = { id: 1, login: 'human' }; },
    'unrelated PR run': f => { f.runs[0].pull_requests = []; },
    'only push CI exists': f => { f.runs[0].event = 'push'; },
    'legacy status impersonation': f => { f.statuses.push({ context: 'Backend', state: 'success' }); },
    'strict disabled': f => { f.protection.requiresStrictStatusChecks = false; },
    'non-bypassable review': f => { f.protection.requiredApprovingReviewCount = 1; },
    'non-bypassable code owner review': f => { f.protection.requiresCodeOwnerReviews = true; },
    'non-bypassable last push review': f => { f.protection.requireLastPushApproval = true; },
    'new required check': f => { f.protection.requiredStatusChecks.push({ context: 'New check', app: { databaseId: 15368 } }); },
    'required check source changed': f => { f.protection.requiredStatusChecks[0].app.databaseId = 1; },
    'Human Review bypass removed': f => { f.ruleset.bypass_actors = []; },
    'Human Review checks bypass added': f => { f.ruleset.rules.push({ type: 'required_status_checks' }); },
    'additional inherited ruleset': f => { f.extraRulesets = [{ id: 1, enforcement: 'active', source: 'other', source_type: 'Organization' }]; }
};
for (const [name, mutate] of Object.entries(negatives)) {
    test(`${name}: zero merge calls`, async () => {
        const f = fixture();
        mutate(f);
        await assert.rejects(() => attempt(f));
        assert.equal(writes(f).length, 0);
    });
}

test('signed metadata parser rejects ambiguous and executable YAML without evaluating it', () => {
    for (const message of ['', metadata() + metadata(), metadata().replace('1.2.4', '&anchor 1.2.4'),
        metadata().replace('1.2.4', '!!js/function malicious'), metadata().replace('1.2.4', '|\n    text'),
        metadata().replace('  update-type:', '  unknown-key:'), metadata().replace('\n...', '\n  update-type: version-update:semver-patch\n...'),
        metadata().replace('"example"', '"unterminated'), metadata([['example', '1.2.4', 'patch'], ['example', '1.3.0', 'minor']])]) {
        assert.throws(() => parseDependencies(message));
    }
});

test('the grouped signed trailer format used by PR 132 is accepted per dependency', () => {
    const message = `chore: bump the backend-minor-and-patch group\n\n---\nupdated-dependencies:
- dependency-name: "@fastify/multipart"
  dependency-version: 10.1.6
  dependency-type: direct:production
  update-type: version-update:semver-patch
  dependency-group: backend-minor-and-patch
- dependency-name: re2js
  dependency-version: 2.9.0
  dependency-type: direct:production
  update-type: version-update:semver-minor
  dependency-group: backend-minor-and-patch
...\n\nSigned-off-by: dependabot[bot] <support@github.com>\n`;
    assert.deepEqual(parseDependencies(message).map(entry => entry['dependency-name']), ['@fastify/multipart', 're2js']);
});

test('older successful runs never mask a newer pending or failed run', async () => {
    for (const status of ['queued', 'completed']) {
        const f = fixture();
        f.runs.push({ ...structuredClone(f.runs[0]), id: 99, run_number: 101, status, conclusion: 'failure' });
        await assert.rejects(() => attempt(f));
        assert.equal(writes(f).length, 0);
    }
});

test('new successful run is selected instead of an older failed run', async () => {
    const f = fixture();
    f.runs.push({ ...structuredClone(f.runs[0]), id: 9, run_number: 99, conclusion: 'failure' });
    assert.equal(await attempt(f), M);
    assert.equal(writes(f).length, 1);
});

test('read-only hidden bypass list relies on server authorization without bypassing checks', async () => {
    const f = fixture();
    delete f.ruleset.bypass_actors;
    assert.equal(await attempt(f), M);
    assert.equal(writes(f).length, 1);
    f.calls = [];
    f.protection.requiredApprovingReviewCount = 1;
    await assert.rejects(() => attempt(f));
    assert.equal(writes(f).length, 0);
});

test('successful full rerun uses the current attempt; old checks cannot satisfy it', async () => {
    const f = fixture();
    f.runs[0].run_attempt = 2;
    f.runs[0].triggering_actor = { id: 1, login: 'maintainer' };
    await assert.rejects(() => attempt(f));
    assert.equal(writes(f).length, 0);
    f.jobs.filter(job => job.run_id === f.runs[0].id).forEach(job => { job.run_attempt = 2; });
    assert.equal(await attempt(f), M);
    assert.equal(writes(f).length, 1);
});

for (const [name, mutate] of [
    ['head', f => { f.pr.head.sha = 'd'.repeat(40); }],
    ['base', f => { f.base = 'd'.repeat(40); }],
    ['review', f => { f.protection.requiredApprovingReviewCount = 1; }],
    ['new CI attempt', f => { f.runs[0].run_attempt++; }],
    ['closed state', f => { f.pr.state = 'closed'; }],
    ['check result', f => { f.checks[0].conclusion = 'failure'; }]
]) {
    test(`${name} changed after preparation: zero merge calls`, async () => {
        const f = fixture();
        const candidate = await candidateFor(f);
        mutate(f);
        await assert.rejects(() => mergeCandidate(clientFor(f), clientFor(f), candidate, { now: () => 1000 }));
        assert.equal(writes(f).length, 0);
    });
}

test('head/base/state races in the very last reads refuse merge', async () => {
    for (const change of ['head', 'base', 'closed']) {
        const f = fixture();
        const candidate = await candidateFor(f);
        let reads = 0;
        f.onCall = call => {
            if (call.path === `${root}/pulls/131` && ++reads === 2) {
                if (change === 'head') f.pr.head.sha = 'd'.repeat(40);
                if (change === 'base') f.base = 'd'.repeat(40);
                if (change === 'closed') f.pr.state = 'closed';
            }
        };
        await assert.rejects(() => mergeCandidate(clientFor(f), clientFor(f), candidate, { now: () => 1000 }));
        assert.equal(writes(f).length, 0);
    }
});

test('bounded wait uses an injected clock, follows successful reruns, and pins head/base', async () => {
    let time = 0;
    let inspections = 0;
    const initial = { head: H, base: B, state: 'waiting' };
    const result = await waitForChecks(async previous => {
        inspections++;
        assert.equal(previous?.head, inspections === 1 ? undefined : H);
        return { ...initial, state: inspections === 3 ? 'ready' : 'waiting' };
    }, { now: () => time, sleep: async ms => { time += ms; }, intervalMs: 1, timeoutMs: 4 });
    assert.equal(result.state, 'ready');
    assert.equal(time, 2);
    for (const key of ['head', 'base']) {
        time = 0;
        await assert.rejects(() => waitForChecks(async previous => previous ? { ...initial, [key]: M } : initial,
            { now: () => time, sleep: async ms => { time += ms; }, intervalMs: 1, timeoutMs: 4 }), /changed/);
    }
    time = 0;
    await assert.rejects(() => waitForChecks(async () => initial,
        { now: () => time, sleep: async ms => { time += ms; }, intervalMs: 1, timeoutMs: 4 }), /deadline/);
});

for (const status of [403, 405, 409, 422, 'timeout']) {
    test(`API ${status} during validation: zero merge calls, sanitized error`, async () => {
        const f = fixture();
        f.httpStatus = status;
        f.failure = call => call.path === `${root}/pulls/131`;
        await assert.rejects(() => attempt(f), error => !error.message.includes('private provider detail'));
        assert.equal(writes(f).length, 0);
    });
    test(`merge API ${status}: exactly one mocked request, no retry or fallback`, async () => {
        const f = fixture();
        f.httpStatus = status;
        f.failure = call => call.method === 'PUT';
        await assert.rejects(() => attempt(f), error => !error.message.includes('private provider detail'));
        assert.equal(writes(f).length, 1);
        assert.deepEqual(writes(f)[0].body, { sha: H, merge_method: 'merge' });
    });
}

test('a non-confirmed merge response cannot be reported as success', async () => {
    const f = fixture();
    f.mergeResult = { merged: false, sha: M };
    await assert.rejects(() => attempt(f), /not confirmed/);
    assert.equal(writes(f).length, 1);
});

test('expired candidates never reach the merge API', async () => {
    const f = fixture();
    const candidate = await candidateFor(f);
    await assert.rejects(() => mergeCandidate(clientFor(f), clientFor(f), candidate, { now: () => 400_000 }), /expired/);
    assert.equal(writes(f).length, 0);
});

test('manual recovery requires main, write permission, and both original and rerun actor authorization', async () => {
    const context = { repository: REPOSITORY, event: 'workflow_dispatch', ref: 'refs/heads/main', trustedSha: B,
        number: 131, actor: 'maintainer', triggeringActor: 'maintainer' };
    const f = fixture();
    await authorizeInvocation(clientFor(f), context);
    await assert.rejects(() => authorizeInvocation(clientFor(f), { ...context, ref: 'refs/heads/feature/other' }));
    f.permission = 'read';
    await assert.rejects(() => authorizeInvocation(clientFor(f), context));
    f.permission = 'write';
    await authorizeInvocation(clientFor(f), { ...context, triggeringActor: 'another-maintainer' });
    assert.ok(f.calls.some(call => call.path.includes('/another-maintainer/permission')));
    await assert.rejects(() => authorizeInvocation(clientFor(f), { ...context, event: 'pull_request' }));
    await assert.rejects(() => authorizeInvocation(clientFor(f), { ...context, event: 'pull_request_target', actor: 'dependabot[bot]', actorId: 1, expectedHead: H }));
    assert.equal(writes(f).length, 0);
});

test('transport paginates deterministically and refuses truncation, errors, or external URLs', async () => {
    let calls = 0;
    const client = createClient('fixture-token', async url => {
        calls++;
        const page = new URL(url).searchParams.get('page');
        return new Response(JSON.stringify({ items: page === '1' ? Array(100).fill(1) : [2], total_count: 101 }));
    });
    assert.equal((await client.list(`repos/${REPOSITORY}/actions/runs`, 'items')).length, 101);
    assert.equal(calls, 2);
    await assert.rejects(() => client.request('https://attacker.example/'), /Unexpected/);
    const truncated = createClient('fixture-token', async () => new Response(JSON.stringify({ items: [], total_count: 2 })));
    await assert.rejects(() => truncated.list(`repos/${REPOSITORY}/actions/runs`, 'items'), /Truncated/);
    const graphql = createClient('fixture-token', async () => new Response(JSON.stringify({ errors: [{ message: 'private' }] })));
    await assert.rejects(() => graphql.request('graphql'), /refused/);
});

test('disabled/dry-run CLI defensively refuses every non-exact activation before any App request', async t => {
    const directory = mkdtempSync(path.join(tmpdir(), 'dependabot-controller-test-'));
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    const eventFile = path.join(directory, 'event.json');
    writeFileSync(eventFile, JSON.stringify({ pull_request: { number: 131, head: { sha: H } } }));
    for (const [DRY_RUN, MERGE_ENABLED] of [
        ['true', 'true'], ...[undefined, '', 'TRUE', 'True', 'false', 'invalid', ' true', 'true ', 'true\n']
            .map(value => ['false', value])
    ]) {
        await assert.rejects(() => main('merge', { GITHUB_EVENT_PATH: eventFile, GITHUB_EVENT_NAME: 'pull_request_target',
            GITHUB_REPOSITORY: REPOSITORY, GITHUB_SHA: B, GITHUB_ACTOR: bot.login, GITHUB_ACTOR_ID: String(bot.id),
            READ_TOKEN: 'fixture-token', DRY_RUN, MERGE_ENABLED }), /disabled/);
    }
});

test('CLI dry-run preparation writes a private bound candidate without requesting a merge', async t => {
    const directory = mkdtempSync(path.join(tmpdir(), 'dependabot-controller-test-'));
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    const eventFile = path.join(directory, 'event.json');
    const candidateFile = path.join(directory, 'candidate.json');
    const outputFile = path.join(directory, 'output');
    const f = fixture();
    t.mock.method(globalThis, 'fetch', fetchFor(f));
    writeFileSync(eventFile, JSON.stringify({ inputs: { pr_number: '131', dry_run: 'true' } }));
    const env = { GITHUB_EVENT_PATH: eventFile, GITHUB_EVENT_NAME: 'workflow_dispatch',
        GITHUB_REPOSITORY: REPOSITORY, GITHUB_REF: 'refs/heads/main', GITHUB_SHA: B,
        GITHUB_ACTOR: 'maintainer', GITHUB_TRIGGERING_ACTOR: 'maintainer',
        CANDIDATE_PATH: candidateFile, GITHUB_OUTPUT: outputFile,
        READ_TOKEN: 'fixture-token', DRY_RUN: 'true', MERGE_ENABLED: 'false' };
    await main('prepare', env);
    const candidate = JSON.parse(readFileSync(candidateFile, 'utf8'));
    assert.equal(candidate.head, H);
    assert.equal(candidate.base, B);
    assert.equal(candidate.number, 131);
    assert.equal(readFileSync(outputFile, 'utf8'), 'ready=true\n');
    await assert.rejects(() => main('merge', env), /disabled/);
    assert.equal(writes(f).length, 0);
    // Even a false DRY_RUN environment cannot override the actual dispatch input.
    await assert.rejects(() => main('merge', { ...env, MERGE_ENABLED: 'true', DRY_RUN: 'false' }), /disabled/);
    assert.equal(writes(f).length, 0);
    writeFileSync(eventFile, JSON.stringify({ inputs: { pr_number: '131', dry_run: 'false' } }));
    await main('merge', { ...env, DRY_RUN: 'false', MERGE_ENABLED: 'true', APP_TOKEN: 'fixture-app-token' });
    assert.equal(writes(f).length, 1);
    assert.deepEqual(writes(f)[0].body, { sha: H, merge_method: 'merge' });
});

test('automatic live path uses the numeric PR event and performs exactly one mocked merge', async t => {
    const directory = mkdtempSync(path.join(tmpdir(), 'dependabot-automatic-live-'));
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    const eventFile = path.join(directory, 'event.json');
    const outputFile = path.join(directory, 'output');
    const f = fixture();
    t.mock.method(globalThis, 'fetch', fetchFor(f));
    writeFileSync(eventFile, JSON.stringify({ pull_request: { number: 131, head: { sha: H } } }));
    const env = { GITHUB_EVENT_PATH: eventFile, GITHUB_EVENT_NAME: 'pull_request_target',
        GITHUB_REPOSITORY: REPOSITORY, GITHUB_SHA: B, GITHUB_ACTOR: bot.login, GITHUB_ACTOR_ID: String(bot.id),
        GITHUB_OUTPUT: outputFile, CANDIDATE_PATH: path.join(directory, 'candidate.json'),
        MERGE_ENABLED: 'true', READ_TOKEN: 'fixture-token' };
    await main('guard', env);
    const outputs = Object.fromEntries(readFileSync(outputFile, 'utf8').trim().split('\n').map(line => line.split('=')));
    assert.equal(JSON.parse(outputs.allow_write), true);
    await main('prepare', { ...env, DRY_RUN: outputs.dry_run });
    assert.equal(writes(f).length, 0);
    await main('merge', { ...env, DRY_RUN: outputs.dry_run, APP_TOKEN: 'fixture-app-token' });
    assert.equal(writes(f).length, 1);
    assert.deepEqual(writes(f)[0].body, { sha: H, merge_method: 'merge' });
});

test('workflow isolates the trusted checkout, keeps all token permissions scoped, and defaults to dry run', () => {
    const yaml = readFileSync(new URL('../../../.github/workflows/dependabot-auto-merge.yml', import.meta.url), 'utf8');
    assert.match(yaml, /pull_request_target:/);
    assert.match(yaml, /github.ref == 'refs\/heads\/main'/);
    assert.match(yaml, /ref: \$\{\{ github.sha \}\}/);
    assert.match(yaml, /persist-credentials: false/);
    assert.match(yaml, /sparse-checkout: .github\/scripts/);
    assert.match(yaml, /default: true/);
    assert.match(yaml, /MERGE_ENABLED: \$\{\{ vars.DEPENDABOT_DIRECT_MERGE_ENABLED \}\}/);
    assert.doesNotMatch(yaml, /DEPENDABOT_DIRECT_MERGE_ENABLED\s*[!=]=/);
    assert.doesNotMatch(yaml, /--admin|--auto|npm |head\.sha.*ref:|skip-verification|skip-commit-verification/);
    for (const action of yaml.matchAll(/^\s+uses: ([^\s]+)/gm)) assert.match(action[1], /@[a-f0-9]{40}$/);
    const permissions = yaml.match(/^permissions:\n([\s\S]*?)\n\S/m)[1];
    assert.doesNotMatch(permissions, /write/);
    assert.ok(yaml.indexOf('mjs prepare') < yaml.indexOf('uses: actions/create-github-app-token@'));
    assert.match(yaml, /permission-contents: write\n\s+permission-pull-requests: write/);
});

const invalidDispatchNumbers = [undefined, null, '', 131, true, '0', '-0', '-131', '+131',
    '0131', '131.0', '0x83', '1.31e2', ' 131', '131 ', '131\n', '131\r\n', '\t131',
    '131\t', '١٣١', 'NaN', 'Infinity', '9007199254740992', '9007199254740993'];

test('manual PR numbers must round-trip as positive safe canonical decimal strings', () => {
    for (const input of ['1', '131', '132', String(Number.MAX_SAFE_INTEGER)]) {
        const guard = invocationGuard('workflow_dispatch', { inputs: { pr_number: input, dry_run: 'false' } }, 'true');
        assert.equal(guard.number, Number(input));
        assert.equal(guard.allowWrite, true);
    }
    for (const input of invalidDispatchNumbers) {
        assert.throws(() => invocationGuard('workflow_dispatch', { inputs: { pr_number: input, dry_run: 'false' } }, 'true'));
    }
});

test('GitHub PR events require an actual safe integer, whereas dispatch requires a canonical string', () => {
    for (const number of [1, 131, 132, Number.MAX_SAFE_INTEGER]) {
        assert.equal(invocationGuard('pull_request_target', { pull_request: { number } }, 'true').number, number);
    }
    for (const number of [undefined, null, '131', '0131', true, 0, -0, -131, 131.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
        assert.throws(() => invocationGuard('pull_request_target', { pull_request: { number } }, 'true'));
    }
    assert.throws(() => invocationGuard('pull_request', { pull_request: { number: 131 } }, 'true'));
});

test('workflow guard command and privileged-step conditions enforce the strict activation matrix', async t => {
    const yaml = readFileSync(new URL('../../../.github/workflows/dependabot-auto-merge.yml', import.meta.url), 'utf8');
    const command = yaml.match(/id: guard\n\s+run: node (\S+) (\S+)/);
    assert.deepEqual(command?.slice(1), ['.github/scripts/dependabot-auto-merge.mjs', 'guard']);
    assert.ok(yaml.indexOf('mjs guard') < yaml.indexOf('id: candidate'));
    assert.ok(yaml.indexOf('mjs guard') < yaml.indexOf('uses: actions/create-github-app-token@'));
    const conditions = [...yaml.matchAll(/^\s+if: (.*steps\.guard\.outputs.*)$/gm)].map(match => match[1]);
    assert.deepEqual(conditions, Array(2).fill(
        "fromJSON(steps.guard.outputs.allow_write || 'false') && steps.candidate.outputs.ready == 'true'"));
    assert.equal((yaml.match(/DRY_RUN: \$\{\{ steps.guard.outputs.dry_run \}\}/g) ?? []).length, 3);

    const directory = mkdtempSync(path.join(tmpdir(), 'dependabot-workflow-guard-'));
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    const eventFile = path.join(directory, 'event.json');
    const outputFile = path.join(directory, 'output');
    t.mock.method(globalThis, 'fetch', () => assert.fail('The workflow guard must not contact an API.'));
    const activations = ['true', 'TRUE', 'True', 'false', undefined, '', 'invalid', ' true', 'true ', 'true\n', null, true, false, 0, 1];
    for (const activation of activations) {
        for (const [eventName, event, liveRequested] of [
            ['pull_request_target', { pull_request: { number: 131 } }, true],
            ['workflow_dispatch', { inputs: { pr_number: '131', dry_run: 'false' } }, true],
            ...['true', 'FALSE', '', undefined, false, true].map(dryRun =>
                ['workflow_dispatch', { inputs: { pr_number: '131', dry_run: dryRun } }, false])
        ]) {
            writeFileSync(eventFile, JSON.stringify(event));
            writeFileSync(outputFile, '');
            // Execute the module/mode wired by the actual workflow. No token is provided.
            await main(command[2], { GITHUB_EVENT_PATH: eventFile, GITHUB_EVENT_NAME: eventName,
                GITHUB_OUTPUT: outputFile, MERGE_ENABLED: activation });
            const outputs = Object.fromEntries(readFileSync(outputFile, 'utf8').trim().split('\n').map(line => line.split('=')));
            const expected = activation === 'true' && liveRequested;
            assert.deepEqual(outputs, { allow_write: String(expected), dry_run: String(!expected), pr_number: '131' });
            // fromJSON consumes only the trusted literal boolean above, not the activation string.
            for (const ready of ['true', 'false', undefined]) {
                const privilegedStepsRun = JSON.parse(outputs.allow_write || 'false') && ready === 'true';
                assert.equal(privilegedStepsRun, expected && ready === 'true');
            }
        }
    }
});

test('workflow guard rejects noncanonical dispatch input without publishing write authorization', async t => {
    const directory = mkdtempSync(path.join(tmpdir(), 'dependabot-workflow-number-'));
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    const eventFile = path.join(directory, 'event.json');
    const outputFile = path.join(directory, 'output');
    for (const input of invalidDispatchNumbers) {
        writeFileSync(eventFile, JSON.stringify({ inputs: { pr_number: input, dry_run: 'false' } }));
        writeFileSync(outputFile, '');
        await assert.rejects(() => main('guard', { GITHUB_EVENT_PATH: eventFile,
            GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_OUTPUT: outputFile, MERGE_ENABLED: 'true' }));
        assert.equal(readFileSync(outputFile, 'utf8'), '');
    }
});

test('all authorized invocations of a PR share the workflow concurrency group', () => {
    const yaml = readFileSync(new URL('../../../.github/workflows/dependabot-auto-merge.yml', import.meta.url), 'utf8');
    assert.match(yaml, /group: dependabot-auto-merge-\$\{\{ github.event.pull_request.number \|\| fromJSON\(inputs.pr_number\) \}\}/);
    for (const number of [1, 131, 132, Number.MAX_SAFE_INTEGER]) {
        const automatic = { pull_request: { number } };
        const manual = { inputs: { pr_number: String(number), dry_run: 'false' } };
        const group = `dependabot-auto-merge-${invocationGuard('pull_request_target', automatic, 'true').number}`;
        assert.equal(`dependabot-auto-merge-${automatic.pull_request.number}`, group);
        // Both branches of the actual expression produce the same numeric value,
        // so Actions formats them identically, even for large safe integers.
        assert.equal(`dependabot-auto-merge-${JSON.parse(manual.inputs.pr_number)}`, group);
        assert.equal(invocationGuard('workflow_dispatch', manual, 'true').number, number);
    }
});
