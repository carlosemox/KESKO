# Development Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans.

**Goal:** Integrar briefing → descoberta → PRD → aprovação com retomada real.
**Architecture:** Módulo aditivo Fastify, domínio puro, snapshot PostgreSQL
versionado, histórico append-only, UI HTML servida pela mesma aplicação.
**Tech Stack:** Node 24, TypeScript, pg, Fastify, Vitest; sem nova dependência.
**Spec:** docs/superpowers/specs/2026-10-08-development-flow.md

## Global Constraints
Branch codex/development-flow; preservar .agents/.specify e S-001.
Somente local/banco descartável; não alterar main, remoto ou Production.
Sem simular integração ou autenticação de produção. Formato v1 persistido.

## Review Focus
- Payload/chave de operação alterados não podem produzir falso replay.
- Membership removida e IDs trocados nunca dão acesso residual.
- Edição de briefing invalida PRD; aprovação não aceita artefato antigo.
- Gate de etapa não avança por status enviado no corpo.
- Erro e timeout não expõem SQL/segredos nem perdem histórico.

### Task 1: Domínio determinístico
Files: src/workflow/model.ts, tests/unit/workflow/model.test.ts.
Interfaces: newProject(input,actor,id,tenantId,now); applyCommand(project,command,actor,now);
nextAction(project); snapshots serializáveis em JSON, erros WorkflowError.
- [x] Testar validação, dependências, limite3, revisão e aprovação (RED); replay na tarefa2.
- [x] Implementar catálogo17, estados, briefing e artefatos; executar testes.

### Task 2: Persistência e HTTP
Files: src/workflow/repository.ts, src/workflow/routes.ts, src/app.ts,
supabase/migrations/20261008122639_development_flow.sql, tests/db/workflow-persistence.test.ts.
Interfaces: repository create/list/get/command, contexto TenantContext,
rotas e payloads definidos na spec; lock e evento na mesma transação.
- [x] Testar roundtrip HTTP, nova instância de app, concorrência, RLS e DML negado.
- [x] Criar migration com CLI; implementar adapter e rotas.
- [x] Rodar suite em PostgreSQL descartável; nunca resetar banco existente.

### Task 3: Interface integrada
Files: src/workflow/ui.ts, src/server.ts, package.json,
tests/integration/workflow-ui.test.ts, README.md.
- [x] Testar rota HTML, CSP, assets e API não autenticada antes de implementar.
- [x] Implementar UI contextual, formulário, estados e retomada via API.
- [x] Testar interface local/navegador; registrar cobertura real e demo sintética.

### Task 4: Fechamento
Files: docs/evidence/2026-10-08-development-flow.md.
- [x] Lint, typecheck, build, suite completa e PostgreSQL real:100 passed/0 skipped.
- [x] Sentinel independente com diff e evidências; P1 corrigido e revalidado,100 testes PostgreSQL executados pelo revisor.
- [x] Relatar cobertura PARCIAL das17 etapas, comandos e lacunas remanescentes.

## Ledger
Ruling: executar plano local sem novas confirmações, conforme solicitação
explícita; o fluxo completo é decomposto, não declarado concluído.
Ruling: reutilizar checkout em nova branch; apenas dois diretórios não
versionados preexistentes, preservados. Custo de reversão: retornar branch.
Pre-flight: domínio→repository→rotas→UI compartilham contrato desta spec.
Review: Sentinel independente encontrou guarda Host/IP ausente na API; corrigida
com testes RED→GREEN e hook global. Reavaliação: sem bloqueadores no escopo
da primeira vertical local; sem GREEN integral ou GO presumido.
Evidence: docs/evidence/2026-10-08-development-flow.md.
