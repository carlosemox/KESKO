# Auditoria de preparação — 2026-10-04

## Identidade e limites

Repositório confirmado: `carlosemox/KESKO`, público. Branch de trabalho:
`codex/S-001-foundation-tenancy`, base da auditoria
`e6ac79ea17ca1cccce2c12b626560a419a181e54`. Consulta remota confirmou a mesma
referência; `main` continua em `6e61cef114f544985f31ebb6b0769a35aec4b6b7`.
Sem rebase, force-push, reset, merge, deploy ou alteração de produção.
As mudanças locais de documentação anteriores foram preservadas.

Conector GitHub confirmou `carlosemox` com admin/push e PR #2 aberto/Draft.
`caduamaral2601` tem acesso `read` no repositório, não Write. Isso não equivale
a uma revisão humana aprovada com permissão de escrita. A eventual integração
continua dependente das alçadas; a presente auditoria não aprova merge.

## Resultado observável e correções

| Causa raiz | Evidência anterior | Correção e prevenção | Regressão |
|---|---|---|---|
| Erro no rollback mascarava erro original e devolvia conexão inválida ao pool | Teste direcionado falhou antes da correção | Preservar erro original e descartar conexão via `release(true)` | `tests/unit/db/client.test.ts` |
| Pool não tratava erro de conexão ociosa | Evento `error` lançava exceção; zero listeners | Listener com mensagem genérica sem SQL/credenciais | Mesmo arquivo, canários de segredo |
| UUID de rota inválido chegava ao repositório | Três regressões falharam com 404; PostgreSQL podia devolver 22P02 | Validar após autenticação e antes da persistência; OpenAPI 400 | `tests/integration/http/authorization.test.ts` |
| Policy mantinha acesso do criador sem membership ativa | Exceção `created_by = auth.uid()` nas migrations antigas | Migration forward-only `20261004193812` exige membership ativa | Casos criador suspenso/removido no RLS |
| Grants padrão Supabase incluíam operações fora do RLS | Consulta real: TRUNCATE permitido nas 8 combinações; regressão de ACL falhou, 24 permissões verdadeiras | Migration `20261004203752` revoga TRUNCATE/REFERENCES/TRIGGER de PUBLIC, anon e authenticated nas quatro tabelas | Consulta não destrutiva de 24 permissões efetivas |
| Teardown podia não executar após falhas intermediárias | Revisão de aquisição, cleanup HTTP e clientes RLS | `finally`/`afterEach`, rastreamento de clientes e tenants sintéticos | Suíte completa e encerramento do executor |
| Verificação dependia de banco compartilhado e ignorava testes de DB por padrão | Teste inicial: 23 aprovados, 6 skips | Runner PostgreSQL descartável, identidade/label única, loopback, tmpfs, timeout e limpeza restrita | `pnpm test:postgres` |
| PGSSLMODE herdado afetava banco descartável sem TLS | Sentinel reproduziu configuração SSL herdada | URL explícita sem TLS somente no contêiner efêmero de loopback | Execução com `PGSSLMODE=require` |

Não foram alteradas migrations históricas. As duas novas migrations foram
conferidas por `supabase db push --local --dry-run --skip-vault` e aplicadas
somente ao Supabase local por `--local --skip-vault --yes`, sem seed/reset.

## Validações e limitações de evidência

- Instalação limpa concluída: 111 pacotes, `--frozen-lockfile`, sem nova resolução.
  Tipos Node atualizaram de 26.6.3 para 26.6.4 ao adicionar Prettier; versão foi
  fixada. TypeScript 7.0.2 e Vitest 5.0.3 também passaram de `latest` a versões fixas.
- RED direcionado: 5 falhas e 6 aprovados antes das correções; depois 11/11 aprovados.
- `lint`: TypeScript com unused-symbol checks e Prettier; não é um scan SAST.
  Lint, typecheck estrito, build e `git diff --check` passaram.
- Auditoria do registro npm de dependências de produção: zero vulnerabilidades
  conhecidas nas 61 dependências contabilizadas. Não prova ausência de falhas de código.
- Executor Lagrange registrou 39/39 testes, 8/8 arquivos, zero skips em PostgreSQL
  17 real descartável, todas as oito migrations e `PGSSLMODE=require`, exit 0.
  A repetição pelo orquestrador sofreu timeout do Docker na migration 0002;
  não executou as assertions e não conta como aprovação. Não ocultar esse resultado.
- Pós-migration no Supabase local: `RUN_DB_TESTS=1 vitest run
  tests/integration/db/migrations.test.ts` passou 2/2, confirmando as 24 permissões
  efetivas negadas. O contêiner da repetição interrompida foi consultado novamente
  e não existe. Outro contêiner anterior, identificado por label e ID imutável,
  foi removido; apenas dados sintéticos descartáveis foram eliminados.
- Timeout Docker elevado de 30 para 90 segundos e readiness de 60 para 120,
  conforme revisão independente; falhas e limite global do CI continuam ativos.
  A validação remota da versão final ainda é requerida.
- O bootstrap SQL reproduz roles/privilégios e `auth.uid()`, mas não constitui
  autenticação Supabase, validação de JWT/JWKS ou infraestrutura de staging.
- Workflow `.github/workflows/validation.yml` preparado para PRs contra main e
  pushes `codex/**`, Ubuntu 24.04, Node 24, PostgreSQL 17, sem secrets nem deploy.
  Evidência remota deve ser consultada no SHA final; arquivo sozinho não comprova CI.

## Revisão independente

Halley revisou código, contratos, policies e ACLs sem editar implementação:
sem bloqueadores encontrados nas correções, condicionado às verificações reais.
Lovelace revisou executor/CI e encontrou o problema SSL, encaminhado e corrigido.
Nenhum desses pareceres simula uma aprovação GitHub humana ou autoriza produção.

## Ambiente e próximos gates

macOS 26.6.2 arm64, seis CPUs, 8 GiB RAM, 238 GiB de disco disponíveis.
Snapshots de CPU/VM não estabelecem causa para lentidão. Houve timeouts reais
do Docker e indisponibilidade do controle de navegador; APIs GitHub funcionaram.
Falhas de instalação em sandbox ocorreram por DNS bloqueado e store diferente;
a reinstalação autorizada usando o store existente resolveu as dependências.
Nenhuma configuração global de pnpm foi alterada.

Redis, frontend, staging e autenticação de produção não pertencem ao contrato
S-001 atual. Os documentos PRD/handoff citados no histórico continuam ausentes
do checkout; o módulo Agente de Preparação permanece PLANEJADO, não implementado.
Não extrapolar o resultado deste slice para outro contrato ainda não reconciliado.

## Memória operacional

`MEMORY_APPLIED: NONE` — sem protocolo local validado para novas lições.
`MEMORY_CONFLICTS: NONE_IDENTIFIED`.
`MEMORY_RECURRENCE: sandbox/store/Docker exigem diagnóstico, não reset do projeto`.
`MEMORY_UNKNOWN: causas dos timeouts Docker e fontes externas ausentes`.
`MEMORY_CANDIDATES: testar privilégios fora do RLS; fixture fiel aos defaults;
preservar erro original e descartar conexão após rollback falho; isolar settings
de DB herdados em executores descartáveis`. Candidatos, não política nem treinamento.
