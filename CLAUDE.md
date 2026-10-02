# widget_nw_itensComCtrllDeEmb

> Regras gerais (versões, SuperWidget, Style Guide): `CLAUDE.md` da raiz do repositório. Aqui fica só o que é deste widget.
> Preencher só com o que o usuário informou ou o que está nos fontes. O que não se sabe fica "a definir".

## Objetivo
Tela de **Itens Controlados**: cadastro, edição, exclusão e consulta da parametrização
estabelecimento + item + tipo de embalagem + capacidade, com situação Ativo/Inativo.
Base visual: mesma paleta e mesmo layout do `widget_nw_embalagens` (prefixo de classe aqui: `nwi`).
Base funcional: aba "Itens Controlados" do protótipo `https://humcode.com.br/mockup-fluig.html`
(mesmos campos; o botão **Limpar** do protótipo foi retirado por decisão do usuário).

## Identificação
- `application.code`: `widget_nw_itensComCtrllDeEmb`
- Título (`application.title`): `widget_nw_itensComCtrllDeEmb` (valor gerado pela extensão)
- Versão: `0.1.0` · categoria `SYSTEM` · `application.uiwidget=true` · `application.mobileapp=false`
- Context-root: `/widget_nw_itensComCtrllDeEmb`
- Onde é usado (página/comunidade do Fluig): a definir

## Estado atual (2026-10-02)
Tela montada com **dados mockados**; nenhuma chamada a dataset ou REST.
- `view.ftl`: cabeçalho + aba única "Itens Controlados" + filtros + tabela + 2 `<dialog>` (cadastro e exclusão).
- `widget_nw_itensComCtrllDeEmb.js`: SuperWidget com Tabulator 6.4.0 (CDN), autocompletes próprios,
  filtros, cadastro/edição, exclusão e switch de situação — tudo sobre `NWI_DADOS_MOCK` / `NWI_FONTES`.
- `widget_nw_itensComCtrllDeEmb.css`: paleta Branco Peres sob `.fluig-style-guide.nwi`.
- `edit.ftl`: card de identificação.

## Tela
### Filtros (sem botão Limpar)
Estabelecimento, Item, Tipo de Embalagem (autocomplete, 2+ caracteres, busca por código OU descrição)
e Situação (Todos/Ativo/Inativo). Ação: **Buscar**. O botão **Novo item controlado** fica no cabeçalho.

### Tabela
Estabelecimento | Item | Unidade | Tipo de Embalagem | Capacidade | Situação | Ações
- Estabelecimento/Item/Tipo exibidos como `código — descrição`; Unidade como chip; Capacidade com 4 casas (pt-BR).
- Situação: switch Ativo/Inativo na própria linha.
- Ações: Editar e Excluir (Excluir abre confirmação).
- Paginação de 10 com contador "Mostrando X–Y de N".

### Modal Novo/Editar
Aviso: "Estabelecimento e item ficam imutáveis na edição. A unidade vem do item; a conversão pertence ao salvamento."
Campos: Estabelecimento, Item (autocomplete) · Unidade (readonly, vem do item) · Tipo de Embalagem (autocomplete) ·
Capacidade (number, min/step 0,0001). Na edição, Estabelecimento e Item ficam `readonly`.
Botão: "Criar parametrização" (novo) / "Salvar alterações" (edição).

## Recursos declarados no `application.info`
| Índice | Tipo | Valor |
|---|---|---|
| 1 | js | `/resources/js/widget_nw_itensComCtrllDeEmb.js` |
| 2 | css | `/resources/css/widget_nw_itensComCtrllDeEmb.css` |

Próximo índice livre: 3

Recursos externos carregados pelo `view.ftl` (CDN): Bootstrap Icons 1.11.3, fonte Mulish (Google Fonts),
Tabulator 6.4.0 (CSS no `view.ftl`, JS injetado pelo script).

## Dados
- Datasets: a definir
- Serviços REST: a definir. Contratos citados no mapa técnico do protótipo (ainda não implementados):
  `consultarEstabelecimentos` · GET /apoios/estabelecimentos; `consultarItens` · GET /apoios/itens;
  `consultarParametros` · GET /parametros; `salvarParametro` · POST/PATCH /parametros.
- Campos do registro no JS: `id`, `estCodigo`, `estDescricao`, `itemCodigo`, `itemDescricao`,
  `unidade`, `tipoCodigo`, `tipoDescricao`, `capacidade`, `ativo`.

## Parâmetros de configuração (`edit.ftl`)
Nenhum.

## Regras de negócio
- Estabelecimento e item não mudam na edição.
- A unidade é a do item, não é digitada.
- Capacidade maior que zero, com até 4 casas decimais.
- Conversão de unidade: pertence ao salvamento (regra ainda não especificada).

## Pendências / decisões em aberto
- Trocar os mocks (`NWI_DADOS_MOCK`, `NWI_FONTES`) pelos datasets/serviços REST quando existirem.
- Definir se a troca do switch de situação grava na hora (PATCH) ou só no salvar.
- Regra de conversão de unidade no salvamento.
- Quebras de linha: os arquivos deste widget estão em **LF** (como a extensão gerou);
  o `widget_nw_embalagens` está em CRLF. Decidir se normaliza o widget inteiro para CRLF.
