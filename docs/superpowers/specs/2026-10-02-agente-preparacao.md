# KESKO — Agente de preparação para desenvolvimento

Data: 02/10/2026. Versão: 1.0. Estado: **PLANEJADO**.
Fonte: especificação de produto fornecida por Cadu nesta conversa em 02/10/2026.
Este registro incorpora os requisitos ao desenvolvimento; não comprova implementação,
instalação de agente, infraestrutura externa ou aprovação de release.

## Objetivo e reconciliação

A KESKO deve entregar, além de PRD, TRD, fluxos e orientação ao Codex, um
ambiente verificado para iniciar o desenvolvimento. O Agente de Preparação
acompanha o responsável desde as contas até o primeiro teste remoto e executa
ações suportadas por conectores dentro da autorização vigente. Orientação
passo a passo é o fallback; o mesmo pacote pode ser exportado para Codex.

A solicitação atualiza a restrição histórica de uma V1 sem acesso automático
a repositórios. Os documentos KESKO_PRD_TRD_FLUXOS.md e CODEX_HANDOFF.md,
datados de 30/09/2026, são citados pelo solicitante, mas não estão neste checkout;
sua leitura e reconciliação integral não foram comprovadas nesta auditoria.
O contrato implementado S-001 permanece vigente até alteração explícita.

Preservar REUSE > EXTEND > REFACTOR > CREATE, custos mínimos compatíveis,
fonte de verdade estruturada, isolamento por organização/projeto/tenant,
Sentinel independente e proteção de main/produção. Autenticação pessoal,
contratação e decisões essenciais ausentes continuam pessoais.

## Sessão persistida e responsabilidades

Cada projeto terá uma sessão de preparação retomável. Consultar o estado real
antes de repetir operações; reutilizar recursos compatíveis. Divergências de
proprietário, ambiente ou região impedem a mutação dependente.

| Etapa | Execução do agente | Ação pessoal eventual | Prova |
|---|---|---|---|
| Inventário | Ler requisitos e recursos; ordenar dependências do primeiro slice | Dado essencial ausente | Matriz com proprietário, ambiente e requisito |
| Contas | Validar identidade e permissões GitHub/Codex/provedores necessários | Conta pessoal, e-mail e MFA | Sessão autorizada |
| Plano | Comparar capacidade disponível e mínimo necessário | Contratação/custo | Capacidade efetiva, data e fonte |
| GitHub | Reutilizar/criar organização, repositório privado e branch autorizados | Autorizar integração | URL, proprietário, permissão, branch e SHA |
| Proteções | PR, checks reais, bloqueio de force push e exclusão | Acesso administrativo | Regras efetivas consultadas |
| Codex | Instruções, contexto, dependências e setup | Login/acesso | Checkout e validação |
| Banco | PostgreSQL staging e testes isolados conforme TRD | Provedor, região/custo pendentes | Conexão, versão, destino e isolamento |
| Secrets | Gerar/cadastrar pelo canal seguro quando permitido | Credenciais pessoais no cofre | Uso pelo consumidor, sem valor exposto |
| CI | Workflow, executor, rede, permissões e limites | Runner/orçamento se necessário | Execução remota no SHA |
| Staging | Destino isolado e saúde do primeiro slice | Recurso externo | Endpoint e acesso testados |
| Conferência | Validar setup e solicitar Sentinel | Decisão não inferível | Evidências, parecer e pendências |
| Handoff | Contexto e comando do primeiro slice autorizado | Nenhuma autorização repetida | Pacote versionado e gate |

Não criar login compartilhado. Padrão de novas organizações solicitado:
`carlosemox` Owner; `caduamaral2601` Member. Permissão no repositório é separada
do papel na organização; Member não comprova Write ou capacidade de aprovação.
A organização pretendida neste projeto é `kesko-os-org`; o remote atualmente
verificado é `carlosemox/KESKO`. Não declarar transferência concluída.

## Planos, infraestrutura e segurança

Verificar capacidades vigentes antes de contratar: a especificação recomenda
GitHub Pro para proteção em repositório privado pessoal e Team para privado
de organização. Não presumir que estes planos incluem todas as aprovações de
deploy. Consultar plano, função, custo vigente, data, fonte e pagador.
GitHub e ChatGPT/Codex são assinaturas distintas; não exigir ChatGPT Pro
universalmente. Não alterar a visibilidade pública atual automaticamente.

Supabase gerenciado é proposta futura condicionada ao TRD, região, conectividade,
custo e autorização, com adapter para outro provedor. A decisão já implementada
do S-001 é Supabase OSS/PostgreSQL local; esta proposta não a substitui.
Não introduzir WorkOS ou outro provedor de identidade sem requisito.

Separar desenvolvimento, testes e staging, com dados sintéticos. Produção
fica fora do provisionamento inicial. Verificar destino antes de migrations
e limpeza; destruição/rollback com risco de perda exige autorização específica.
Preferir CI hospedado compatível; runner próprio somente quando necessário,
com isolamento, manutenção e custo operacional definidos. O computador
pessoal não deve ser dependência obrigatória do produto.
Testar conectividade de cada executor (Codex e CI); conta ou banco criado
não comprova rede utilizável. Mocks/PGlite não comprovam PostgreSQL real.

## Experiência e contrato técnico

Mostrar progresso e uma ação pessoal por cartão: motivo, link oficial,
cliques/comandos conferidos, campos não secretos, resultado esperado, botão
Verificar e correção do erro. O inventário consolidado pode apresentar todas
as pendências antes da execução guiada. Perguntar apenas o essencial ausente.

Estados: NAO_INICIADO, EM_EXECUCAO, AGUARDANDO_USUARIO, FALHOU, VERIFICADO,
NAO_APLICAVEL. VERIFICADO exige prova direta; declaração pessoal permite
retentar, não substitui validação. Autorizações em lote registram escopo,
contas, ações, teto financeiro e validade; não perguntar novamente dentro deles.

Checks exigidos devem existir: bootstrap controlado em branch de trabalho
pode publicá-los antes de configurar a proteção. Inicialização de main em
projeto novo exige autorização de criação; projeto existente usa PR.
Secrets nunca entram em chat, documentos, logs ou commits. Usar menor escopo,
referência ao cofre e evidência mascarada. Exemplos de ambiente só contêm
nomes e valores ilustrativos.

O orquestrador recebe projeto aprovado, requisitos do primeiro slice e
escopo autorizado. Cada adapter fornece descoberta, validação de capacidade
e permissão, execução idempotente quando viável, verificação e recuperação.
Consultar antes de criar; chave por organização/projeto/ambiente/operação.
Timeout exige consultar o resultado remoto antes de repetir criação.

Persistir por tarefa: projeto e tenant, dependências, responsável, recurso
remoto, conta, ambiente, autorização, estado, tentativas, evidência sem segredo,
data de verificação, erro e próxima ação. Consultas e mutações são tenant/project
scoped; toda operação produz auditoria. Retentativas limitadas a falhas
transitórias; autenticação exige reconexão. Integração sem suporte gera
instrução manual específica, nunca sucesso simulado.

Gates jurídicos, identidade, ownership e rate limiting aplicam-se conforme
requisitos concretos. Não simular parecer jurídico profissional. Questões
de release não bloqueiam trabalho isolado independente quando não afetam
seus contratos, dados ou comportamento.

## Gate PRONTO_PARA_DESENVOLVER

Todos os requisitos indispensáveis do primeiro slice devem estar VERIFICADOS
ou NAO_APLICAVEIS com justificativa:

1. Repositório, proprietário e acesso do executor.
2. Contexto aprovado, contrato do slice e instruções Codex.
3. Branch e proteções aplicáveis.
4. Dependências instaláveis e setup executado.
5. Banco real isolado acessível por todos os executores que o usam.
6. Variáveis/secrets utilizáveis sem exposição.
7. CI remoto aprovado no SHA, com PostgreSQL real quando aplicável.
8. Staging testado se requerido pelo slice.
9. Sentinel revisou evidências e correções materiais foram resolvidas.

O gate inicial cobre ambiente e fluxo mínimo disponível, não E2E completo
de uma aplicação inexistente. Migrations de produto, RLS, concorrência e E2E
continuam sujeitos a gates de slice. Prova local não substitui prova remota.
PRONTO_PARA_DESENVOLVER não significa HOMOLOGADO nem autoriza release.
Manter Draft quando exigido; promoção, merge e produção seguem suas alçadas.

Impedimentos registram motivo, etapa, evidência, dono e ação executável.
Continuar trabalho independente. Credenciais, custo não aprovado, conflito
contratual e irreversibilidade pausam a etapa dependente.

## Entrega e aceite futuros

Pacote: recursos/proprietários, instruções Codex, nomes de variáveis, setup,
validações, evidências CI/banco/staging, ações pessoais, Sentinel e estado final.
Documentos serão projeções versionadas do registro estruturado.

Aceite obrigatório: projeto novo; existente preservado; plano incompatível;
acesso revogado; retomada; timeout sem duplicação; banco inacessível pelo CI;
secret indisponível; runner offline; limite financeiro; acesso cross-tenant;
contrato ausente; prova apenas local. Nenhum requisito afetado pode ser
marcado como sucesso enquanto estiver pendente.

Ordem proposta: auditar base oficial; registro persistido e fluxo guiado;
adapter GitHub; banco/CI/staging conforme contratos; handoff e Sentinel.
Não existem endpoints, schema ou módulos novos aprovados neste documento.

## Fontes e parecer informado pelo solicitante

Fontes declaradas como consultadas em 02/10/2026 na especificação recebida:
- https://docs.github.com/en/get-started/learning-about-github/githubs-plans
- https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches
- https://docs.github.com/actions/deployment/targeting-different-environments/using-environments-for-deployment
- https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan

O solicitante forneceu parecer Sentinel de 02/10/2026:
“SEM BLOQUEADORES ENCONTRADOS NO ESCOPO REVISADO”, restrito ao desenho v1.0.
Registrar como parecer recebido, não como nova revisão executada nesta sessão.
Não comprova implementação, infraestrutura, gastos ou release. Receber esta
especificação não requer ação manual externa.
