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
