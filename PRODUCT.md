# KESKO product map

KESKO guides people without software development experience from a business
interview toward reviewable software requirements and delivery evidence.

The detailed product sources remain [the interview](docs/product/INTERVIEW.md),
[the 15 development prompts](docs/product/DEVELOPMENT-PROMPTS.md), and
[their integration rules](docs/product/DEVELOPMENT-PROMPTS-INTEGRATION.md).
This file is their entry point, not a replacement specification.

## Observed implementation, 2026-10-18

Local tenant/owner/brand onboarding; a guided interview with browser draft and
backend draft storage; project briefing, structural discovery, preliminary PRD
and explicit human approval. Seventeen stages are displayed; stages 3–17 do
not have executors. A preliminary PRD is deterministic rendering of input.

The application is a synthetic local development vertical. Public user login,
cross-device hosted access, staging, deployment and autonomous remote agents
are not verified capabilities. Repository code for interview storage does not
make a loopback-only service reachable from another device.

## Acceptance and remaining work

Preserve tenant isolation, explicit approvals, evidence and resumability.
Business questions belong in the platform, in plain language. Future slices
must use the existing contracts and approved product criteria. Draft writes now
use snapshot-version checks and support reset; retention, real browser coverage
and production authentication still need focused work before hosted use.
See [quality](docs/quality.md).
