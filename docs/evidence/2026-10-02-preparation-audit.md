# Auditoria de preparação — KESKO — 02/10/2026

Estado: IN_PROGRESS. Não declarar PRONTO_PARA_DESENVOLVER.
Base: e6ac79ea17ca1cccce2c12b626560a419a181e54;
branch codex/S-001-foundation-tenancy; remote carlosemox/KESKO.
Documentação e preflight desta auditoria são mudanças locais ainda sem commit.
Não foram feitas mudanças em main, produção, contas, planos ou permissões.

## Evidência atual

- macOS 26.6.2 arm64, 8 GiB RAM, 6 CPUs, 242 GiB livres; sem evidência
  suficiente para atribuir lentidão a CPU/memória.
- Node 24.20.0, pnpm 11.19.0, Supabase CLI 2.119.0.
- Docker acessível com execução autorizada fora do sandbox. Erro anterior de
  socket era restrição da sessão, não prova de falha do Docker.
- supabase_db_KESKO saudável. Consulta real pelo host 127.0.0.1:54322 confirma
  PostgreSQL 17.11, database postgres, role postgres. Consulta somente leitura
  no container confirma migrations 0001–0006 e RLS nas quatro tabelas S-001.
- Porta 54322 publicada em 0.0.0.0 e IPv6: acesso local comprovado, restrição
  a loopback não comprovada. Não expor este banco de desenvolvimento à Internet.
- Nenhuma prova de banco separado de testes, banco remoto ou CI acessando banco.
  Role postgres é administrativa de desenvolvimento, não role de runtime remoto.
- PR #2 consultado pela API pública: open/Draft, HEAD e6ac79e, sem reviewer
  solicitado. Consulta pública não prova identidade autenticada ou permissão admin.
- gh não disponível no PATH. Autorização GitHub administrativa atual não
  verificada. Push anterior é histórico, não teste de permissão administrativa.
- .github/workflows ausente; não existem nomes de checks publicados pelo checkout.
  Não há runner configurado no código; inventário privado de runners inacessível.
- Apenas scripts test/typecheck existentes. Build, lint, start e deploy ausentes;
  não inventar comandos. API é construída pelos testes, sem servidor de staging.
- AGENTS.md, CODEX_HANDOFF.md, KESKO_PRD_TRD_FLUXOS.md e spec histórica citada
  pelo plano não encontrados no checkout. Não importar documentos de outro projeto.
- Nenhum secret lido. DATABASE_URL é o nome consumido; CI e RUN_DB_TESTS são
  flags. .env é ignorado. A nova especificação não exige introduzir secrets agora.
- Correção de relatório anterior: CI=true pnpm test no HEAD e6ac79e executou
  23 testes com 6 pulados; não foram 29 aprovados. Os 29/29 são evidência histórica
  de RUN_DB_TESTS=1. Nesta auditoria não se repetiram testes que escrevem no banco.
- node --check scripts/preflight.mjs, git diff --check e typecheck passaram.

## Matriz consolidada

| Item | Estado | Configuração necessária | Responsável | Dependência | Evidência de conclusão |
|---|---|---|---|---|---|
| Checkout/runtime | VERIFICADO | Nenhuma reinstalação | Codex | Permissão por operação | SHA, versões e status |
| Docker/banco local | VERIFICADO | Restringir publicação a loopback em manutenção controlada | Codex | Permissão para recriar container preservando volume | Portas consultadas + conexão |
| Banco de testes isolado | AUSENTE | Preparar instância descartável dedicada para CI | Codex | Workflow e executor | Destino e migrations/testes reais |
| GitHub admin | INACESSÍVEL | Sessão carlosemox autorizada | Cadu | Login/MFA pessoal | Identidade e permissões consultadas |
| kesko-os-org/membros | INACESSÍVEL | Descobrir/reusar; Owner carlosemox, Member caduamaral2601 | Codex/Cadu | Acesso admin; e-mail/verificação se criação | Organização e memberships consultados |
| main/revisão | INACESSÍVEL | Conferir regra real, 1 aprovação e checks existentes | Codex | Admin e CI publicado | API/UI da regra + aprovação |
| CI remoto | AUSENTE | Preparar bootstrap hospedado Linux em branch | Codex | Acesso Actions, dependências/lockfile | URL da execução no SHA, PostgreSQL real |
| Runner próprio | NÃO APLICÁVEL | Não instalar no Mac para S-001 | — | Nenhuma exigência encontrada | CI hospedado escolhido e executado |
| Redis/staging/deploy | NÃO APLICÁVEL | Reavaliar no contrato do próximo slice | Codex | Requisito concreto | Justificativa S-001 |
| Fontes canônicas históricas | AUSENTE | Indicar localização exata no KESKO | Cadu/Codex | Arquivos originais | Fontes reconciliadas |
| Agente de Preparação | VERIFICADO apenas como especificação | Implementação futura PLANEJADA | Codex | Contratos + gates | Novo módulo testado e revisão futura |
| Sentinel | VERIFICADO como revisão local | Resolver achados; revisão externa continua pendente | Sentinel separado | Artefatos e evidências | Parecer com escopo |

## Ações pessoais em ordem

1. No GitHub, menu do avatar → conferir carlosemox; fazer login/MFA pessoal
   se necessário e disponibilizar a sessão autorizada. Não enviar senha/token.
   Se configurações do repositório derem 404/403, conferir conta e acesso admin.
   O Codex fará as consultas e mudanças autorizadas após autenticação.
2. Somente se a organização ainda não existir: criação GitHub Free de
   kesko-os-org exige e-mail de contato e eventual verificação humana diretamente
   na página. O Codex pode preparar os campos não secretos. Não comprar plano.
   Aceitar o convite como caduamaral2601 quando enviado, mantendo Member.
   O Owner poderá atribuir Write no repositório separadamente para revisão.
3. Fornecer em uma única resposta a localização de KESKO_PRD_TRD_FLUXOS.md e
   CODEX_HANDOFF.md; confirmar se o destino continua kesko-os-org/KESKO e se
   pretende mudar o repositório público para privado. Esta decisão tem impacto
   nas proteções disponíveis e no plano; não executar transferência/contratação
   por inferência. Não é necessário escolher provedor remoto para o S-001 local.
4. Um revisor elegível diferente do autor deve revisar o PR ativo #2, quando
   estiver pronto. A revisão humana não é substituída pelo Sentinel de código.
   PR #1 fechado e foundation/f0-hardening não são os alvos atuais comprovados.

Não transferir ao usuário execução de testes, migrations ou acompanhamento de CI.
Sem workflow ainda, não existem nome de runner, labels especiais ou checks a
preencher. CI hospedado não requer registro/inicialização de runner pessoal.
O bootstrap deve rodar em branch de trabalho, publicar checks e só então estes
serem selecionados em Settings → Branches/Rules. Não desativar validações.

## Comando reproduzível e limites

```sh
cd /Users/caduamaral/Documents/ChatGPT/KESKO
node scripts/preflight.mjs
```

Saída JSON sem secrets. Código 1 identifica pendência local; verificação remota
é separada e não pode ser inferida do exit code. Se Docker der EPERM no Codex,
solicitar execução fora do sandbox pelo mecanismo de permissão; não reiniciar
ou reinstalar infraestrutura por esse erro. O script não aplica migrations.

Após CONFIGURAÇÕES CONCLUÍDAS, consultar cada item novamente e reportar somente
pendências. Retomar funcionalidades apenas com dependências do slice e gate
aplicável comprovados. Este pacote resolve o inventário repetitivo e o erro de
diagnóstico do Docker; CI, ownership, isolamento e acesso remoto continuam
pendentes. Revogação de acesso, indisponibilidade e alterações de plano/API
podem gerar falhas futuras.

## Fontes oficiais consultadas nesta auditoria

- https://docs.github.com/en/get-started/learning-about-github/githubs-plans
- https://docs.github.com/en/actions/how-tos/manage-runners/github-hosted-runners/use-github-hosted-runners

Planos privados dependem do proprietário e capacidade exigida. Não houve
cotação nem recomendação de contratação paga nesta entrega.
