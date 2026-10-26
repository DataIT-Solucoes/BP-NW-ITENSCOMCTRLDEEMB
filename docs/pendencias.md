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
- **Defeito visto no TESTE (26/10):** o × do badge (filtros Estabelecimento e Tipo) esconde o badge e limpa o código, mas o texto
  (`11301 — RAFAEL BRANCO PERES E OUTROS`) fica no campo: `autocomplete.val('')` em `removerSelecionado` não apaga no Fluig 1.8.1.
  Efeitos: o foco devolvido consulta o apoio com o rótulo inteiro e o Dataset recusa (`FILTRO_CURTO` "Digite ao menos dois caracteres.";
  "Confira os filtros." também apareceu, provável o mesmo caso no Tipo), mostrado em toast `danger` que não some; o Buscar recusa com "Escolha o estabelecimento na lista
  para buscar." até a pessoa apagar o texto à mão. Proposta: limpar também o campo (`$campo.val('')` / `typeahead('val', '')`).
  Os testes locais não pegaram (o simulado do autocomplete apaga).
- Tabela a 1350 px de largura: rolagem horizontal; o botão Excluir da coluna Ações fica fora da vista (visto no TESTE, 26/10).
- Item sem unidade no `apoiarItens` (`un` ausente): o Novo manda `unidade: ""` e o Dataset recusa com `PARAMETRO_OBRIGATORIO`
  ("Faltam parametros obrigatorios desta acao."). Proposta: validar no modal ("O item escolhido não tem unidade."). Visto nos testes
  locais (23/10), não no TESTE.

## Confirmar no Fluig de TESTE
> Os testes locais (`testes/`, 23/10) cobrem a lógica do JS com respostas simuladas; não substituem esta lista.
> **Visto em 26/10** (página `/portal/p/1/itens_controlados`, usuário totvsrp, widget publicado = fonte local, teste pela tela com o
> parâmetro 102 criado e excluído no fim; linhas PLASTICO 53 e 70 não tocadas): consulta inicial com descrições; filtros Estabelecimento,
> Tipo e Situação (Inativo/Todos, Select2); autocompletes do modal e dos filtros com badge; unidade vinda do item; capacidade 0 recusada
> no modal; Novo (`incluirParametro`), Editar (tipo e capacidade; estabelecimento e item somente leitura), desativar (`INATIVAR`),
> ativar (`ALTERAR`), Excluir (Cancelar e confirmar); `CONFLITO_VERSAO` (mensagem, modal fecha, lista recarrega); repetição do mesmo
> EXCLUIR com a mesma chave devolve `repeticao: true` e o mesmo `idEvento`; cabeçalho fixo ao descer. × do badge: defeito (ver acima).
- Paginação por cursor com mais de 100 parâmetros (o TESTE tem 3–4; só uma página vista).
- Erros de permissão/escrita desabilitada e gravação incerta.
- Conversão de unidade efetiva no backend.

## Fora do widget
- Contrato e liberação no Dataset (`BP-NW-DATASET`): `incluirParametro`/`alterarParametro` gravam no TESTE com o usuário totvsrp
  (admin, 26/10); com usuário comum, não visto. `apoiarEstabelecimentos` sugere 11302, fora dos estabelecimentos do DefaultGroup-1
  (10904 e 11301); gravar no 11302 não testado. Responsável a definir.
- Procedimento e responsável pela publicação no Fluig: a definir (importação feita pelo usuário).
