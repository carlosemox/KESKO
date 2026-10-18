# JOURNEY-001 — human-authored journey

Contract established before implementation, 2026-10-18. Prompt 03 and
DEVELOPMENT-PROMPTS-INTEGRATION.md govern content; existing schemaVersion 1
step IDs, order and gates remain unchanged. No AI executor is introduced.

After the current PRD is explicitly approved, nextAction is `submit_journey`.
The existing commands endpoint accepts `submit_journey` with `journey`,
`sourcePrdId`, `sourcePrdHash`, operationId and expectedVersion. Journey is an
object with these text fields (each trimmed, 0–2000 characters; omitted fields
normalize to empty strings so partial progress can be saved):
profiles, channels, entry, preconditions, mainSteps, result, alternatives,
errors, cancellation, recovery, permissions, data, states, analytics, abandonment.
Describe each profile's path and associate steps/screens with permissions,
data and states (including loading, empty, success and error). Unknown answers
must be identified by the human as DADO INSUFICIENTE, never filled automatically.
The total serialized command is limited to 64 KiB UTF-8, within the existing
HTTP body cap. Unknown fields are rejected.

Submission requires a completed PRD and the latest current-revision PRD artifact
with human approval and matching ID/hash. It appends a draft artifact containing
structured journey input, human author attribution and source PRD ID/hash;
SHA-256 covers its exact UTF-8 content. Submission never approves the journey.
Resubmission replaces the current draft by appending another artifact; old
artifacts/events remain unchanged. Latest draft is the approval target.

`approve_journey` requires artifactId, sourcePrdId, sourcePrdHash and a nonempty
reason (max 2000 characters). It checks the current source and latest draft,
then records explicit human approval. Critical unknowns identified with
DADO INSUFICIENTE or empty fields prevent approval. All listed fields are
required for approval, not for draft saving. Approved journeys cannot be resubmitted or
reapproved; create a change request. Design remains blocked without an executor.
`run_step journey` still reports unavailable execution and creates no artifact.

Both commands retain existing owner/admin authorization, tenant isolation,
transactional snapshot/event writes, CAS and operation replay semantics.
No route/auth change, external action or shared database operation is required.
Only a new additive migration widens events_type_check for the two commands.

## Browser contract

- Form `#journey-form`, grouped controls inside `#journey-editor`.
- Textareas `#journey-<field>` for the exact fields above; explicit labels,
  maxlength=2000 (not required when saving). Groups: context/main path, exceptions,
  permissions/data/states, measurement.
- Source `#journey-source`; submit `#journey-submit`.
- Separate approval form `#journey-approval`, reason `#journey-reason`,
  button `#journey-approve`.
- Existing `#status`, `#retry`, `#steps`, `#artifacts`, `#history` remain.
- Submitted drafts reopen populated; initial inputs are empty. Existing
  uncertain-outcome retry preserves the exact operationId and payload.
- All human text is rendered with textContent/value, never HTML interpolation.

Validation: focused unit/UI tests here; disposable PostgreSQL and Chromium
execution and independent review are coordinator gates, not claimed by this slice.

## Local implementation evidence

2026-10-18: focused model/UI run passed 38 tests across two files, zero
failed/skipped. TypeScript noEmit and ESLint for the five owned source/test
files passed; formatting and scoped diff whitespace checks passed. Repository
transaction implementation was reused unchanged. The DB fixture now installs
the actual registerIdentityHook before workflow routes.

Added real-DB coverage (not executed here) for partial save/reopen, duplicate
replay, conflicting operation payload, stale CAS, concurrent submissions,
viewer/member/outsider denial, stale source ID/hash, obsolete draft approval,
admin approval, approval replay and approved immutability. Existing no-executor
assertions remain for run_step journey and downstream design.

Limits: field length uses JavaScript string length, max 2000; journey command
serialized UTF-8 size max 65536 bytes; approval reason max 2000. HTTP parsing
retains its existing 256 KiB route limit; domain validation rejects oversized
journey commands before persistence. Human completeness review is required:
the software detects empty/explicit DADO INSUFICIENTE fields, not semantic
correctness or unexpressed uncertainty. Historical drafts are retained and
only the latest journey artifact is labeled current in the UI.

Independent technical/Sentinel review, disposable PostgreSQL migration/tests
and real Chromium/mobile checks remain with the coordinator. No new remote CI,
release or signed approval is asserted for this uncommitted slice.
