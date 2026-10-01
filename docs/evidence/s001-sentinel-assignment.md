# S-001 Sentinel assignment

**Status: BLOCKED — no independent Sentinel identified**

## Assignment state

- Executor: Codex implementer for Task 0
- Sentinel identity: **NONE ASSIGNED**
- Independence: cannot be established without a named reviewer separate from the executor
- Review mode: not started; no reviewer was dispatched
- Target branch: `codex/S-001-foundation-tenancy`
- Target base SHA: `6e61cef114f544985f31ebb6b0769a35aec4b6b7`

The current repository and task context provide no named person, team, or agent that can be verified as an independent Sentinel. The executor is not eligible to fill this role. The `sentinel-cadu` skill, by itself, would not establish independence.

## Required review contract

The controller must assign a reviewer who is not the executor. The assignment must identify:

- reviewer name and durable handle/team identity;
- the exact branch and immutable SHA to review;
- the artifacts: `docs/evidence/s001-ready.md`, this assignment, the Task 0 report, and the relevant plan/brief;
- the Gate A criteria: repository/branch provenance, real PostgreSQL/Supabase OSS evidence, responsible owner, and independent review contract;
- the read-only restriction: the Sentinel may inspect and report but may not edit the reviewed branch;
- the bounded deliverable: a verdict limited to the exact SHA reviewed, with findings and evidence references.

## Exact manual completion steps

1. The controller names an independent Sentinel other than the Codex Task 0 executor.
2. The controller records the identity and independence rationale in this file and fixes the exact review SHA after the Task 0 evidence files are committed.
3. The Sentinel receives the branch/SHA, artifacts, criteria, and runtime evidence package.
4. The Sentinel reviews in read-only mode and emits a bounded opinion for that SHA only.
5. Keep Gate A `BLOCKED` until the assignment and the PostgreSQL evidence are both complete.
