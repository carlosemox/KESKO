# Local onboarding

Use Node.js 24 and the pnpm version in package.json. Dependencies and commands
are shared by Codex and Claude through AGENTS.md; no second MCP connection or
client-specific token file is needed for Context7 in the current session.

```sh
CI=true corepack pnpm install --frozen-lockfile
CI=true corepack pnpm verify
```

If dependency verification fails, run the explicit frozen install again. Do not
disable verification or change the lockfile to work around network failure.
`enableGlobalVirtualStore: false` keeps local and CI layouts consistent.

For real integration tests, Docker must be running and `postgres:17-alpine`
must already exist locally. The image pull is an explicit prerequisite:

```sh
docker pull postgres:17-alpine
CI=true corepack pnpm test:postgres
```

The project-owned runner ignores caller database credentials, creates a
disposable loopback database, applies migrations there and cleans up its own
container. It does not prove Supabase Auth. Migration to an existing database
is a separate reviewed action.

For synthetic browser use: `corepack pnpm demo:workflow`, then open
`http://127.0.0.1:3000/workflow`. End with Ctrl+C; data is discarded. The session
has a 30-minute limit. See README.md for full lifecycle details.

Never put credentials in chat, logs or versioned files. Do not start the signed
continuous Harness until its external Sentinel trust gate is satisfied.
