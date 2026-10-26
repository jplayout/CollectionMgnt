// Pure policy: no credentials, filesystem access, network, or PR code execution.
export const REPOSITORY = 'jplayout/CollectionMgnt';
export const REPOSITORY_ID = 1261373514;
export const DEPENDABOT_ID = 49699333;
export const ACTIONS_APP_ID = 15368;
export const MERGER_APP_ID = 5185016;
export const HUMAN_REVIEW_ID = 24453018;
export const REQUIRED_WORKFLOWS = {
    '.github/workflows/ci.yml': ['Backend', 'Frontend', 'Quality', 'Playwright E2E', 'Docker'],
    '.github/workflows/project-conventions.yml': ['Project Conventions'],
    '.github/workflows/codeql.yml': ['Analyze JavaScript (javascript-typescript)'],
    '.github/workflows/semgrep.yml': ['Semgrep'],
    '.github/workflows/trivy.yml': ['Trivy']
};
export const REQUIRED_CHECKS = Object.values(REQUIRED_WORKFLOWS).flat();
export const isSha = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const bot = user => user?.id === DEPENDABOT_ID && user.login === 'dependabot[bot]';
const refuse = reason => { throw new Error(reason); };

export function invocationGuard(eventName, event, activation) {
    let number;
    let liveRequested = false;
    if (eventName === 'pull_request_target') {
        number = event.pull_request?.number;
        // GitHub events carry an actual number; do not coerce a forged string.
        if (typeof number !== 'number') refuse('Invalid event PR number.');
        liveRequested = true;
    } else if (eventName === 'workflow_dispatch') {
        const input = event.inputs?.pr_number;
        number = Number(input);
        // Round-trip equality rejects whitespace, signs, leading zeroes, hex,
        // exponents and decimal points, including a trailing newline.
        if (typeof input !== 'string' || input !== String(number)) refuse('PR number must be canonical decimal.');
        // event.inputs contains strings, unlike the typed Actions inputs context.
        // Missing, malformed or differently cased dry_run values stay read-only.
        liveRequested = event.inputs?.dry_run === 'false';
    } else {
        refuse('Unexpected controller event.');
    }
    if (!Number.isSafeInteger(number) || number < 1) refuse('PR number must be a positive safe integer.');
    return { number, allowWrite: activation === 'true' && liveRequested };
}

export function validatePullRequest(pr, expectedHead) {
    if (pr.state !== 'open' || pr.merged !== false || pr.draft !== false) refuse('PR is closed, merged, or draft.');
    if (!bot(pr.user) || pr.user.type !== 'Bot') refuse('PR author is not Dependabot.');
    if (pr.base?.repo?.id !== REPOSITORY_ID || pr.head?.repo?.id !== REPOSITORY_ID ||
        pr.base.repo.full_name !== REPOSITORY || pr.head.repo.full_name !== REPOSITORY ||
        pr.base.ref !== 'main' || !pr.head.ref?.startsWith('dependabot/')) {
        refuse('Unexpected repository, base, or source branch.');
    }
    if (!isSha(pr.head.sha) || pr.head.sha !== expectedHead) refuse('PR head changed.');
    if (pr.mergeable !== true || !['clean', 'blocked', 'unstable', 'has_hooks'].includes(pr.mergeable_state)) {
        refuse('PR is conflicting, behind, or mergeability is unknown.');
    }
}

// A deliberately restricted subset of Dependabot's signed YAML trailer. Unsupported
// YAML (anchors, tags, multiline values, extra keys) stays manual; never evaluate it.
export function parseDependencies(message) {
    if (typeof message !== 'string') refuse('Missing signed metadata.');
    const blocks = [...message.matchAll(/^---\nupdated-dependencies:\n([\s\S]*?)\n\.\.\.(?:\n|$)/gm)];
    if (blocks.length !== 1) refuse('Missing or ambiguous signed metadata.');
    const dependencies = [];
    let dependency;
    const keys = new Set(['dependency-name', 'dependency-version', 'dependency-type', 'update-type', 'dependency-group']);
    for (const line of blocks[0][1].split('\n')) {
        const match = /^(?:- (dependency-name)|  ([a-z-]+)): (.+)$/.exec(line);
        if (!match) refuse('Unsupported signed metadata format.');
        const key = match[1] ?? match[2];
        if (match[1]) {
            dependency = Object.create(null);
            dependencies.push(dependency);
        }
        if (!dependency || !keys.has(key) || Object.hasOwn(dependency, key)) refuse('Ambiguous dependency metadata.');
        let value = match[3];
        if (value.startsWith('"')) {
            try { value = JSON.parse(value); } catch { refuse('Unsupported metadata quoting.'); }
        } else if (!/^[a-zA-Z0-9@/_.:+-]+$/.test(value)) {
            refuse('Unsupported metadata scalar.');
        }
        if (typeof value !== 'string' || !value) refuse('Invalid metadata value.');
        dependency[key] = value;
    }
    if (dependencies.length === 0) refuse('Empty dependency group.');
    const names = new Set();
    for (const entry of dependencies) {
        if (!entry['dependency-name'] || names.has(entry['dependency-name'])) refuse('Missing or duplicate dependency.');
        names.add(entry['dependency-name']);
        // Stable versions only; prereleases, SHA-only versions, ranges, and unknowns stay manual.
        if (!/^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(entry['dependency-version'] ?? '') ||
            !['version-update:semver-patch', 'version-update:semver-minor'].includes(entry['update-type'])) {
            refuse('Every dependency must have a known stable patch/minor update.');
        }
    }
    return dependencies;
}

export function validateCommit(pr, commits) {
    // Initial policy intentionally excludes human additions, merges, and multi-commit PRs.
    if (pr.commits !== 1 || commits.length !== 1 || commits[0].sha !== pr.head.sha ||
        !bot(commits[0].author) || commits[0].committer?.login !== 'web-flow' ||
        commits[0].committer?.id !== 19864447 || commits[0].commit?.verification?.verified !== true ||
        commits[0].commit.verification.reason !== 'valid') {
        refuse('Expected one verified Dependabot commit signed through GitHub.');
    }
    return parseDependencies(commits[0].commit.message);
}

export function validateProtection(branch, rulesets) {
    // GET /branches/main exposes checks with contents:read. Never derive the
    // local requirements from this response or fall back when it is incomplete.
    // Classic strict/review settings remain enforced by GitHub at the merge PUT.
    if (branch?.name !== 'main' || branch.protected !== true) refuse('Main is not protected.');
    const required = branch.protection?.required_status_checks?.checks;
    const contexts = branch.protection?.required_status_checks?.contexts;
    if (!Array.isArray(required) || required.length !== REQUIRED_CHECKS.length ||
        new Set(required.map(check => check?.context)).size !== REQUIRED_CHECKS.length ||
        required.some(check => !REQUIRED_CHECKS.includes(check?.context) || check?.app_id !== ACTIONS_APP_ID) ||
        !Array.isArray(contexts) || contexts.length !== REQUIRED_CHECKS.length ||
        new Set(contexts).size !== REQUIRED_CHECKS.length || contexts.some(context => !REQUIRED_CHECKS.includes(context))) {
        refuse('Required checks policy changed; manual review required.');
    }
    // Only the existing, separate Human Review ruleset may be bypassed. Reject
    // configuration drift rather than expanding the App's bypass implicitly.
    if (rulesets.length !== 1) refuse('Unexpected active rulesets.');
    const rule = rulesets[0];
    if (rule.id !== HUMAN_REVIEW_ID || rule.name !== 'Human Review' || rule.enforcement !== 'active' ||
        rule.target !== 'branch' || rule.conditions?.ref_name?.include?.length !== 1 ||
        rule.conditions.ref_name.include[0] !== 'refs/heads/main' || rule.conditions.ref_name.exclude?.length !== 0 ||
        !Array.isArray(rule.rules) || rule.rules.some(entry => !['pull_request', 'deletion', 'non_fast_forward'].includes(entry.type))) {
        refuse('Human Review bypass policy changed.');
    }
    // GitHub hides bypass_actors from read-only callers. Do not request admin
    // access to inspect it: only this review-only ruleset exists, checks remain
    // outside it, and the merge endpoint authorizes the actual App identity.
    if (Object.hasOwn(rule, 'bypass_actors') && (!Array.isArray(rule.bypass_actors) ||
        !rule.bypass_actors.some(actor => actor.actor_type === 'Integration' && actor.actor_id === MERGER_APP_ID && actor.bypass_mode === 'pull_request'))) {
        refuse('Human Review bypass is explicitly unavailable.');
    }
    const reviews = rule.rules.filter(entry => entry.type === 'pull_request');
    if (reviews.length !== 1 || !Number.isSafeInteger(reviews[0].parameters?.required_approving_review_count) ||
        reviews[0].parameters.required_approving_review_count < 1 ||
        reviews[0].parameters.require_code_owner_review !== true ||
        !reviews[0].parameters.allowed_merge_methods?.includes('merge')) refuse('Human Review requirements changed.');
}

export function validateBase(pr, baseSha, comparison, mergeCommit) {
    if (!isSha(baseSha) || pr.base.sha !== baseSha || comparison.behind_by !== 0 ||
        comparison.merge_base_commit?.sha !== baseSha || !['ahead', 'identical'].includes(comparison.status)) {
        refuse('PR branch does not contain current main.');
    }
    if (!isSha(mergeCommit?.sha) || mergeCommit.parents?.length !== 2 ||
        mergeCommit.parents[0].sha !== baseSha || mergeCommit.parents[1].sha !== pr.head.sha) {
        refuse('Test merge does not match the current base and head.');
    }
}

export function selectRuns(pr, runs, workflows) {
    return Object.keys(REQUIRED_WORKFLOWS).map(path => {
        const workflow = workflows.find(entry => entry.path === path);
        if (!workflow || workflow.state !== 'active') refuse('Required workflow missing or disabled.');
        const matching = runs.filter(run => run.path === path && run.event === 'pull_request');
        matching.sort((a, b) => b.run_number - a.run_number);
        const run = matching[0];
        if (!run) return { path, missing: true };
        if (!Number.isSafeInteger(run.id) || !Number.isSafeInteger(run.run_number) ||
            !Number.isSafeInteger(run.run_attempt) || run.run_attempt < 1 ||
            matching[1]?.run_number === run.run_number || run.workflow_id !== workflow.id || !bot(run.actor) ||
            run.repository?.id !== REPOSITORY_ID || run.head_repository?.id !== REPOSITORY_ID ||
            run.head_sha !== pr.head.sha || run.head_branch !== pr.head.ref ||
            !run.pull_requests?.some(entry => entry.number === pr.number && entry.head?.sha === pr.head.sha &&
                entry.head.repo?.id === REPOSITORY_ID && entry.base?.repo?.id === REPOSITORY_ID && entry.base.ref === 'main')) {
            refuse('Unexpected workflow run provenance.');
        }
        return run;
    });
}

export function evaluateChecks({ pr, runs, jobs, checks, statuses, mergeSha }) {
    let waiting = false;
    // A legacy commit status cannot impersonate an Actions check of the same name.
    if (statuses.some(status => REQUIRED_CHECKS.includes(status.context))) refuse('Conflicting legacy status source.');
    for (const run of runs) {
        if (run.missing) { waiting = true; continue; }
        if (run.status !== 'completed') { waiting = true; continue; }
        if (run.conclusion !== 'success') refuse('Required workflow did not succeed.');
        for (const name of REQUIRED_WORKFLOWS[run.path]) {
            const candidates = jobs.filter(job => job.run_id === run.id && job.name === name);
            if (candidates.length === 0) { waiting = true; continue; }
            if (candidates.length !== 1) refuse('Ambiguous required job.');
            const job = candidates[0];
            const url = `https://api.github.com/repos/${REPOSITORY}/check-runs/${job.id}`;
            if (job.run_attempt !== run.run_attempt || job.head_sha !== pr.head.sha || job.check_run_url !== url) {
                refuse('Required job belongs to another revision or attempt.');
            }
            const matching = checks.filter(entry => entry.id === job.id);
            if (matching.length === 0) { waiting = true; continue; }
            if (matching.length !== 1) refuse('Ambiguous required check.');
            const check = matching[0];
            if (check.name !== name || check.app?.id !== ACTIONS_APP_ID ||
                check.check_suite?.id !== run.check_suite_id ||
                ![pr.head.sha, mergeSha].includes(check.head_sha)) refuse('Unexpected required check identity or SHA.');
            if (job.status !== 'completed' || check.status !== 'completed') { waiting = true; continue; }
            if (job.conclusion !== 'success' || check.conclusion !== 'success') refuse('Required check did not succeed.');
        }
    }
    return waiting ? 'waiting' : 'ready';
}
