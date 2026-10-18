# S-001 Foundation of Contracts and Tenancy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a fundação verificável do Marketing OS para o fluxo onboarding de tenant → owner → brand, com contratos versionados, ownership, RBAC, autorização, persistência PostgreSQL e RLS executável.

**Architecture:** Uma API Node.js/TypeScript expõe contratos versionados e delega a persistência ao PostgreSQL do Supabase OSS. A autorização é aplicada em duas camadas: política de domínio/API e RLS no banco; a criação inicial do tenant ocorre por uma função transacional controlada para criar o tenant e sua membership owner sem bypass geral. Auditoria registra as mutações relevantes.

**Tech Stack:** Node.js 24, TypeScript, pnpm, Fastify, Supabase OSS/PostgreSQL, SQL versionado e Vitest para testes unitários e de integração, sem introduzir um framework frontend nesta slice.

**Spec:** `docs/superpowers/specs/2026-09-30-marketing-os-slice-roadmap-design.md`

## Global Constraints

- Repositório oficial confirmado: `carlosemox/KESKO`.
- Um único slice por vez; S-002 e S-003 não começam antes do aceite de S-001.
- Criar a branch `codex/S-001-foundation-tenancy` a partir de `main`; não implementar S-001 em `codex/development-ready`.
- Nenhum merge em `main`, deploy, alteração em `production`, migration destrutiva, dado irreversível ou secret sem GO formal.
- Provedor aprovado: Supabase OSS; PostgreSQL é obrigatório para S-001. Redis não é dependência de S-001 e só será preparado para S-003.
- Primeiro fluxo vertical aprovado: onboarding de tenant, criação automática do owner e criação/autorização de brand.
- BRAMARI não existe no checkout KESKO e não deve ser reintroduzido.
- Toda entidade persistida deve estar vinculada a tenant autorizado; operações cross-tenant devem falhar de forma verificável.
- Documentação, contratos e fixtures não substituem execução real, testes ou evidência de runtime.
- O Sentinel deve ser um revisor separado do executor; a skill `sentinel-cadu` sozinha não comprova independência.
- `MEMORY_APPLIED: NONE`; `MEMORY_UNKNOWN: GLOBAL_LIBRARY_UNAVAILABLE`; não existem `MEMORY_PROTOCOL.md`, `LESSONS_LEARNED.md` ou `LESSONS_CANDIDATES.md` no checkout.

## Review Focus

- Primeiro usuário criando o primeiro tenant sem membership prévia: o fluxo deve ser transacional e produzir exatamente um owner.
- Usuário autenticado tentando ler ou alterar outro tenant: não pode observar existência nem modificar dados.
- Usuário viewer/member tentando executar operação de owner/admin: deve falhar sem mutação parcial.
- Slug duplicado dentro do mesmo tenant versus slug igual em tenants diferentes: unicidade deve respeitar o escopo definido pelo contrato.
- Migração executada em banco limpo e repetida: deve reproduzir o schema sem depender de estado manual ou migration destrutiva.

## Gate A — Ready antes do código

### Task 0: Fechar ambiente, branch e revisão independente

**Files:**
- Create: `docs/evidence/s001-ready.md`
- Create: `docs/evidence/s001-sentinel-assignment.md`

**Interfaces:**
- Consumes: confirmação do repositório, decisões aprovadas e critérios deste plano.
- Produces: evidência de runtime PostgreSQL/Supabase OSS, branch própria, responsável ponta a ponta e identidade do Sentinel independente.

- [ ] **Step 1: Criar a branch de slice a partir de `main`**

Run: `git fetch origin main && git switch -c codex/S-001-foundation-tenancy origin/main`

Expected: branch nova aponta para o mesmo SHA de `origin/main`, sem alterar `main` ou `production`.

- [ ] **Step 2: Disponibilizar o runtime PostgreSQL autorizado**

Confirmar com comandos verificáveis: `docker compose version`, `supabase --version`, `supabase start`, `supabase status` e uma conexão local ao PostgreSQL. Se Docker/Supabase CLI não estiverem disponíveis, parar este task e registrar a ação manual exata; não simular banco.

- [ ] **Step 3: Confirmar o contrato de revisão independente**

Registrar um Sentinel que não seja o executor da implementação. A revisão deve receber SHA/branch, artefatos, critérios e evidências, operar em leitura e emitir parecer limitado à versão revisada.

- [ ] **Step 4: Registrar o resultado em `docs/evidence/s001-ready.md`**

Incluir SHA, branch, versões, comandos executados, resultado, responsável, Sentinel, limites e bloqueios. O arquivo deve marcar `READY` somente se PostgreSQL e Sentinel estiverem comprovados.

## Gate B — Contratos e domínio

### Task 1: Inicializar o workspace mínimo e os contratos versionados

**Files:**
- Create: `package.json`
- Create: `pnpm-lock.yaml`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `src/contracts/tenancy.v1.ts`
- Create: `src/contracts/errors.v1.ts`
- Create: `src/domain/tenancy.ts`
- Create: `src/domain/authorization.ts`
- Test: `tests/unit/domain/tenancy.test.ts`
- Test: `tests/unit/domain/authorization.test.ts`
- Create: `docs/contracts/s001-tenancy-v1.md`

**Interfaces:**
- Consumes: `TenantContext`, `TenantRole`, `TenantMembership`, `BrandInput` e `AuthorizationDecision` definidos no contrato v1.
- Produces: `assertTenantAccess(context, resourceTenantId)`, `can(context, permission)` e validação determinística de slug/nome para uso pela API e pelos testes.

- [ ] **Step 1: Escrever testes unitários falhos para contexto e autorização**

Fixar os casos: contexto sem `tenantId` é inválido; contexto com tenant diferente falha; owner/admin podem criar brand; member/viewer não podem; usuário não autenticado não pode ler nem mutar.

- [ ] **Step 2: Rodar os testes para confirmar falha**

Run: `pnpm vitest run tests/unit/domain/tenancy.test.ts tests/unit/domain/authorization.test.ts`

Expected: FAIL por ausência dos módulos e funções.

- [ ] **Step 3: Implementar os tipos e funções de domínio**

Definir `TenantRole = "owner" | "admin" | "member" | "viewer"`, permissões mínimas `tenant:read`, `brand:read`, `brand:create`, `brand:update` e `audit:read`, com negação por padrão.

- [ ] **Step 4: Rodar os testes unitários**

Expected: PASS sem acesso ao banco.

- [ ] **Step 5: Documentar o contrato v1**

Documentar campos obrigatórios, estados de erro, regra de tenant, papéis, permissões e a decisão de retornar `404` para recurso de outro tenant e `403` para papel insuficiente dentro do tenant.

- [ ] **Step 6: Gerar o lockfile e commitar o contrato mínimo**

Run: `pnpm install && git add package.json pnpm-lock.yaml tsconfig.json vitest.config.ts src tests docs/contracts/s001-tenancy-v1.md && git commit -m "feat: define s001 tenancy contracts"`

## Gate B — Persistência e RLS

### Task 2: Criar schema, migration e políticas PostgreSQL reproduzíveis

**Files:**
- Create: `supabase/config.toml`
- Create: `supabase/migrations/0001_s001_tenancy.sql`
- Create: `supabase/seed.sql`
- Create: `src/db/client.ts`
- Create: `src/db/tenant-repository.ts`
- Create: `src/db/brand-repository.ts`
- Create: `src/db/audit-repository.ts`
- Test: `tests/integration/db/rls.test.ts`
- Test: `tests/integration/db/migrations.test.ts`

**Interfaces:**
- Consumes: contratos v1 e contexto JWT de teste com `sub`/`auth.uid()`.
- Produces: tabelas `tenants`, `tenant_memberships`, `brands` e `audit_events`; RPC transacional `create_tenant_with_owner`; repositórios sempre tenant-scoped.

- [ ] **Step 1: Escrever migration falha-segura e testes de isolamento**

Testar dois usuários e dois tenants: criação inicial, leitura autorizada, leitura cross-tenant negada, mutação cross-tenant negada e papel insuficiente negado.

- [ ] **Step 2: Executar o banco limpo e confirmar a falha inicial**

Run: `supabase db reset` e `pnpm vitest run tests/integration/db/rls.test.ts tests/integration/db/migrations.test.ts`

Expected: testes falham antes da migration ou informam objetos ausentes; nenhum dado real é usado.

- [ ] **Step 3: Implementar a migration SQL**

Criar UUIDs, timestamps, constraints, chaves estrangeiras, índices por tenant, checks de role/status, RLS habilitado em todas as tabelas expostas e policies sem `USING (true)` para dados de negócio.

- [ ] **Step 4: Implementar `create_tenant_with_owner` como operação transacional controlada**

Validar `auth.uid()`, inserir tenant, inserir membership owner e registrar audit event; impedir que o chamador escolha outro `user_id` para se tornar owner.

- [ ] **Step 5: Executar migration, seed e testes de RLS**

Run: `supabase db reset && pnpm vitest run tests/integration/db/rls.test.ts tests/integration/db/migrations.test.ts`

Expected: PASS com evidência de isolamento, constraints e repetibilidade em banco limpo.

- [ ] **Step 6: Commitar schema e persistência**

Run: `git add supabase src/db tests/integration/db && git commit -m "feat: add s001 tenancy persistence and rls"`

## Gate B — API vertical

### Task 3: Expor onboarding tenant/owner/brand com auditoria

**Files:**
- Create: `src/app.ts`
- Create: `src/http/auth-context.ts`
- Create: `src/http/routes/tenants.ts`
- Create: `src/http/routes/brands.ts`
- Create: `src/http/errors.ts`
- Test: `tests/integration/http/onboarding.test.ts`
- Test: `tests/integration/http/authorization.test.ts`
- Create: `docs/api/s001-openapi.yaml`

**Interfaces:**
- Consumes: `TenantContext`, domínio de autorização e repositórios PostgreSQL.
- Produces: `POST /v1/tenants`, `GET /v1/tenants/:tenantId`, `POST /v1/tenants/:tenantId/brands` e `GET /v1/tenants/:tenantId/brands`.

- [ ] **Step 1: Escrever testes HTTP falhos**

Cobrir `201` no onboarding válido, `401` sem identidade, `400` para payload inválido, `404` para tenant de outro usuário, `403` para papel insuficiente e `201` para brand criada por owner/admin.

- [ ] **Step 2: Rodar os testes para confirmar falha**

Run: `pnpm vitest run tests/integration/http/onboarding.test.ts tests/integration/http/authorization.test.ts`

Expected: FAIL por ausência da aplicação e das rotas.

- [ ] **Step 3: Implementar autenticação de contexto e rotas**

Extrair identidade do JWT validado pelo Supabase; nunca aceitar `tenant_id`, `user_id` ou role de confiança a partir de campos livres do corpo; delegar autorização ao domínio e persistência ao repositório tenant-scoped.

- [ ] **Step 4: Implementar auditoria das mutações**

Registrar `correlation_id`, actor, tenant, ação, entidade, resultado e timestamp sem incluir secrets ou tokens.

- [ ] **Step 5: Rodar testes HTTP e lint/typecheck**

Run: `pnpm vitest run tests/integration/http && pnpm typecheck`

Expected: PASS, sem vazamento cross-tenant e sem mutação parcial nos erros.

- [ ] **Step 6: Publicar contrato OpenAPI v1 somente como evidência do código**

Gerar/atualizar `docs/api/s001-openapi.yaml` a partir das rotas implementadas e conferir que schemas, erros e exemplos correspondem aos testes.

- [ ] **Step 7: Commitar a API vertical**

Run: `git add src/app.ts src/http tests/integration/http docs/api/s001-openapi.yaml && git commit -m "feat: add s001 tenant onboarding api"`

## Gate B — Evidências e aceite técnico

### Task 4: Validar S-001 completo e preparar revisão

**Files:**
- Create: `docs/evidence/s001-validation.md`
- Create: `docs/evidence/s001-risk-register.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: commits das Tasks 1–3, banco local, testes e contrato OpenAPI.
- Produces: relatório reproduzível com SHA, comandos, resultados, riscos conhecidos e pacote para o Sentinel.

- [ ] **Step 1: Recriar o ambiente do zero**

Run: `supabase db reset && pnpm install --frozen-lockfile && pnpm test && pnpm typecheck`

Expected: migrations e testes passam sem dependência de estado manual.

- [ ] **Step 2: Executar testes negativos e de segurança**

Run: `pnpm vitest run tests/integration/db tests/integration/http`

Expected: cross-tenant, sem identidade, papel insuficiente, payload inválido e duplicação de slug falham conforme o contrato.

- [ ] **Step 3: Registrar riscos e limites**

Documentar que OAuth, storage, Redis, workers, publicação, frontend completo, produção e dados reais estão fora de S-001.

- [ ] **Step 4: Atualizar README apenas com comandos reproduzíveis**

Incluir pré-requisitos, bootstrap local, testes e referência ao contrato; não declarar produção, integração externa ou homologação.

- [ ] **Step 5: Preparar pacote imutável para o Sentinel**

Registrar SHA final da branch, diff, arquivos, critérios e comandos. O Sentinel deve revisar esse SHA sem editar a branch.

## Gate C — Sentinel independente

### Task 5: Revisão independente e correções

**Files:**
- Create: `docs/evidence/s001-sentinel-report.md`
- Modify: arquivos apontados pelo Sentinel somente após registrar os achados

**Interfaces:**
- Consumes: SHA final, especificação, contrato, evidências, testes e registro de riscos.
- Produces: parecer `SEM BLOQUEADORES ENCONTRADOS NO ESCOPO REVISADO`, `CORRIGIR` ou `EVIDÊNCIA INSUFICIENTE`, sempre limitado à versão revisada.

- [ ] **Step 1: Sentinel revisar em modo somente leitura**

Conferir identidade/escopo, RLS, cross-tenant, autorização negativa, migration reproduzível, auditoria, exposição de dados e correspondência entre API e testes.

- [ ] **Step 2: Corrigir achados materiais no executor**

Cada correção deve incluir teste/regressão e novo SHA; o Sentinel não altera a própria entrega.

- [ ] **Step 3: Reexecutar validações e emitir parecer final**

O parecer não autoriza merge ou deploy; apenas torna a entrega elegível ao Gate D.

## Gate D — Promotion

- [ ] Confirmar que o Gate C foi aceito.
- [ ] Preparar PR em Draft para `main`, sem merge automático.
- [ ] Aguardar GO explícito de Cadu antes de qualquer merge.
- [ ] Após aceite formal, registrar o SHA aceito e somente então abrir planejamento de S-002.

## Exit Criteria de S-001

- API de onboarding tenant/owner/brand documentada.
- Schema e migrations reproduzíveis em Supabase OSS/PostgreSQL limpo.
- RLS executável e testado com pelo menos dois tenants e dois usuários.
- RBAC e autorização negativa cobertos por testes.
- Auditoria com `correlation_id` nas mutações.
- Nenhum segredo, produção, Redis ou publicação externa utilizado.
- Evidências com SHA e comandos reproduzíveis.
- Parecer do Sentinel independente anexado.
- Nenhum merge realizado sem GO formal.
