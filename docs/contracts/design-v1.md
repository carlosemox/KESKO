# DESIGN-001 — human-authored UI/UX specification

Contract established before implementation, 2026-10-18. Prompt 04 and
`DEVELOPMENT-PROMPTS-INTEGRATION.md` govern the content. This slice records a
human specification; it does not generate screens, claim an implemented design
system, or introduce an AI executor.

After the Journey is explicitly approved, `nextAction` is `submit_design`. The
commands endpoint accepts `submit_design` with `design`, `sourceJourneyId`,
`sourceJourneyHash`, `operationId` and `expectedVersion`. The design object has
these text fields (trimmed; omitted fields normalize to empty strings so a
partial draft can be resumed):

`informationArchitecture`, `screenMap`, `visualHierarchy`,
`reusableComponents`, `designTokens`, `colorsContrast`, `typography`, `spacing`,
`states`, `responsiveness`, `accessibility`, `microinteractions`,
`errorMessages`, `visualAcceptance`, `consistencyRules`.

Each field is limited to 4000 JavaScript characters and the serialized command
is limited to 64 KiB UTF-8. Unknown fields are rejected. The draft records
human authorship, the exact approved Journey ID/hash and a SHA-256 of its
serialized content. Resubmission appends a new artifact and retains history.

`approve_design` requires the latest draft, the still-current approved Journey,
and a nonempty human reason. Empty fields or explicit `DADO INSUFICIENTE` block
approval. Approval is immutable; a later change request must create a new
briefing revision. The next domain stage remains unavailable because no
verified executor is introduced by this slice.

The existing tenant authorization, transaction, CAS, operation replay, RLS and
event audit behavior are reused. Migration `20261018010000_design_events.sql`
only widens the event vocabulary; it does not remove data or change privileges.

## Browser contract

- Form `#design-form`, grouped controls inside `#design-editor`.
- Textareas `#design-<field>` for the exact fields above, with explicit labels
  and `maxlength=4000`.
- Source `#design-source`; submit `#design-submit`.
- Separate approval form `#design-approval`, reason `#design-reason`, and
  button `#design-approve`.
- Drafts reopen with their saved values; approval disables the design editor.
- All human text is rendered with `textContent`/`value`, never HTML insertion.

The form guides a nontechnical user with plain-language questions, but human
approval remains responsible for the truth and completeness of the visual
decisions. It does not replace a visual design review or prove that screens are
implemented.
