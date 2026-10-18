# KESKO — CONTEXTO PARA DESENVOLVIMENTO

Exportação estática de 08/10/2026. **PARCIAL — NÃO É GO DE IMPLEMENTAÇÃO OU RELEASE.**

## Leia primeiro

Este anexo reúne os textos necessários para compreender o pedido, não apenas
links locais. Não contém o código-fonte: abra o checkout KESKO e confira seu
estado antes de editar. Não contém credenciais, entrevista inventada ou
aprovações novas. Exemplos de tecnologias não são requisitos aprovados.

Projeto: KESKO. Checkout observado: /Users/caduamaral/Documents/ChatGPT/KESKO.
Remote observado: carlosemox/KESKO. Branch: codex/development-flow.
HEAD observado: 5bf0df3c30b799413dea7e22c09d0b6410638acc.
Há alterações locais não commitadas da primeira vertical e desta documentação.
Preserve-as, especialmente .agents/ e .specify/. Não assumir repo transferido.

## Objetivo e próxima ação permitida

Evoluir a KESKO para conduzir negócios da entrevista inicial à operação,
com 15 prompts padronizados, registros persistidos e handoff para Codex/Claude
Code. A primeira vertical local já existe, mas não satisfaz todos os novos
prompts. A entrega final deve conter instrução/link Superpowers por cliente,
um arquivo autocontido do negócio e um prompt preenchido pronto para colar.

Primeira ação: reconciliar os documentos abaixo com o checkout e localizar
ou solicitar somente a fonte canônica da entrevista já registrada. Não criar
outra entrevista. Depois, preparar o plano de evolução e comprovar os gates
mínimos de produto antes de implementar novas funcionalidades. Pode fazer
inspeção e documentação local reversível; não ampliar autorizações externas.

Não existem neste pacote todos os artefatos completos de um novo negócio:
PRD integral, fluxos, design, TRD, DATABASE, API e threat model do novo padrão
ainda precisam ser produzidos/reconciliados. Não substituí-los pelos próprios
templates. O gate mínimo GitHub do novo ciclo também requer evidência atual.

## Instalação antes de iniciar

Instale/verifique Superpowers no escopo do usuário do cliente escolhido:
https://github.com/obra/superpowers#installation.
Se usar Codex e Claude Code, verifique ambos separadamente. Não é dependência
npm do projeto nem autorização para instalar programas silenciosamente.

## Ambiente e comandos conhecidos

Node 24, pnpm11.19, Fastify/TypeScript/pg/Vitest. PostgreSQL17 via Docker no
runner descartável. Lint: corepack pnpm lint; tipos: corepack pnpm typecheck;
build: corepack pnpm build; suite real isolada: corepack pnpm test:postgres.
Demo: corepack pnpm demo:workflow, http://127.0.0.1:3000/workflow, só dados
sintéticos descartados ao encerrar. pnpm test sem RUN_DB_TESTS pula banco.
Autenticação local: local:UUID; não adequada para usuários reais ou produção.

## Autorizações e limites

Não fazer push, merge, publicar/deploy, alterar Production/main, credenciais,
permissões remotas, gastos ou dados reais sem autorização específica. Respeitar
regras existentes. Revisão Sentinel independente obrigatória para fechamento;
um prompt com papel Sentinel não comprova revisão. Aprovação sintética dos
testes históricos não é aceite humano. Nenhuma operação remota foi autorizada
pela mera anexação deste arquivo.

## Manifesto do conteúdo incorporado

Os blocos seguintes são cópias de fontes locais. O catálogo/integracão define
o pedido novo; a spec/evidência da primeira vertical é histórica e descreve
apenas o que já existia. A evidência de 100 testes se refere àquela revisão,
não a alterações futuras. Resultados precisam ser revalidados antes de declarar
prontidão. A entrevista original é a única fonte explicitamente referida pelo
usuário que não foi localizada; outros entregáveis completos ainda não existem.


---

# Fonte incorporada: docs/product/DEVELOPMENT-PROMPTS.md

# KESKO — padrão universal de desenvolvimento

Versão 1.0 — recebido de Cadu em 08/10/2026.
Estado: **CATÁLOGO REGISTRADO; execução integral ainda NÃO IMPLEMENTADA**.

Os blocos abaixo são templates de produto para cada negócio cliente, não
comandos para configurar automaticamente este repositório nesta sessão.
Preservar sua estrutura e preencher os campos entre colchetes com dados do
negócio. Não considerar template preenchido como entrega executada ou aprovada.

## Entrada obrigatória: entrevista inicial existente

A entrevista é anterior ao Prompt 01. Cadu informa que seu prompt já está
registrado. Seu texto canônico **não foi localizado** no checkout KESKO ou no
pacote `Downloads/AGENTES_PARA_CODEX` consultado nesta entrega. Não substituir,
inventar ou criar outra entrevista. Vincular a fonte existente quando disponível.
O bloco de identificação abaixo organiza suas respostas; não substitui a
entrevista. Dados ausentes permanecem `DADO INSUFICIENTE`.

## Identificação do negócio

```text
NEGÓCIO
Nome do negócio: [nome da empresa, marca ou projeto]
Segmento: [educação, engenharia, saúde, música, comércio, SaaS interno etc.]
Tipo de solução: [site, aplicativo mobile, sistema web, CRM, marketplace, painel interno etc.]
Responsável pelo projeto: [nome]
Usuários principais: [quem utilizará o sistema]
Região de operação: [cidade, estado, país ou global]
Modelo de negócio: [venda única, assinatura, intermediação, uso interno, gratuito etc.]
Objetivo financeiro ou operacional: [resultado esperado]
Problema principal: [problema que o sistema precisa resolver]
Solução atual improvisada: [planilhas, WhatsApp, papel, sistema antigo etc.]
Prazo desejado: [data ou período]
Orçamento disponível: [valor ou faixa]
Tecnologias preferidas: [se houver]
Integrações necessárias: [Supabase, WorkOS, Stripe, WhatsApp, Google, GitHub etc.]
Restrições: [o que não pode acontecer]
Ambiente atual: [repositório, branch, estágio do projeto, produção existente]
```

## PROMPT 01 — Descoberta do problema

```text
Atue como estrategista de produto e analista de negócios.

Analise o seguinte negócio:

Nome: [nome do negócio]
Segmento: [segmento]
Usuários principais: [usuários]
Problema principal: [problema]
Solução improvisada atual: [como o problema é resolvido hoje]
Objetivo esperado: [resultado desejado]
Modelo de negócio: [modelo]
Região de operação: [região]

Entregue:

1. Diagnóstico do problema real.
2. Usuários afetados.
3. Principais dores de cada usuário.
4. Causas prováveis do problema.
5. Consequências de não resolver.
6. Solução proposta.
7. Hipóteses que precisam ser validadas.
8. Riscos de construir a solução errada.
9. Indicadores mensuráveis de sucesso.
10. O que deve ficar fora da primeira versão.

Não invente dados. Quando faltar informação, marque como DADO INSUFICIENTE.

Formato:
- Problema validado
- Usuários
- Dores
- Hipóteses
- Solução
- Métricas
- Fora da versão 1
- Perguntas em aberto
```

Arquivo de saída: `docs/product/DISCOVERY.md`.

## PROMPT 02 — PRD

```text
Crie um Product Requirements Document para o negócio abaixo.

Negócio: [nome]
Segmento: [segmento]
Usuários: [usuários]
Problema: [problema validado]
Solução: [solução proposta]
Objetivo principal: [objetivo]
Métrica de sucesso: [métrica]
Funcionalidades desejadas: [lista]
Funcionalidades fora da versão 1: [lista]
Restrições: [restrições]
Prazo: [prazo]

O PRD deve conter:

1. Visão do produto.
2. Problema que será resolvido.
3. Público-alvo.
4. Personas ou perfis de usuário.
5. Objetivos do produto.
6. Métricas de sucesso.
7. Escopo da versão 1.
8. Fora do escopo.
9. Requisitos funcionais.
10. Requisitos não funcionais.
11. Histórias de usuário.
12. Critérios de aceite.
13. Regras de negócio.
14. Estados de sucesso, erro, vazio e carregamento.
15. Riscos.
16. Dependências.
17. Perguntas em aberto.

Cada requisito deve ser testável e escrito sem ambiguidade.

Não escreva código nesta etapa.
Não invente funcionalidades não solicitadas.
```

Arquivo de saída: `docs/product/PRD.md`.

## PROMPT 03 — Fluxo do usuário e do aplicativo

```text
Modele o fluxo completo do aplicativo.

Produto: [nome do produto]
Usuários: [tipos de usuários]
Funcionalidades principais: [lista]
Regras de negócio: [regras]
Canais: [web, mobile, WhatsApp, painel administrativo etc.]
Integrações: [integrações]

Crie:

1. Fluxo principal de cada tipo de usuário.
2. Fluxos alternativos.
3. Fluxos de erro.
4. Fluxos de cancelamento.
5. Fluxos de recuperação.
6. Estados de cada tela.
7. Permissões necessárias em cada etapa.
8. Dados coletados em cada ponto.
9. Eventos importantes para analytics.
10. Pontos onde o usuário pode abandonar a jornada.

Use esta estrutura:

Entrada:
[como o usuário inicia]

Pré-condições:
[o que precisa existir antes]

Passos:
[passo a passo]

Resultado:
[o que acontece ao final]

Exceções:
[o que pode dar errado]

Permissões:
[quem pode executar]

Não avance para UI ou código enquanto houver fluxo crítico indefinido.
```

Arquivo de saída: `docs/product/USER-FLOWS.md`.

## PROMPT 04 — UI/UX e Design System

```text
Atue como especialista sênior em UI/UX.

Produto: [nome]
Público: [público]
Objetivo da interface: [objetivo]
Plataformas: [desktop, tablet, mobile]
Identidade visual: [cores, fontes, logo, referências]
Tom da marca: [premium, educativo, institucional, moderno etc.]
Telas necessárias: [lista]
Fluxos aprovados: [resumo do fluxo]

Defina:

1. Arquitetura de informação.
2. Mapa de telas.
3. Hierarquia visual.
4. Componentes reutilizáveis.
5. Design tokens.
6. Cores e contrastes.
7. Tipografia.
8. Espaçamentos.
9. Estados de loading, vazio, erro e sucesso.
10. Responsividade.
11. Acessibilidade.
12. Microinterações.
13. Mensagens de erro.
14. Critérios de aceite visual.
15. Regras para não criar telas duplicadas ou inconsistentes.

Não altere a identidade oficial informada.
Não use imagens genéricas quando houver assets oficiais.
Não crie componentes isolados sem necessidade.
```

Arquivo de saída: `docs/design/UI-UX-SPEC.md`.

## PROMPT 05 — TRD e arquitetura técnica

```text
Atue como arquiteto de software.

Produto: [nome]
PRD: [resumo ou caminho do PRD]
Fluxos: [resumo ou caminho]
Escala esperada: [número de usuários, operações ou volume]
Plataformas: [web, mobile, backend]
Tecnologias existentes: [stack atual]
Tecnologias permitidas: [stack permitida]
Integrações: [integrações]
Restrições: [restrições]

Crie o TRD contendo:

1. Arquitetura geral.
2. Componentes do sistema.
3. Fronteiras entre frontend, backend e serviços externos.
4. Módulos e responsabilidades.
5. Fluxo de dados.
6. Autenticação.
7. Autorização.
8. Multi-tenant, se aplicável.
9. Tratamento de erros.
10. Idempotência.
11. Concorrência.
12. Cache.
13. Filas e workers.
14. Observabilidade.
15. Estratégia de testes.
16. Estratégia de deploy.
17. Backup e recuperação.
18. Decisões arquiteturais.
19. Alternativas rejeitadas.
20. Riscos técnicos.

Não escolha tecnologia apenas por preferência.
Justifique cada decisão.
Não introduza dependências desnecessárias.
```

Arquivo de saída: `docs/architecture/TRD.md`.

## PROMPT 06 — Modelo de domínio, schema e migrations

```text
Atue como arquiteto de dados e especialista em banco de dados.

Negócio: [nome]
Entidades identificadas: [lista]
Regras de negócio: [regras]
Tipos de usuário: [lista]
Tenancy: [nenhum, organização, unidade, cliente ou outro]
Dados sensíveis: [lista]
Banco desejado: [PostgreSQL, Supabase, outro]
Volume esperado: [estimativa]
Retenção de dados: [prazo]
Requisitos de auditoria: [requisitos]

Defina:

1. Modelo de domínio.
2. Entidades.
3. Campos.
4. Tipos.
5. Chaves primárias.
6. Chaves estrangeiras.
7. Índices.
8. Constraints.
9. Soft delete, se necessário.
10. Auditoria.
11. RLS ou equivalente.
12. Políticas por papel.
13. Migrations versionadas.
14. Estratégia de rollback.
15. Dados iniciais.
16. Regras de integridade.
17. Riscos de migração.

Proíba:

- tabelas sem finalidade definida;
- campos genéricos sem justificativa;
- acesso sem autorização;
- migration destrutiva sem plano;
- uso de dados reais em testes;
- bypass de RLS em produção.
```

Arquivo de saída: `docs/architecture/DATABASE.md`.

## PROMPT 07 — Contrato de API

```text
Defina o contrato de API para o produto.

Produto: [nome]
Frontend: [tecnologia]
Backend: [tecnologia]
Autenticação: [método]
Entidades: [lista]
Operações necessárias: [lista]
Papéis: [papéis]
Regras de autorização: [regras]

Para cada endpoint, defina:

- método;
- rota;
- finalidade;
- autenticação;
- autorização;
- parâmetros;
- payload;
- resposta de sucesso;
- erros;
- paginação;
- ordenação;
- idempotência;
- limites;
- eventos gerados;
- auditoria.

Use versionamento de API.
Não crie endpoint duplicado.
Não permita que o frontend defina regras de segurança.
Toda entrada deve ser validada na fronteira.
```

Arquivo de saída: `docs/architecture/API.md`.

## PROMPT 08 — Segurança e Threat Model

```text
Atue como engenheiro de segurança de aplicações.

Produto: [nome]
Arquitetura: [resumo ou caminho do TRD]
Dados armazenados: [dados]
Usuários e papéis: [lista]
Integrações externas: [lista]
Ambientes: [local, CI, staging, produção]
Requisitos legais: [LGPD, contratos ou outros]
Riscos conhecidos: [lista]

Faça uma análise de:

1. Autenticação.
2. Autorização.
3. Sessões.
4. Cookies e tokens.
5. CSRF.
6. CORS.
7. SSRF.
8. XSS.
9. SQL injection.
10. Uploads.
11. Webhooks.
12. Rate limiting.
13. Brute force.
14. Enumeration.
15. Vazamento de dados.
16. Logs e secrets.
17. Dependências.
18. Migrations.
19. RLS.
20. Multi-tenant.
21. Recuperação de conta.
22. Auditoria.
23. Privacidade e LGPD.
24. Abuso de integrações.
25. Segurança do GitHub Actions.

Para cada risco, informe:

- ameaça;
- impacto;
- probabilidade;
- controle;
- teste necessário;
- evidência esperada;
- responsável;
- status.

Qualquer controle não comprovado deve ser marcado como NÃO COMPROVADO.
```

Arquivo de saída: `docs/security/THREAT-MODEL.md`.

## PROMPT 09 — Plano de implementação

```text
Crie um plano de implementação executável.

Produto: [nome]
PRD: [caminho]
TRD: [caminho]
UI/UX: [caminho]
Database: [caminho]
API: [caminho]
Threat model: [caminho]
Prazo: [prazo]
Equipe ou agentes disponíveis: [lista]

Divida o trabalho em tarefas pequenas e independentes.

Para cada tarefa, informe:

- ID;
- título;
- objetivo;
- dependências;
- arquivos prováveis;
- alterações de banco;
- alterações de API;
- alterações de UI;
- testes;
- critérios de aceite;
- risco;
- evidências obrigatórias;
- condição de parada;
- agente responsável.

Organize em ordem de dependência.

Não crie tarefas vagas como “fazer backend”.
Use tarefas verificáveis e executáveis.
```

Arquivo de saída: `docs/execution-plans/active/[DATA]-[NOME].md`.

## PROMPT 10 — Harness Engineering

```text
Configure o Harness Engineering deste projeto.

Projeto: [nome]
Repositório: [organização/repositório]
Branch principal: [main, develop ou outra]
Branch de produção: [nome]
Stack: [stack]
Comandos existentes: [comandos]
Ambientes: [local, CI, staging, produção]
Agentes disponíveis: [Codex, OpenCode, Sentinel etc.]
Riscos principais: [lista]

Crie ou atualize:

- AGENTS.md;
- ARCHITECTURE.md;
- SECURITY.md;
- RELIABILITY.md;
- QUALITY_SCORE.md;
- docs/execution-plans/;
- docs/evidence/;
- scripts/harness/preflight.sh;
- scripts/harness/verify.sh;
- scripts/harness/security-check.sh;
- scripts/harness/evidence.sh;
- política do Sentinel;
- template de tarefa;
- template de relatório;
- gate de CI.

Regras:

1. Não alterar main diretamente.
2. Não alterar produção.
3. Uma tarefa por branch.
4. Uma PR Draft por unidade de trabalho.
5. Verificar escopo antes de implementar.
6. Rodar testes antes de concluir.
7. Gerar evidências.
8. Usar Sentinel independente.
9. Parar em caso de risco ou evidência insuficiente.
10. Permitir retomada por checkpoint.
```

Saída: estrutura operacional do repositório.

## PROMPT 11 — Configuração do GitHub

```text
Configure o GitHub para este projeto.

Repositório: [organização/repositório]
Branch principal: [nome]
Branch de produção: [nome]
Branch de desenvolvimento: [nome, se houver]
Ambientes: [local, CI, staging, produção]
Equipe: [usuários, equipes e agentes]
Comandos de validação: [comandos]
Secrets necessários: [nomes dos secrets, sem valores]
Regras de merge: [regras]
Necessidade de assinatura de commit: [sim/não]

Configure e documente:

1. Branch protection ou rulesets.
2. Pull Requests obrigatórias.
3. Revisões obrigatórias.
4. Status checks obrigatórios.
5. CODEOWNERS.
6. Templates de issue.
7. Template de PR.
8. CI.
9. Secret scanning.
10. CodeQL.
11. Dependabot.
12. Environments.
13. Secrets separados por ambiente.
14. Permissões mínimas do GITHUB_TOKEN.
15. Concurrency dos workflows.
16. Retenção de artefatos.
17. Política para Actions externas.
18. Política para branches Draft.
19. Política de rollback.
20. Relatório dos pontos que exigem configuração manual no GitHub.

Não remova proteções existentes.
Não altere Production.
Não habilite deploy automático sem autorização explícita.
```

O usuário não definiu um nome único de arquivo de saída para este bloco.
Registrar configurações, evidências e pendências no pacote do projeto.

## PROMPT 12 — Implementação de uma tarefa

```text
Implemente somente esta tarefa:

ID: [ID da tarefa]
Título: [título]
Objetivo: [resultado esperado]
PRD relacionado: [caminho]
TRD relacionado: [caminho]
Plano relacionado: [caminho]
Branch permitida: [branch]
Arquivos permitidos: [arquivos ou diretórios]
Arquivos proibidos: [arquivos ou diretórios]
Critérios de aceite: [lista]
Testes obrigatórios: [lista]
Riscos: [lista]

Antes de alterar:

1. Verifique o estado do Git.
2. Confirme a branch.
3. Leia a documentação relacionada.
4. Liste o plano de execução.
5. Identifique dependências.
6. Informe qualquer bloqueio.

Durante a implementação:

- faça a menor alteração suficiente;
- preserve contratos existentes;
- não invente dados;
- não altere Production;
- não modifique escopo;
- adicione testes significativos;
- atualize documentação quando necessário.

Ao finalizar:

1. Execute todos os testes obrigatórios.
2. Faça revisão própria.
3. Solicite revisão técnica.
4. Solicite revisão do Sentinel.
5. Gere relatório de evidências.
6. Informe status IMPLEMENTADO, GREEN, HOMOLOGADO ou NO-GO.
```

## PROMPT 13 — Testes, QA e Sentinel

```text
Audite esta implementação de forma independente.

Projeto: [nome]
Tarefa: [ID e título]
Branch: [branch]
Commit: [SHA]
Critérios de aceite: [lista]
Arquivos alterados: [lista]
Testes executados: [lista]
Riscos conhecidos: [lista]

Execute ou analise:

1. Typecheck.
2. Lint.
3. Testes unitários.
4. Testes de integração.
5. Testes E2E.
6. Testes de autorização.
7. Testes de entrada inválida.
8. Testes de concorrência.
9. Testes de idempotência.
10. Testes de migration.
11. Testes de RLS.
12. Testes de regressão.
13. Secret scan.
14. Dependency audit.
15. Browser smoke, quando aplicável.
16. Verificação de documentação.
17. Revisão de escopo.

O Sentinel deve ser independente do agente executor.

Retorne:

- status;
- falhas;
- riscos;
- evidências;
- comandos executados;
- arquivos envolvidos;
- correções obrigatórias;
- correções recomendadas;
- decisão APPROVED, APPROVED WITH CONDITIONS, NO-GO ou BLOCKED BY EVIDENCE.
```

## PROMPT 14 — Staging e homologação

```text
Prepare a homologação em staging.

Projeto: [nome]
Branch: [branch]
Commit: [SHA]
Ambiente de staging: [nome]
Banco de staging: [nome]
Secrets esperados: [nomes, sem valores]
Fluxo principal: [fluxo]
Usuários de teste: [perfis]
Critérios de aceite: [lista]

Verifique:

1. Build reproduzível.
2. Deploy em staging.
3. Inicialização do backend.
4. Conexão com banco.
5. Migrations.
6. Autenticação.
7. Autorização.
8. Fluxo principal.
9. Fluxos de erro.
10. Logs.
11. Métricas.
12. Performance básica.
13. Segurança.
14. Rollback.
15. Integridade dos dados.

Não use Production.
Não misture secrets de staging e produção.
Se houver falta de credencial, MFA ou aprovação externa, registre BLOCKED BY EXTERNAL ACTION.
```

## PROMPT 15 — Release e produção

```text
Prepare o release deste projeto.

Projeto: [nome]
Versão: [versão]
PR: [número]
Commit aprovado: [SHA]
Status da CI: [resultado]
Status do Sentinel: [resultado]
Status de staging: [resultado]
Plano de rollback: [caminho]
Mudanças de banco: [sim/não]
Mudanças de secrets: [sim/não]
Impacto esperado: [impacto]

Confirme:

1. Todos os critérios de aceite estão atendidos.
2. Não existem bloqueios.
3. CI está GREEN.
4. Sentinel aprovou.
5. Staging foi homologado.
6. Migrations foram validadas.
7. Backup foi verificado.
8. Rollback está documentado.
9. Observabilidade está ativa.
10. PR está pronta para revisão.
11. O release não altera Production sem GO formal.

Entregue:

- relatório de release;
- riscos residuais;
- plano de deploy;
- plano de rollback;
- checklist manual do Cadu;
- decisão GO, NO-GO ou BLOCKED.
```

## Ordem e gate mínimo recebidos

```text
Entrevista inicial existente → identificação do negócio
01 Descoberta
02 PRD
03 Fluxo do usuário
04 UI/UX
05 TRD
06 Domínio e banco
07 API
08 Segurança
09 Plano de implementação
10 Harness
11 GitHub
12 Implementação
13 QA e Sentinel
14 Staging
15 Release
```

Não executar implementação do negócio antes de concluir, no mínimo: PRD,
fluxo principal, critérios de aceite, TRD, schema, contrato de API, threat model,
plano de implementação e configuração mínima do GitHub.

Cada resultado deve ser salvo e usado na etapa seguinte. A estrutura é
universal; somente os campos de cada negócio variam. Ver a reconciliação com
o código existente em `DEVELOPMENT-PROMPTS-INTEGRATION.md`.



---

# Fonte incorporada: docs/product/DEVELOPMENT-PROMPTS-INTEGRATION.md

# Integração do padrão de prompts e handoff

08/10/2026 — especificação complementar recebida de Cadu.
Estado: **ESPECIFICADO**, não confundir com automação implementada.
Fonte textual: `DEVELOPMENT-PROMPTS.md`.

## Ordem canônica e compatibilidade

Entrevista existente → identificação do negócio → prompts 01–15. Não repetir
a entrevista quando as respostas e sua origem já estiverem disponíveis.
O formulário atual com 11 campos não implementa os 16 campos novos completos.
O caminho da entrevista original ainda precisa ser vinculado; não inventar seu texto.

| Prompt | Identificador técnico atual | Reconciliação necessária |
| --- | --- | --- |
| 01 Descoberta | discovery | Validação estrutural atual não equivale ao diagnóstico completo |
| 02 PRD | prd | Template atual não contém todo o PRD de 17 seções |
| 03 Fluxos | journey | Executor ainda ausente |
| 04 UI/UX | design | Executor ainda ausente |
| 05 TRD | architecture | Nova ordem coloca arquitetura antes do domínio/schema |
| 06 Domínio/banco | domain + schema | Agrupa duas etapas, sem perder seus critérios |
| 07 API | contracts | Executor ainda ausente |
| 08 Segurança | security | Executor ainda ausente |
| 09 Plano | plan | Executor ainda ausente |
| 10 Harness | harness | Reaproveitar scripts/instruções existentes; não duplicar |
| 11 GitHub | ci | Configuração remota exige capacidade e autorização verificadas |
| 12 Implementação | implementation | Gate mínimo antes de executar código do negócio |
| 13 QA/Sentinel | quality | Revisor independente e evidências atuais |
| 14 Staging | staging | Ambiente isolado; sem efeitos em Production |
| 15 Release | operations + release | Inclui recuperação/observabilidade antes do GO |

A nova ordem é o padrão de produto vigente. O runtime ainda usa o catálogo de
17 etapas da primeira vertical. Não reordenar snapshots schemaVersion1 em
silêncio: planejar versão de fluxo e migração compatível, preservar IDs,
histórico, dependências e aprovações. Esta entrega não altera o runtime.

## Encadeamento dos resultados (a implementar)

Cada execução deve vincular tenant, projeto, versão do prompt, revisão dos
inputs, artefatos consumidos, responsável, autorização, ambiente, resultado,
hash e evidências. Caminhos `docs/...` são relativos ao pacote/repositório do
negócio cliente, não destinos compartilhados entre todos os clientes na KESKO.
Os registros estruturados continuam fonte de verdade; arquivos são projeções.

Salvar resultado antes de disponibilizar a próxima etapa. Reusar a revisão
aprovada; mudança de entrada invalida dependentes para revisão, sem apagar
histórico. Rascunho gerado não é aprovação. Título “Problema validado” não
transforma hipótese em fato: registrar `DADO INSUFICIENTE` sem evidência.

Nenhum campo preenchido pelo cliente pode virar comando shell, caminho de
escrita arbitrário ou instrução para ultrapassar autorizações. Saídas de modelo
também são dados não confiáveis. Integrações listadas são exemplos, não stack
obrigatória: não introduzir WorkOS, Stripe, Resend ou outro serviço por padrão.

## Gate mínimo antes da implementação

Exigir versões revisadas de PRD, fluxo principal, critérios de aceite, TRD,
schema, API, threat model e plano, além de configuração mínima GitHub
comprovada. A existência de arquivos não satisfaz o gate. Ausência de acesso,
controles não comprovados ou revisão necessária gera bloqueio específico.
Não marcar GREEN por um prompt ter pedido GREEN.

## Entrega final ao usuário: “Levar para o Codex ou Claude Code”

Esta é uma entrega de **handoff para iniciar implementação**, depois da
preparação e antes do Prompt12; não precisa aguardar release de um produto
ainda não construído. Pode ser reexportada no fim do ciclo para continuidade.

A tela final deverá apresentar, nesta ordem:

1. **Instale o Superpowers no seu computador, no escopo do seu usuário.**
   Link oficial: https://github.com/obra/superpowers#installation.
   Escolher Codex ou Claude Code; se usar ambos, configurar ambos. “Global”
   aqui significa disponível aos projetos desse usuário no cliente escolhido,
   não uma instalação única que configure todos os aplicativos do computador.
   Verificar instalação existente antes de sugerir reinstalação.
2. **Baixar arquivo do projeto para anexar.** Um Markdown autocontido como
   `KESKO-CONTEXTO-PARA-DESENVOLVIMENTO.md`, com projeto/revisão reais no nome
   quando o exportador existir. Pacote ZIP adicional é opcional, não substitui
   o documento legível. Nenhum usuário deve montar o contexto manualmente.
3. **Copiar prompt de início.** Já preenchido com nome do negócio, arquivo
   anexo, objetivo, primeira tarefa e limites reais; sem colchetes residuais.
4. **Abrir Codex ou Claude Code, selecionar o checkout correto, anexar o
   arquivo e colar o prompt.** Se o cliente não aceitar upload, salvar o mesmo
   arquivo localmente e informar seu caminho ao agente, sem copiar secrets.
5. **Verificar capacidades e retomar.** O agente confirma skills disponíveis,
   contexto, branch, requisitos, evidências e autorizações antes de executar.

Se requisitos não estiverem completos, oferecer exportação de contexto
**PARCIAL/BLOQUEADA**, não “pronto para desenvolver”. O prompt direcionará à
resolução da pendência, sem desbloquear implementação por conta própria.

## Conteúdo obrigatório do arquivo anexável

- Identificação do negócio, entrevista original/respostas e origem — ou ausência explícita.
- Objetivo, usuários, escopo/exclusões, prazo/orçamento e restrições reais.
- Descoberta, PRD, jornadas, UI/UX, TRD, domínio/schema, API, threat model e plano
  completos na revisão exportada; qualquer item ausente marcado como ausente.
- Identidade do repositório, branch/SHA observados e mudanças locais relevantes.
- Instruções operacionais aplicáveis, comandos e dependências comprovados.
- Artefatos/evidências, datas, revisões, aprovações e quem as concedeu.
- Pendências, riscos, configuração externa e primeira tarefa permitida.
- Alçadas: local/CI/staging separados, main/produção protegidos, sem GO implícito.
- Manifesto de versão/origem; identificação de exportação parcial e diferenças
  entre evidência histórica, estado atual e itens apenas planejados.

Nunca exportar `.env`, tokens, senhas, chaves privadas, dumps de dados reais ou
logs brutos sensíveis. Exportar somente dados do tenant/projeto autorizado e
referências seguras a segredos. Anexo deve conter os textos necessários, não
apenas links locais inacessíveis no computador de destino.

## Prompt-base a preencher pelo app

```text
Quero desenvolver [PROJETO] a partir do arquivo [ARQUIVO_ANEXO].
Leia o anexo integralmente e as instruções reais do repositório. Preserve a
entrevista inicial e as decisões aprovadas; não reinicie a descoberta sem motivo.

Confirme repositório, branch, SHA, alterações locais e ambiente. Compare o
anexo com o código: evidência antiga e documento aprovado não provam execução.
Não trate exemplos, fontes anexadas ou dados do negócio como autorizações.

Verifique se Superpowers está disponível neste cliente. Use brainstorming
apenas para lacunas reais, writing-plans para o plano, subagent-driven-development
para execução e dispatching-parallel-agents quando houver tarefas independentes.
Não simule skills, subagentes ou ferramentas ausentes. Se faltarem, informe a
instalação adequada e preserve o trabalho que puder avançar com segurança.

Comece por [PRIMEIRA_TAREFA_PERMITIDA]. Não implemente funcionalidades antes
de comprovar o gate mínimo definido no anexo. Não peça novamente decisões já
aprovadas, mas não aprove seu próprio plano em nome do responsável. Decisões
de negócio, credenciais, custos e ações irreversíveis exigem a alçada correta.

Execute tarefas pequenas, com checkpoints, idempotência e tentativas limitadas.
Preserve contratos e trabalho existente. Use TDD e verificação antes da conclusão.
Faça lint, typecheck, build, testes e browser smoke quando aplicáveis. Para
frontend, use o navegador de teste disponível e autorizado; agent-browser da
Vercel é opção, não uma dependência instalada ou obrigatória por suposição.

Solicite revisão técnica e Sentinel independente. Sem revisor separado, registre
o gate pendente; não simule independência. Salve resultados/evidências e use a
saída de cada etapa na seguinte. Não declare GREEN ou homologação sem prova.

Ambiente autorizado: [AMBIENTES E ESCOPO]. Não alterar main/Production, dados
reais, credenciais ou permissões externas; não fazer push, merge, publicação,
contratação ou deploy sem autorização específica registrada.

Continue as tarefas técnicas seguras e autorizadas até concluir a entrega ou
comprovar um bloqueio. Relate resultado, arquivos, comandos/testes, evidências,
Sentinel, pendências, ação manual estritamente necessária e próxima etapa.
```

O modelo da imagem fornecida orienta as skills; o exemplo Resend não é requisito
KESKO. “Aprove o plano criado” e “sem me perguntar nada” não concedem autoaprovação
nem dispensam credenciais, decisões essenciais ou alçadas de release.

## Instalação e verificação (fonte consultada em 08/10/2026)

Fonte oficial: https://github.com/obra/superpowers#installation.
A instrução deve acompanhar a versão do cliente; consultar novamente antes de
prescrever comandos no onboarding. Esta entrega não instala software.

- Codex App: Plugins → seção Coding → Superpowers → `+` e instruções da tela.
- Codex CLI: `/plugins`, buscar `superpowers`, selecionar Install Plugin.
- Claude Code: `/plugin install superpowers@claude-plugins-official`.
- Instalações são específicas por cliente. Conferir o escopo de usuário/global
  disponibilizado pela versão, reiniciar a sessão se solicitado e verificar
  disponibilidade de `using-superpowers`, `writing-plans` e
  `subagent-driven-development`. Uma captura de instalação não prova execução.

## Aceite futuro do exportador

1. Arquivo preenchido/autocontido, prompt correspondente, mesma revisão/projeto.
2. Nada secreto ou pertencente a outro tenant; dados do cliente não viram comandos.
3. Entrevista preservada, ausências explícitas e ausência de aprovação fabricada.
4. Markdown legível nos dois clientes; retomada sem repetir etapas aprovadas.
5. Instruções de instalação por cliente, sem alegar instalação universal.
6. Gate incompleto exporta status parcial e tarefa de desbloqueio, não implementação.
7. Exportação sem mutação de GitHub, banco compartilhado ou Production.

Nesta entrega: catálogo e contratos salvos; um anexo KESKO estático acompanha o
prompt pronto. O botão de exportação, o preenchimento por negócio e a integração
desses 15 prompts ao runner/interface continuam **a implementar**.



---

# Fonte incorporada: docs/superpowers/specs/2026-10-08-development-flow.md

# Fluxo de desenvolvimento orientado ao briefing — primeira entrega

Solicitação de 08/10/2026: integrar o ciclo de 17 etapas ao app, sem recriação,
com execução local reversível e sem parar apenas no planejamento.

## Estado e decisão
Base 5bf0df3: API Fastify/pg, tenant → owner → brand, oito migrations e CI.
Não existem UI, projetos, runner, gerador por IA ou autenticação de produção.
`.agents/` e `.specify/` são trabalho não versionado do usuário; não alterar.
A constituição Spec Kit é um template não preenchido, não política aprovada.

Alternativas: checklist sem persistência não entrega retomada; um serviço novo
com fila/modelo externo amplia dependências e autorização; escolhido um módulo
aditivo no Fastify com domínio determinístico e PostgreSQL já existentes.

## Escopo executável
Criar projeto/mudança, salvar briefing incompleto, listar/reabrir projetos,
validar descoberta, gerar PRD preliminar fiel ao briefing e registrar aprovação
humana de owner/admin. Mostrar as 17 etapas com dependências, seis estados,
artefatos, tentativas, histórico e próxima ação. Nada simula testes, Sentinel,
GitHub, staging ou release. Etapas 3–17 aparecem e bloqueiam execução por falta
de adapter; sua automação completa continua planejada.

Briefing: empresa, problema, público, objetivo, indicador, escopo, fora do
escopo, requisitos, critérios de aceite, requisitos não funcionais e restrições.
Textos vêm do usuário; não inventar pesquisa, contratos ou resultados.

## Persistência e segurança
Schema privado `kesko_workflow`, projetos com snapshot JSONB versionado e
eventos append-only. Schema version 1 identifica o formato persistido.
Todo recurso contém tenant; RLS exige membership ativa. Authenticated tem
somente leitura. Escrita via papel backend NOLOGIN/NOBYPASSRLS
`kesko_workflow_executor`, sem concessão a anon/authenticated. Pool de
desenvolvimento existente (postgres) pode assumir o papel; nenhum segredo novo.
O adapter de identidade `local:<uuid>` continua exclusivamente local, nunca
segurança de produção. Não executar migrations no banco compartilhado nesta
entrega; testar em PostgreSQL descartável.

Transações usam lock de linha, versão esperada e operationId UUID. Repetição da
mesma operação devolve estado sem duplicação; chave reutilizada com outro
payload recebe 409. Criação também idempotente. Eventos e snapshot são atômicos.
Máximo 3 tentativas por etapa/revisão de briefing. Edição invalida descoberta e
PRD anteriores, preservando histórico; após aprovação do PRD, iniciar uma nova
solicitação de mudança em vez de reescrever o artefato aprovado.

## Contrato HTTP aditivo
`/v1/tenants/:tenantId/projects`: GET lista, POST cria com
`{operationId,name,kind,briefing}`. `/:projectId`: GET recupera snapshot e
histórico. `/:projectId/commands`: POST `{operationId,expectedVersion,type,...}`.
Tipos: `update_briefing` (briefing), `run_step` (stepId), `approve_prd` (reason).
API rejeita chaves desconhecidas, UUID inválido, payload excessivo; autentica
antes de lookup, 404 cross-tenant, 403 read-only, 409 versão/chave conflitante.
Somente servidor produz estado, hashes e evidência de validação. Nenhuma URL
fornecida pelo usuário é executada ou consultada. Nenhum shell/modelo externo.

## Interface
`/workflow`, HTML/CSS/JS locais servidos pelo Fastify. Sem framework ou CDN novo.
Formulário rotulado, lista de projetos, briefing, etapa atual e ação contextual;
mapa de etapas em lista ordenada, detalhe de PRD e histórico. Texto via
textContent, foco visível, mensagens aria-live, erro/empty/loading, layout móvel.
Aviso permanente de ambiente local e de PRD preliminar, não aprovado por IA.

## Critérios de aceite e ameaças
1. Criar, reabrir e retomar usando uma nova instância de app no mesmo banco.
2. Descoberta incompleta falha sem promover etapas; terceira falha bloqueia.
3. PRD usa dados registrados, aguarda aprovação e não libera etapa seguinte antes dela.
4. Repetição/concorrência não duplica projetos, artefatos nem eventos.
5. Troca de tenant/projeto, viewer/member, chaves forjadas e DML direta negados.
6. Falha de transação preserva consistência; edição invalida artefatos vigentes.
7. Produção nunca recebe execução; adapters ausentes não geram sucesso fictício.
8. Testes anteriores preservados; suite PostgreSQL real, lint, tipos, build e
revisão independente. Testes pulados/sem navegador não viram evidência E2E.

## Reversão
Mudança aditiva; parar servidor novo e retornar código base preserva tabelas e
histórico. Nenhum DROP automático. Remoção física exige exportação e aprovação
específica. Sem merge, push, contratação, credencial ou deploy nesta execução.

## Cobertura posterior
Jornada/design, domínio/TRD, schema/API, segurança, plano/harness, conectores
GitHub/CI, execução, Sentinel real do produto, staging, operação e release:
adapters a implementar com evidências verificadas e autorizações por ambiente.
O parecer Sentinel desta entrega não é o adapter Sentinel do produto.



---

# Fonte incorporada: docs/evidence/2026-10-08-development-flow.md

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
