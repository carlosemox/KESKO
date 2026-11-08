# KESKO — pacote consolidado para iniciar o desenvolvimento

Data da consolidação: 08/10/2026
Estado: **PARCIAL — pronto para handoff documental; não é GO de produção.**

## Como usar

1. Instale/verifique o [Superpowers](https://github.com/obra/superpowers#installation) no cliente escolhido.
2. Anexe o [contexto completo da KESKO](KESKO-CONTEXTO-PARA-DESENVOLVIMENTO.md).
3. Copie o [prompt pronto de início](PROMPT-INICIAR-KESKO.md) para o Codex ou Claude Code.
4. O agente deve confirmar o repositório, branch, SHA e entrevista antes de alterar código.

Se usar Codex e Claude Code, instale/verifique o Superpowers separadamente em cada cliente. A instalação é por harness/cliente; não há uma instalação universal que configure todos os aplicativos automaticamente.

## Fonte de verdade deste pacote

- Padrão dos 15 prompts: [DEVELOPMENT-PROMPTS.md](../product/DEVELOPMENT-PROMPTS.md)
- Regras de encadeamento e handoff: [DEVELOPMENT-PROMPTS-INTEGRATION.md](../product/DEVELOPMENT-PROMPTS-INTEGRATION.md)
- Contexto anexável autocontido: [KESKO-CONTEXTO-PARA-DESENVOLVIMENTO.md](KESKO-CONTEXTO-PARA-DESENVOLVIMENTO.md)
- Prompt copiável: [PROMPT-INICIAR-KESKO.md](PROMPT-INICIAR-KESKO.md)
- Evidências da primeira vertical: [2026-10-08-development-flow.md](../evidence/2026-10-08-development-flow.md)
- Evidências do handoff: [2026-10-08-prompt-handoff.md](../evidence/2026-10-08-prompt-handoff.md)

O arquivo anexável incorpora integralmente as fontes essenciais e deve ser o arquivo enviado ao outro agente. Os demais arquivos permitem auditoria e manutenção sem duplicar o conteúdo principal.

## Ordem operacional consolidada

| Ordem | Etapa | Saída obrigatória | Situação nesta KESKO |
|---:|---|---|---|
| 0 | Entrevista inicial | Fonte da entrevista e respostas registradas | **Pendente localizar a fonte canônica** |
| 0.1 | Identificação do negócio | Bloco `NEGÓCIO` preenchido | Template registrado |
| 1 | Descoberta | `docs/product/DISCOVERY.md` | Validação estrutural parcial |
| 2 | PRD | `docs/product/PRD.md` | PRD preliminar parcial |
| 3 | Fluxo do usuário | `docs/product/USER-FLOWS.md` | Executor ainda não implementado |
| 4 | UI/UX | `docs/design/UI-UX-SPEC.md` | Executor ainda não implementado |
| 5 | TRD | `docs/architecture/TRD.md` | Executor ainda não implementado |
| 6 | Domínio e banco | `docs/architecture/DATABASE.md` | Domínio/schema parcial |
| 7 | API | `docs/architecture/API.md` | Contratos do slice atual existem; padrão completo pendente |
| 8 | Segurança | `docs/security/THREAT-MODEL.md` | Threat model completo pendente |
| 9 | Plano | `docs/execution-plans/active/[DATA]-[NOME].md` | Plano do slice atual existe |
| 10 | Harness | Estrutura operacional e scripts | Parcial; Superpowers externo ao repo |
| 11 | GitHub | Proteções, CI, CODEOWNERS e ambientes | Configuração remota não comprovada nesta consolidação |
| 12 | Implementação | Tarefa executada em branch | Primeira vertical local implementada |
| 13 | QA e Sentinel | Relatório independente | Primeira vertical revisada |
| 14 | Staging | Evidências de staging | Não executado |
| 15 | Release | GO/NO-GO formal | Não autorizado |

## Gate antes de implementar o próximo negócio

Devem existir e estar revisados: entrevista, PRD, fluxo principal, critérios de aceite, TRD, schema, contrato de API, threat model, plano de implementação e configuração mínima do GitHub. Arquivo existente não significa requisito comprovado.

Se algum item estiver ausente, o agente deve registrar `AUSENTE` ou `BLOQUEADO`, preparar a ação segura possível e não liberar implementação por presunção.

## Estado real do projeto

- Projeto: KESKO.
- Remote observado: `carlosemox/KESKO`.
- Branch de trabalho observada: `codex/development-flow`.
- Base observada: `5bf0df3c30b799413dea7e22c09d0b6410638acc`.
- Primeira vertical: briefing → descoberta → PRD preliminar → aprovação → bloqueio honesto das etapas sem executor.
- Validação histórica registrada: 100 testes PostgreSQL aprovados, lint, typecheck, build e audit aprovados.
- Main, Production, credenciais, permissões externas, push, merge e deploy permanecem protegidos.
- Os diretórios `.agents/` e `.specify/` são trabalho do usuário e devem ser preservados.

## Limites do handoff

O pacote não contém secrets, tokens, chaves privadas, dumps reais, entrevista inventada ou autorização externa. Prompts e documentos são contexto; não são prova de instalação, integração, staging, homologação ou release. A aprovação sintética da demonstração não é aceite humano real.

## Memória operacional

`MEMORY_APPLIED: NONE`\
`MEMORY_CONFLICTS: NONE`\
`MEMORY_RECURRENCE: NONE comprovada`\
`MEMORY_UNKNOWN: GLOBAL; protocolo local não encontrado`\
`MEMORY_CANDIDATES: NONE`

## Prompt final

Use o arquivo [PROMPT-INICIAR-KESKO.md](PROMPT-INICIAR-KESKO.md), que já contém o texto copiável sem placeholders residuais. Não copie este índice no lugar do contexto anexável: anexe o arquivo `KESKO-CONTEXTO-PARA-DESENVOLVIMENTO.md`.
