import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { authorizeInvocation, createClient, observe, waitForChecks, mergeCandidate } from './dependabot-github.mjs';
import { invocationGuard } from './dependabot-policy.mjs';

export async function main(mode, env = process.env) {
    const event = JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, 'utf8'));
    const guard = invocationGuard(env.GITHUB_EVENT_NAME, event, env.MERGE_ENABLED);
    if (mode === 'guard') {
        appendFileSync(env.GITHUB_OUTPUT,
            `allow_write=${guard.allowWrite}\ndry_run=${!guard.allowWrite}\npr_number=${guard.number}\n`);
        return;
    }
    const context = {
        repository: env.GITHUB_REPOSITORY, event: env.GITHUB_EVENT_NAME, ref: env.GITHUB_REF,
        trustedSha: env.GITHUB_SHA, actor: env.GITHUB_ACTOR, actorId: Number(env.GITHUB_ACTOR_ID),
        triggeringActor: env.GITHUB_TRIGGERING_ACTOR,
        number: guard.number,
        expectedHead: env.GITHUB_EVENT_NAME === 'pull_request_target' ? event.pull_request?.head?.sha : undefined
    };
    const readClient = createClient(env.READ_TOKEN);
    await authorizeInvocation(readClient, context);
    if (mode === 'prepare') {
        const candidate = await waitForChecks(previous => observe(readClient, context.number,
            previous?.head ?? context.expectedHead, previous?.base ?? context.trustedSha), {
            onWait: () => console.log('Required checks are incomplete; waiting without an App token.')
        });
        candidate.preparedAt = Date.now();
        writeFileSync(env.CANDIDATE_PATH, JSON.stringify(candidate), { mode: 0o600, flag: 'wx' });
        if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, 'ready=true\n');
        console.log(env.DRY_RUN === 'false' ? 'Candidate eligible; final validation required.' : 'Dry run: candidate eligible; no App token or merge requested.');
    } else if (mode === 'merge') {
        if (!guard.allowWrite || env.DRY_RUN !== 'false') throw new Error('Direct merge is disabled.');
        const candidate = JSON.parse(readFileSync(env.CANDIDATE_PATH, 'utf8'));
        if (candidate.number !== context.number || (context.expectedHead && candidate.head !== context.expectedHead) ||
            candidate.base !== context.trustedSha) throw new Error('Candidate does not belong to this invocation.');
        await mergeCandidate(readClient, createClient(env.APP_TOKEN), candidate);
        console.log('Direct merge confirmed by GitHub.');
    } else {
        throw new Error('Unknown controller mode.');
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main(process.argv[2]).catch(error => {
        // API bodies and headers are never logged; transport errors are sanitized.
        console.error(error instanceof SyntaxError ? 'Invalid controller input.' : error.message);
        process.exitCode = 1;
    });
}
