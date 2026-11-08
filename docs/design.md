# Existing interface

The current UI is accessible Portuguese HTML served by Fastify, not React or
shadcn. It introduces a business interview one question at a time, with progress,
labels, visible focus, live feedback and responsive layout. Retain existing
tokens and components in `src/workflow/ui.ts`.

Preserve plain business language, keyboard operation, error recovery, and text
rendering of user content. Synthetic local identity configuration is separate
from the interview. Demonstration data must remain explicitly identified.

Automated DOM-harness tests are not browser evidence. Browser checks should
cover question navigation, reload/resume, completion, fallback after network
failure, and tenant/context changes. Current gaps are in [quality](quality.md).
