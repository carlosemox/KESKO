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
