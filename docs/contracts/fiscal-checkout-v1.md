# KESKO — Contrato fiscal de checkout v1

Status: **SPECIFIED — NOT IMPLEMENTED — NOT HOMOLOGATED**  
Data: 2026-11-08

## Escopo

Este contrato define os dados mínimos para faturamento de vendas de equipamentos. Ele se aplica ao checkout, à criação do pedido e à integração posterior com o emissor fiscal. O orçamento público pode ser criado sem validação fiscal; nenhum pagamento ou pedido faturável pode avançar sem validação fiscal positiva.

## Tipos de comprador

`buyer_type` é obrigatório e aceita apenas:

- `individual`: pessoa física;
- `company`: pessoa jurídica.

## Pessoa física

Campos obrigatórios para emissão e entrega:

- CPF válido;
- nome completo;
- e-mail;
- telefone;
- CEP;
- logradouro;
- número;
- complemento, quando aplicável;
- bairro;
- município;
- UF;
- endereço de entrega, quando diferente do endereço fiscal.

## Pessoa jurídica

Campos obrigatórios para emissão e entrega:

- CNPJ válido;
- razão social;
- e-mail fiscal;
- telefone;
- CEP;
- logradouro;
- número;
- complemento, quando aplicável;
- bairro;
- município;
- UF;
- endereço de entrega, quando diferente do endereço fiscal;
- indicador de contribuinte do ICMS: `taxpayer`, `exempt` ou `non_taxpayer`.

Quando `taxpayer`, a inscrição estadual é obrigatória. Quando `exempt`, o sistema deve registrar a condição de isenção conforme a regra da UF. Quando `non_taxpayer`, a inscrição estadual não deve ser exigida automaticamente; a regra da operação e da UF deve prevalecer.

`nome_fantasia` é informativo e não substitui a razão social.

## Validação

O backend deve validar:

1. dígitos e algoritmo de CPF/CNPJ;
2. CNPJ e razão social em fonte oficial ou fornecedor autorizado;
3. inscrição estadual na UF correspondente;
4. indicador de contribuinte compatível com a inscrição;
5. endereço completo e UF coerente;
6. alteração de qualquer dado fiscal após a validação, exigindo nova consulta.

O SINTEGRA é fonte de consulta da situação estadual do contribuinte. A consulta pública não substitui a validação do CNPJ na Receita Federal e não deve ser implementada por scraping sem autorização. O sistema deve usar integração oficial ou fornecedor autorizado, com registro da fonte, horário, resultado e identificador da consulta.

## Modelo de persistência

```text
buyer_type
document_type
document_number_normalized
legal_name
trade_name
state_registration
state_registration_indicator
billing_address_json
shipping_address_json
tax_validation_status
tax_validation_source
tax_validation_checked_at
tax_validation_reference
tax_validation_response_hash
```

Não armazenar resposta fiscal integral, documentos pessoais ou dados bancários sem finalidade e retenção definidos. CPF/CNPJ devem ser protegidos em repouso, mascarados na interface e excluídos dos logs.

## Estados de validação

- `pending`: ainda não consultado;
- `valid`: dados válidos e compatíveis;
- `invalid`: dados rejeitados;
- `manual_review`: fonte indisponível ou divergência não resolvida;
- `expired`: consulta fora do prazo definido pela política fiscal.

## Gate de pedido e pagamento

O servidor deve rejeitar a criação do pedido e a criação da sessão de pagamento quando:

- `tax_validation_status` não for `valid`;
- houver divergência entre documento e razão/nome;
- inscrição estadual obrigatória estiver ausente;
- endereço fiscal estiver incompleto;
- os dados tiverem sido alterados desde a consulta;
- o serviço fiscal estiver indisponível e a operação exigir validação online.

O navegador não pode liberar o checkout por conta própria. O total, os dados fiscais, o frete, os adicionais e a condição de pagamento devem ser recalculados e validados no servidor.

## Emissão fiscal

O módulo fiscal ainda precisa definir e homologar separadamente: certificado digital, emissor autorizado, série, numeração, CFOP, NCM, CST/CSOSN, origem da mercadoria, regras de ICMS, contingência, cancelamento e carta de correção. Esses campos pertencem à operação do vendedor e não podem ser inferidos somente pelo cadastro do comprador.

## Evidência de homologação exigida

Antes de liberar produção, executar em ambiente de homologação:

1. compra de pessoa física com CPF válido e inválido;
2. compra de pessoa jurídica contribuinte com IE válida e inválida;
3. empresa isenta;
4. não contribuinte;
5. CNPJ baixado, inapto e divergente;
6. consulta fiscal indisponível;
7. alteração de endereço depois da validação;
8. tentativa de pagamento sem validação;
9. emissão, cancelamento e reprocessamento idempotente da nota;
10. auditoria sem CPF/CNPJ completo em logs.

Até que esses casos tenham evidência PASS, o checkout fiscal permanece **NO-GO**.
