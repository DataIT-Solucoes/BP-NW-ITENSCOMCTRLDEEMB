# widget_nw_itensComCtrllDeEmb

Widget WCM do TOTVS Fluig para consultar e manter itens com controle de embalagem. Paleta Branco Peres; prefixo CSS `nwi`.

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

## Estrutura e recursos
| Arquivo | Responsabilidade |
|---|---|
| `src/main/resources/application.info` | Aplicação 0.1.2; JS Índice 1, CSS Índice 2; próximo Índice livre 3 |
| `src/main/resources/view.ftl` | Tela principal e diálogos |
| `src/main/resources/edit.ftl` | Card de identificação; nenhum parâmetro configurável |
| `src/main/webapp/resources/js/widget_nw_itensComCtrllDeEmb.js` | SuperWidget, tabela, apoios e dataset |
| `src/main/webapp/resources/css/widget_nw_itensComCtrllDeEmb.css` | Estilos sob `.fluig-style-guide.nwi` |
| `src/main/webapp/WEB-INF/` | Descritores; context-root `/widget_nw_itensComCtrllDeEmb` |

## Dependências e integração
Ambiente registrado no projeto: jQuery 3.6.3, Bootstrap 3.4.1 e Fluig Style Guide 2.5.0, fornecidos pelo Fluig. Recursos externos: Bootstrap Icons 1.11.3, Mulish, Tabulator 6.4.0 e Select2 4.0.13 com tradução pt-BR. Links no view.ftl; JS do Tabulator carregado pelo script do widget.

O cliente chama `dsNwEmbalagens` por POST em `/api/public/ecm/dataset/search`. Consulta e apoios: `consultarParametros`, `apoiarEstabelecimentos`, `apoiarItens`, `consultarTiposApoio`. Inclusão: `incluirParametro`. Edição, exclusão e situação: `alterarParametro`, com os comandos correspondentes. Há controle de versão e chave de idempotência no código. A consulta acumula páginas do servidor por cursor; a tabela pagina localmente.

Campos internos: `id`, `estCodigo`, `estDescricao`, `itemCodigo`, `itemDescricao`, `unidade`, `tipoCodigo`, `tipoDescricao`, `capacidade`, `ativo`, `versao`. Descrições são usadas quando retornadas; sem elas, a coluna mostra somente o código.

Antes de alterar integração, conferir o dataset atual em `../widget_nw_embalagens/datasets/dsNwEmbalagens.js`, incluindo NW_CONFIG, NW_ACOES e NW_COLUNAS. Contrato, permissões e escrita no ambiente não foram auditados nesta migração. A execução no Fluig não está confirmada.

## Verificação e continuidade
Começar por [AGENTS.md](AGENTS.md); decisões, pendências, referências do backend e mapa do código ficam em [docs/](docs/). Histórico: `git log`.

Por autorização permanente do usuário, concluir entregas com commit, push e compilação, numa chamada só: `scripts/entregar.ps1` (confere BOM/quebra de linha, `node --check`, gera `target/widget_nw_itensComCtrllDeEmb.war`, commit e push). O `.war` tem `src/main/webapp/` na raiz e `src/main/resources/` em `WEB-INF/classes/`; não há fontes Java. `target/` está ignorado pelo Git. Publicação no Fluig depende de pedido; página/comunidade e responsável: a definir.
