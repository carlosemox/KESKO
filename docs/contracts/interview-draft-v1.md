# Interview draft — local HTTP contract

Scope: synthetic loopback development. Existing local authentication and active
tenant membership are required. This contract does not activate hosted access.

`GET /v1/tenants/:tenantId/interview-draft` returns `{data:null}` or a draft
`{index, answers, updatedAt, version}`. Answers are the existing eleven briefing
fields, each bounded to 4000 characters; index is an integer from 0 to 11.

`POST` on the same route accepts `{index, answers, expectedVersion}`.
`expectedVersion` is null for first creation, or the last confirmed `version`.
For backward compatibility, an omitted version is treated as null; it cannot
overwrite an existing different snapshot. The version is a SHA256 fingerprint
of the normalized index/answers, not an authentication token. Database rows are
scoped to tenant and authenticated actor; client identifiers cannot select a
different actor. No migration or credentials are required by this change.

Writes serialize per tenant/actor within the database transaction. A stale
expected version returns 409; identical snapshots can be retried idempotently.
The caller must not silently retry a different snapshot after conflict. A valid
version permits editing earlier questions and resetting to `{index:0,answers:{}}`.
Snapshot comparison does not preserve an edit history or prevent ABA changes
back to identical content; no audit/history guarantee is claimed for drafts.

The browser queues saves in order, retains local answers after failure and pauses
remote synchronization on uncertain or conflicting results. Reconnect by loading
projects again and reviewing the draft before another save. Browser snapshots
carry an unsynchronized flag until the matching save is confirmed; reconnecting
does not replace these pending answers with remote data. A completed draft
must populate the briefing when reopened. Old responses must not display errors
in another tenant/project/interview session.

Local storage is browser-scoped fallback, not encrypted storage or a hosted
backup. Reset stores an empty draft with the confirmed version; it does not
delete project records. Server retention and full product history remain future
scope. New project/context actions must preserve existing saved projects.
