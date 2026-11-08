# Fluxo de desenvolvimento — evidências de 08/10/2026

## Estado e limites

**PARCIAL para o pedido completo de 17 etapas.** Implementada a primeira
vertical local: briefing → descoberta estrutural → PRD preliminar → aprovação
explícita. Não é automação completa, autenticação de produção, homologação ou
GO de release. O PRD usa um template determinístico alimentado pelo briefing;
não há chamada a modelo, pesquisa automática ou agente externo instalado.

Repositório: `/Users/caduamaral/Documents/ChatGPT/KESKO`.
Remote consultado: `carlosemox/KESKO`; nenhuma transferência de titularidade.
Branch: `codex/development-flow`. Base/HEAD:
`5bf0df3c30b799413dea7e22c09d0b6410638acc`; alterações desta entrega ainda locais,
não commitadas, sem push, PR novo, merge ou deploy. Diretórios preexistentes
`.agents/` e `.specify/` preservados. Nenhum banco existente foi migrado.

Antes: API Fastify/pg tenant → owner → brand, oito migrations, sem UI/projetos
ou runner. Ambiente observado: Darwin arm64, Node 24.20.0, pnpm 11.19.0.
Reutilizados Fastify, pg, RLS, memberships, Vitest e runner PostgreSQL existente;
nenhuma dependência adicionada. O schema privado novo é aditivo.

## Comportamentos entregues

- Projeto ou mudança com 11 campos de briefing; rascunhos incompletos aceitos.
- Lista/reabertura com estado persistido, 17 etapas, dependências e próxima ação.
- Validação da descoberta; três falhas por revisão interrompem a etapa.
- PRD preliminar fiel ao briefing, aguardando aprovação de owner/admin.
- Edição antes da aprovação invalida os gates e mantém histórico; após aprovação,
  uma nova mudança é necessária. Não há reescrita silenciosa de decisão aprovada.
- Artefatos com SHA-256 do conteúdo UTF-8, identidade, data e revisão.
- Histórico append-only com entrada validada, ação, recursos, resultado,
  tentativas, erros de validação, evidências e próxima ação.
- Comandos transacionais: UUID da operação, hash canônico, versão esperada,
  lock e replay sem duplicação. Chave/payload conflitante recebe 409.
- RLS exige membership ativa; member/viewer leem, owner/admin executam.
  `authenticated` não pode alterar tabelas diretamente nem assumir executor.
- Etapas 3–17 não têm executor. Após PRD aprovado, Jornada fica bloqueada;
  nenhum check, aprovação Sentinel, CI, staging ou release é inventado.
- Interface local com labels, foco visível, mensagens de estado, CSP,
  textContent para dados dinâmicos e retry manual da mesma operação incerta.
  Uma página com envio incerto deve permanecer aberta; operação pendente do
  navegador ainda não é persistida entre fechamentos forçados.

## Arquivos

Código novo: `src/workflow/{model,repository,routes,ui}.ts`, `src/server.ts`,
`src/http/local-boundary.ts`. Integração: `src/app.ts`.
Banco: `supabase/migrations/20261008122639_development_flow.sql`.
Operação local: `package.json`, `scripts/test-postgres.mjs`, `README.md`.
Testes: `tests/unit/workflow/model.test.ts`,
`tests/db/workflow-persistence.test.ts`,
`tests/integration/workflow-api.test.ts`,
`tests/integration/workflow-ui.test.ts`,
`tests/integration/http/local-boundary.test.ts`.
Spec e plano: `docs/superpowers/{specs,plans}/2026-10-08-development-flow.md`.

## Verificações observadas pelo executor principal

| Comando/verificação | Resultado atual |
| --- | --- |
| `CI=true corepack pnpm install --frozen-lockfile --offline --ignore-scripts` | Exit 0; lockfile inalterado, dependências já atualizadas |
| `CI=true corepack pnpm lint` | Exit 0; tipos/unused e Prettier aprovados |
| `CI=true corepack pnpm typecheck` | Exit 0 |
| `CI=true corepack pnpm build` | Exit 0 |
| `CI=true PGSSLMODE=require corepack pnpm test:postgres` | Exit 0; **100 passed, 0 failed, 0 skipped**, 13 arquivos |
| `CI=true corepack pnpm audit --prod --audit-level=high --config.fetch-retries=0` | Exit 0; “No known vulnerabilities found” |
| Browser real via interface local | Criação, descoberta, PRD, aprovação sintética, bloqueio seguinte e reload/reabertura verificados |

Testes finais às 09:46:17 (America/Sao_Paulo), PostgreSQL 17 real, todas as nove
migrations aplicadas. Container isolado
`kesko-test-pg-2f5ed04e-365d-4a43-8de5-1c2ed9589c07`; cleanup confirmado.
A fixture SQL de `auth.uid()` não comprova integração Supabase Auth/JWKS.
Não há prova de CI remoto para esta alteração ainda não publicada.

O teste inicial de audit npm falhou por DNS no sandbox. A repetição autorizada
com acesso de rede concluiu com o resultado acima; falha de rede não foi
transformada em aprovação. Instalação offline ignorou scripts; compilação,
testes e CLI foram executados separadamente, sem alegar instalação limpa nova.

Demonstração descartável no navegador: projeto sintético
`af2f5824-dc3b-4376-b88c-172dccc1af6f`, versão 4, briefing 1. Aprovação enviada
com texto explícito **SINTÉTICA**, não aprovação humana real nem GO. Reabrir
após reload manteve versão, artefatos, aprovação de teste e Jornada bloqueada.
Demo usou container próprio `kesko-test-pg-756e43a2-4252-4a43-8c95-d618303df077`.
Servidor encerrado intencionalmente por SIGTERM (exit143); cleanup confirmado.
Somente os dados sintéticos da demonstração foram descartados, sem recuperação
prevista. Nenhum dado do usuário ou recurso preexistente foi removido.

## Revisão independente e correções

SENTINEL separado `Hubble` (`01a11b86-c71a-7071-ab8f-ed94606960a5`), sem autoria
do código, encontrou P1: UI verificava Host/IP local, mas API permitia Host
estrangeiro com identidade local. Reprodução independente por injeção HTTP;
nenhuma exploração de dados reais.

Correção: guarda compartilhada `isLocalRequest`, hook global antes de todas
as rotas (inclusive S-001), defesa adicional nas rotas de workflow registradas
isoladamente. Rejeita host estrangeiro, cliente não local e headers forwarded
forjados antes do banco. Quatro testes falharam antes da correção e passaram
depois. Suíte final acima inclui a regressão.

**Reavaliação independente: SEM BLOQUEADORES ENCONTRADOS NO ESCOPO REVISADO.**
P1 encerrado após verificação da guarda local. SENTINEL executou diretamente
a suíte PostgreSQL 17: nove migrations, 13 arquivos, **100 passed, 0 failed,
0 skipped**, exit0 e cleanup confirmado do container
`kesko-test-pg-034d9d19-4656-46a9-976a-a7a2cff9f177`.
Escopo: primeira vertical local briefing → descoberta → PRD → aprovação
registrada. Browser/lint/typecheck/build/audit são evidências do executor
principal, não execução do revisor. Aprovação sintética não equivale a aceite
humano real. Sem GREEN integral, homologação ou GO de release.

## Problemas resolvidos e prevenção

| Causa raiz | Correção | Regressão/evidência |
| --- | --- | --- |
| `findLast` fora do alvo ES2022 | Busca reversa compatível, sem trocar target | Typecheck/build |
| Próxima ação sugeria executor inexistente | Estado/ação bloqueados e sem botão executar | Testes de domínio + navegador |
| Motivo de dependência permanecia após resolver pré-requisito | Recalcular etapa pronta após transição | Teste de desbloqueio |
| Hash de artefato calculado sobre string JSON, não conteúdo bruto | SHA-256 do UTF-8 do conteúdo | Recomputação independente em teste |
| Histórico somente com tipo/versão perdia briefings não validados | Evento contém entrada e resultado estruturados | Teste PostgreSQL de revisões sem artefatos |
| Restrição local aplicada só na UI | Guarda em toda API local | Sentinel P1 e testes RED→GREEN |

## Lacunas e próxima etapa

Ainda não implementados: execução das etapas 3–17, documentos de jornada/design/
TRD/API/segurança, registro estruturado completo de riscos/decisões/responsáveis,
fila/worker remoto, persistência de envio incerto após fechamento do browser,
conectores externos, autenticação real, CI desta versão, staging e operação.
Listagens/histórico não têm paginação neste slice local; não expor publicamente.
O papel `kesko_workflow_executor` é backend NOLOGIN e não pode ser concedido a
`anon`/`authenticated`. Adoção em outro banco exige revisão do administrador.

Próxima entrega segura: registro versionado e revisável de jornada/estados
baseado no PRD aprovado, mantendo validação humana e evidências por etapa.
Não é necessário login, token, contratação ou ação externa do usuário para
receber esta entrega local. Para experimentá-la, seguir `pnpm demo:workflow`
no README: somente dados sintéticos; Ctrl+C/limite de 30 minutos descarta a demo.
Nenhuma migração remota é condição para testar esse modo.

Reversão: parar servidor e retornar aplicação anterior, preservando novas
tabelas/dados. Não gerar DROP automático nem alterar Production.

## Memória

Nenhum `MEMORY_PROTOCOL.md` ou lesson validada foi encontrado no repositório.
Não foi criada política/governança nem promovidos candidatos a memória válida.

- MEMORY_APPLIED: NONE
- MEMORY_CONFLICTS: NONE
- MEMORY_RECURRENCE: NONE comprovada
- MEMORY_UNKNOWN: GLOBAL; protocolo local inexistente
- MEMORY_CANDIDATES: guarda local deve proteger UI e API; evidência com hash
  reproduzível; histórico deve preservar entrada e resultado, não só status.
