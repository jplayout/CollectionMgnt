import { REPOSITORY, REPOSITORY_ID, isSha, validatePullRequest,
    validateCommit, validateProtection, validateBase, selectRuns, evaluateChecks } from './dependabot-policy.mjs';

const root = `repos/${REPOSITORY}`;
export class GitHubError extends Error {
    constructor(status) {
        super(status ? `GitHub request refused (HTTP ${status}).` : 'GitHub request timed out or failed.');
        this.status = status;
    }
}

export function createClient(token, fetchImpl = globalThis.fetch) {
    if (!token) throw new Error('Required token is unavailable.');
    async function request(path, { method = 'GET', body } = {}) {
        // No URLs from PRs, API responses, pagination links, or provider errors.
        if (path !== 'graphql' && !path.startsWith(`${root}/`)) throw new Error('Unexpected API path.');
        let response;
        try {
            response = await fetchImpl(`https://api.github.com/${path}`, {
                method, redirect: 'error', signal: AbortSignal.timeout(10_000),
                headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`,
                    'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
                body: body === undefined ? undefined : JSON.stringify(body)
            });
        } catch { throw new GitHubError(); }
        if (!response.ok) throw new GitHubError(response.status);
        let data;
        try { data = await response.json(); } catch { throw new Error('Invalid GitHub response.'); }
        if (data?.errors) throw new Error('GitHub query was refused.');
        return data;
    }
    async function list(path, key) {
        const entries = [];
        for (let page = 1; page <= 10; page++) {
            const data = await request(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
            const batch = key ? data[key] : data;
            if (!Array.isArray(batch) || data.total_count > 1000) throw new Error('Incomplete GitHub listing.');
            entries.push(...batch);
            if (batch.length < 100) {
                if (Number.isInteger(data.total_count) && entries.length < data.total_count) {
                    throw new Error('Truncated GitHub listing.');
                }
                return entries;
            }
        }
        throw new Error('GitHub pagination limit reached.');
    }
    return { request, list };
}

export async function authorizeInvocation(client, context) {
    if (context.repository !== REPOSITORY || !Number.isSafeInteger(context.number) || context.number < 1 ||
        !isSha(context.trustedSha)) throw new Error('Invalid invocation.');
    if (context.event === 'pull_request_target') {
        if (context.actor !== 'dependabot[bot]' || context.actorId !== 49699333 || !isSha(context.expectedHead)) {
            throw new Error('Only authentic Dependabot events are accepted.');
        }
    } else if (context.event === 'workflow_dispatch' && context.ref === 'refs/heads/main') {
        // Re-runs are authorized against the person actually starting them, too.
        for (const login of new Set([context.actor, context.triggeringActor])) {
            if (!/^[a-zA-Z0-9-]+$/.test(login ?? '')) throw new Error('Invalid recovery actor.');
            const result = await client.request(`${root}/collaborators/${encodeURIComponent(login)}/permission`);
            if (!['admin', 'maintain', 'write'].includes(result.permission)) throw new Error('Recovery requires repository write access.');
        }
    } else {
        throw new Error('Recovery must run the workflow on main.');
    }
}

export async function observe(client, number, expectedHead, expectedBase) {
    const pr = await client.request(`${root}/pulls/${number}`);
    validatePullRequest(pr, expectedHead ?? pr.head?.sha);
    if (pr.number !== number) throw new Error('Unexpected PR response.');
    const policy = await client.request('graphql', { method: 'POST', body: { query: `query {
        repository(owner: "jplayout", name: "CollectionMgnt") {
            databaseId
            ref(qualifiedName: "refs/heads/main") {
                target { ... on Commit { oid } }
                branchProtectionRule {
                    requiresStrictStatusChecks requiredApprovingReviewCount requiresCodeOwnerReviews requireLastPushApproval
                    requiredStatusChecks { context app { databaseId } }
                }
            }
        }
    }` } });
    const repository = policy.data?.repository;
    const base = repository?.ref?.target?.oid;
    if (repository?.databaseId !== REPOSITORY_ID || !isSha(base) || (expectedBase && expectedBase !== base)) {
        throw new Error('Trusted repository or main changed.');
    }
    const [commits, rulesetIndex, comparison, mergeRef, workflows, runs] = await Promise.all([
        client.list(`${root}/pulls/${number}/commits`),
        client.list(`${root}/rulesets?includes_parents=true`),
        client.request(`${root}/compare/${base}...${pr.head.sha}`),
        client.request(`${root}/git/ref/pull/${number}/merge`),
        client.list(`${root}/actions/workflows`, 'workflows'),
        client.list(`${root}/actions/runs?event=pull_request&head_sha=${pr.head.sha}`, 'workflow_runs')
    ]);
    validateCommit(pr, commits);
    const activeRulesets = rulesetIndex.filter(rule => rule.enforcement === 'active');
    // Repository rules only; unknown inherited rules cannot silently widen bypass.
    if (activeRulesets.some(rule => rule.source !== REPOSITORY || rule.source_type !== 'Repository' || !Number.isSafeInteger(rule.id))) {
        throw new Error('Unexpected inherited ruleset.');
    }
    const rulesets = await Promise.all(activeRulesets.map(rule => client.request(`${root}/rulesets/${rule.id}`)));
    validateProtection(repository.ref.branchProtectionRule, rulesets);
    if (!isSha(mergeRef.object?.sha)) throw new Error('Test merge is unavailable.');
    const mergeCommit = await client.request(`${root}/git/commits/${mergeRef.object.sha}`);
    validateBase(pr, base, comparison, mergeCommit);
    const selected = selectRuns(pr, runs, workflows);
    const [jobLists, headChecks, mergeChecks, headStatuses, mergeStatuses] = await Promise.all([
        Promise.all(selected.filter(run => !run.missing).map(run =>
            client.list(`${root}/actions/runs/${run.id}/attempts/${run.run_attempt}/jobs`, 'jobs'))),
        client.list(`${root}/commits/${pr.head.sha}/check-runs?filter=latest`, 'check_runs'),
        client.list(`${root}/commits/${mergeCommit.sha}/check-runs?filter=latest`, 'check_runs'),
        client.list(`${root}/commits/${pr.head.sha}/statuses`),
        client.list(`${root}/commits/${mergeCommit.sha}/statuses`)
    ]);
    const state = evaluateChecks({ pr, runs: selected, jobs: jobLists.flat(),
        checks: [...headChecks, ...mergeChecks], statuses: [...headStatuses, ...mergeStatuses], mergeSha: mergeCommit.sha });
    // The snapshot binds the entire set of successful workflow attempts to H and B.
    return { number, head: pr.head.sha, base, state,
        runs: selected.map(run => ({ id: run.id ?? null, attempt: run.run_attempt ?? null, path: run.path })) };
}

export async function waitForChecks(inspect, { timeoutMs = 45 * 60_000, intervalMs = 60_000,
    now = Date.now, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), onWait = () => {} } = {}) {
    const deadline = now() + timeoutMs;
    let expected;
    while (now() < deadline) {
        const snapshot = await inspect(expected);
        if (now() >= deadline) break;
        if (expected && (expected.head !== snapshot.head || expected.base !== snapshot.base)) {
            throw new Error('PR head or main changed while waiting.');
        }
        expected ??= snapshot;
        if (snapshot.state === 'ready') return snapshot;
        if (snapshot.state !== 'waiting') throw new Error('Unexpected checks decision.');
        onWait();
        await sleep(Math.min(intervalMs, Math.max(0, deadline - now())));
    }
    throw new Error('Required checks did not succeed before the deadline.');
}

export async function mergeCandidate(readClient, writeClient, candidate, { now = Date.now } = {}) {
    if (!Number.isSafeInteger(candidate.number) || candidate.number < 1 || !isSha(candidate.head) || !isSha(candidate.base) ||
        !Number.isFinite(candidate.preparedAt) || now() - candidate.preparedAt < 0 || now() - candidate.preparedAt > 5 * 60_000) {
        throw new Error('Invalid or expired merge candidate.');
    }
    const current = await observe(readClient, candidate.number, candidate.head, candidate.base);
    if (current.state !== 'ready' || JSON.stringify(current.runs) !== JSON.stringify(candidate.runs)) {
        throw new Error('Checks changed since preparation.');
    }
    // Last reads after the full inspection; the server enforces strict checks and
    // non-bypassable rules atomically with the expected head SHA at PUT time.
    const [pr, base] = await Promise.all([
        readClient.request(`${root}/pulls/${candidate.number}`),
        readClient.request(`${root}/git/ref/heads/main`)
    ]);
    validatePullRequest(pr, candidate.head);
    if (base.object?.sha !== candidate.base || pr.base.sha !== candidate.base || now() - candidate.preparedAt > 5 * 60_000) {
        throw new Error('Base changed or candidate expired before merge.');
    }
    // Exactly one write. Never retry a timeout or fall back to auto/admin merge.
    const result = await writeClient.request(`${root}/pulls/${candidate.number}/merge`, {
        method: 'PUT', body: { sha: candidate.head, merge_method: 'merge' }
    });
    if (result.merged !== true || !isSha(result.sha)) throw new Error('Merge was not confirmed; inspect the PR before retrying.');
    return result.sha;
}
