# Pendências — widget_nw_itensComCtrllDeEmb

> Pendências, perguntas ao usuário e propostas não aprovadas. Ao resolver: tirar daqui e, se for decisão, registrar em `decisoes.md`.
> Pendência registrada não autoriza execução.

## Esperando decisão do usuário
- Regra de conversão de unidade no salvamento.
- Página/comunidade de uso no Fluig.
- Normalizar ou não as quebras de linha do widget inteiro (fontes não normalizados).
- Política de gravação do switch Situação: o contexto anterior deixava em aberto; o código atual grava na hora (`alterarSituacao`),
  o que não comprova aprovação de negócio.

## Propostas não aprovadas
- Item sem unidade no `apoiarItens` (`un` ausente): o Novo manda `unidade: ""` e o Dataset recusa com `PARAMETRO_OBRIGATORIO`
  ("Faltam parametros obrigatorios desta acao."). Proposta: validar no modal ("O item escolhido não tem unidade."). Visto nos testes
  locais (23/10), não no TESTE.

## Confirmar no Fluig de TESTE (nada visto ainda)
> Os testes locais (`testes/`, 23/10) cobrem a lógica do JS com respostas simuladas; não substituem esta lista.
- Consulta inicial, filtros, descrições retornadas e paginação por cursor.
- Autocompletes do modal e dos filtros; badge e botão × limpando texto, código e seleção.
- Inclusão, edição, exclusão e troca de situação.
- Controle de versão, repetição idempotente, erros de permissão/escrita desabilitada e gravação incerta.
- Conversão de unidade efetiva no backend.
- Descrições (`descricaoEstabelecimento`/`descricaoItem`/`descricaoTipo`) vindas do ambiente: o cliente lê se vierem; retorno real não validado.

## Fora do widget
- Contrato e liberação no Dataset (`BP-NW-DATASET`): grupos/estabelecimentos e `escritasHabilitadas` para `incluirParametro`/`alterarParametro`
  não verificados; responsável a definir.
- Procedimento e responsável pela publicação no Fluig: a definir (importação feita pelo usuário).
