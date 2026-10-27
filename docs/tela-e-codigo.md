# Tela e código — widget_nw_itensComCtrllDeEmb

> Descrição do JS e da tela em 21/10/2026. **O fonte manda**: se divergir, vale `src/` e este arquivo é atualizado.
> Decisões do usuário que explicam o comportamento: `decisoes.md`.

## Tela (`view.ftl`)
- Container `widget_nw_itensComCtrllDeEmb_${instanceId}` com `.fluig-style-guide.nwi`. Cabeçalho "Itens Controlados" (subtítulo "Cadastre,
  edite, exclua e consulte os itens com controle de embalagem.") com o botão **Novo** (`data-novo`). Uma aba só: Itens Controlados.
- Filtros (**sem botão Limpar**): Estabelecimento, Item, Tipo de Embalagem (autocomplete, 2+ caracteres, código ou descrição; a escolha vira
  badge dentro do campo, receita em `BADGE_FILTROS.md`) e Situação (Todos/Ativo/Inativo, Select2 se o CDN carregar). Botão **Buscar**.
- Tabela Tabulator (`data-tabela`), paginação local de 10, contador "Mostrando X–Y de N", ordem inicial por estabelecimento:
  Estabelecimento | Item | Unidade (chip) | Tipo de Embalagem | Capacidade (4 casas) | Situação (Ativo/Inativo) | Ações.
  Estabelecimento/Item/Tipo como `código — descrição` (sem descrição: só o código). Ações: interruptor Ativo (grava na hora), Editar, Excluir.
  Larguras (26/10, `fitColumns`): mínimas Estabelecimento 170, Item 130, Tipo 190 (crescem 2/3/2); fixas Unidade 120, Capacidade 140,
  Situação 120, Ações 185. Soma 1055 px: sem rolagem horizontal a partir de ~1280 px de janela (tabela de 1056 px no TESTE) e sem
  cortar cabeçalho; abaixo disso a tabela rola. `testar-tela.cjs` confere a soma.
- **Cabeçalho fixo** (23/10, copiado do `widget_nw_bags`, `prepararCabecalhoFixo`): ao descer a página, uma cópia do `.tabulator-header`
  fica em `.nwi-cabecalho-fixo` (`position: fixed`, `top` = `TOPO_CABECALHO_FIXO` = 100px, `left`/`width` da tabela), `aria-hidden`,
  enquanto o topo da tabela passou dessa linha e ainda sobra corpo abaixo. Refeita em `renderComplete`, `dataSorted`, `columnResized` e
  no resize; acompanha a rolagem horizontal. Clicar numa coluna da cópia ordena a tabela original.
- Modal **cadastro** (`<dialog>` `data-modal-cadastro`): Estabelecimento, Item, Unidade (readonly, vem do item), Tipo de Embalagem, Capacidade.
  Novo: "Novo item controlado" / "Criar parametrização". Editar: "Editar item controlado" / "Salvar alterações"; Estabelecimento e Item
  `readonly` e sem autocomplete. Erros por campo em `data-erro="<campo>"`; erro geral em `data-cadastro-mensagem`.
- Modal **excluir** (`<dialog>` `data-modal-excluir`, alertdialog): mostra os dados da linha e confirma com "Excluir" ("Excluindo...").

## Arquitetura do JS
- Tudo dentro de uma IIFE: `var widget_nw_itensComCtrllDeEmb = (function () { ... return SuperWidget.extend({...}); })();`.
- **Transporte**: `chamarEmbalagens(acao, parametros)` (`$.ajax` POST no dataset search) → `extrairEnvelope` (uma linha, `resultadoJson`,
  `sucesso` booleano). Devolve promessa com `.abort()`.
- **Abertura**: sem consulta; no `tableBuilt` só libera Buscar e Novo. A tabela começa vazia até o primeiro Buscar.
- **Carga** (`carregarParametros`, chamada pelo Buscar e pelas recargas depois de gravar): lê todas as páginas de `consultarParametros` (100 por página, cursor `proximoId` → `aposId`; recusa cursor
  vazio ou repetido) e só então faz `setData`. `sequenciaCarga` descarta respostas velhas; Buscar e Novo ficam desabilitados
  (`definirCarregando`); spinner `.nwi-loader` no `tabela.alert`. Falha → mensagem na tabela + `console.error('[itensControlados] …')`.
- **Filtros** (`montarFiltrosDaBusca`): só aceita código escolhido na lista (texto sem escolha → toast info "Escolha … na lista para buscar.").
  Estabelecimento e item vão como faixa `De`/`Ate` com o mesmo código.
- **Autocomplete** (`prepararAutocompleteApoio`): `FLUIGC.autocomplete` com consulta às ações de apoio, atraso (350 ms; tipos 250 ms),
  mínimo 2 caracteres, até 20 sugestões, `sequencia` para descartar respostas velhas. Seleção guarda `codigo`/`registro` no `data()` do campo;
  digitar limpa a escolha. `comBadge`: `mostrarSelecionado` / `removerSelecionado`.
- **Comandos** (`executarComandoParametro`): chave idempotente (UUID v4 de `crypto.getRandomValues`) por intenção (`intencoesComando`,
  chave = ação + parâmetros): repetir os mesmos dados reaproveita a chave. Resposta conferida por `fotografiaParametroValida`; falha de
  transporte, `FALHA_CHAMADA`/`RESPOSTA_INVALIDA`/`HTTP_*` ou resposta fora do esperado = **incerto** ("Não foi possível confirmar a
  gravação. Clique em Buscar…"). `definirGravando` trava os modais durante a gravação.
- Após sucesso, `aplicarFotografiaParametro` atualiza a linha (ignora versão mais antiga), reordena e vai para a página da linha; se falhar,
  recarrega a lista. Toasts de sucesso: "Parâmetro criado/alterado/excluído/ativado/desativado" ou "… já confirmada anteriormente" (`repeticao`).
- Avisos: `avisar(mensagem, tipo)` → `FLUIGC.toast`.

## Mapa do fonte (`widget_nw_itensComCtrllDeEmb.js`)
~1.220 linhas. Achar com Grep e ler só o trecho. Padrões: `^    var <NOME>`, `^    function <nome>`, `^        <nome>: function`.
Linhas aproximadas (21/10/2026); o Grep manda.

| Bloco (linhas) | Nomes |
|---|---|
| Constantes (6–30) | `URL_SCRIPT_TABULATOR`, `URL_BUSCA_DATASET`, `DATASET_EMBALAGENS`, `ACAO_*` (6 ações), `TODOS`, `MINIMO_CARACTERES_BUSCA`, `LIMITE_SUGESTOES`, `LIMITE_PAGINA_PARAMETROS`, `ATRASO_CONSULTA_*_MS`, `MENSAGENS_ERRO` |
| Funções soltas (35–126) | `chamarEmbalagens`, `extrairEnvelope`, `formatarCapacidade`, `criarCelulaCodigoDescricao`, `converterParametroEmItem`, `formatarRotulo`, `gerarChaveIdempotente`, `resultadoComandoIncerto`, `fotografiaParametroValida` |
| SuperWidget (128–fim) | estado (`tabela`, `linhaEditando`, `linhaExcluindo`, `sequenciaCarga`, `gravando`, `situacoesPendentes`, `intencoesComando`, `autocomplete*`), `init`, `bindings` |

Métodos do SuperWidget, por assunto:

| Assunto | Métodos |
|---|---|
| Abas | `prepararAbas`, `selecionarAba`, `navegarAbas`, `ativarAba`, `moverIndicador` |
| Filtros e autocomplete | `prepararSelectSituacao`, `prepararAutocompletesDosFiltros`, `prepararAutocompletesDoCadastro`, `prepararAutocompleteTipoDoCadastro`, `prepararAutocompleteApoio`, `mostrarSelecionado`, `removerSelecionado`, `cancelarConsultaApoio`, `consultarApoio`, `montarSugestoesApoio`, `definirTipoNoCadastro`, `preencherUnidade` |
| Tabela | `carregarTabulator`, `montarTabela`, `prepararCabecalhoFixo`, `definirColunas`, `tratarCliqueNasAcoes`, `alterarSituacao`, `montarBotoesAcoes`, `reaplicarOrdem`, `mostrarPaginaDaLinha` |
| Carga e busca | `definirCarregando`, `carregarParametros`, `cancelarCarga`, `exibirItensCarregados`, `mostrarErroDaCarga`, `buscar`, `montarFiltrosDaBusca` |
| Modal cadastro | `prepararModalCadastro`, `obterCampoDoCadastro`, `abrirModalNovo`, `abrirModalEditar`, `abrirModalCadastro`, `preencherFormularioComLinha`, `fecharModalCadastro`, `limparFormulario`, `marcarErro`, `obterOpcaoEscolhida`, `salvar`, `lerEscolhasDoFormulario`, `validarEscolhas`, `montarRegistro` |
| Gravação | `montarComandoParametro`, `definirGravando`, `executarComandoParametro`, `informarFalhaComando`, `aplicarFotografiaParametro`, `gravarAlteracao`, `gravarRegistro` |
| Modal excluir | `prepararModalExcluir`, `abrirModalExcluir`, `fecharModalExcluir`, `confirmarExclusao` |
| Avisos | `avisar` |

Bindings (`data-*`): `tab` (click/keydown), `buscar`, `novo`, `fechar-modal`, `fechar-excluir`, `confirmar-excluir`.
