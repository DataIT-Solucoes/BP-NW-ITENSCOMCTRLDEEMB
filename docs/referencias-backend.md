# Referências de dados e backend — widget_nw_itensComCtrllDeEmb

> Onde está a verdade e o que já foi levantado, para não reler tudo de novo.
> Ao levantar algo novo no Dataset ou nos `.p`, registrar aqui com a data e o arquivo:linha.

## Contrato usado pela tela (Dataset `dsNwEmbalagens`)
- Chamado por `chamarEmbalagens(acao, parametros)` (POST `/api/public/ecm/dataset/search`, `filterFields` com `acao` e `parametros` JSON).
  Espera uma linha com `resultadoJson` e `sucesso` booleano (`extrairEnvelope`). É a expectativa do cliente; não valida o contrato do servidor.
- Fonte da verdade: `dsNwEmbalagens.js` do GitHub **`DataIT-Solucoes/BP-NW-DATASET`** (o publicado no Fluig é sempre o de lá; decisão do
  usuário de 19/10). Cópia local antiga: `../widget_nw_embalagens/datasets/dsNwEmbalagens.js` (existência/conteúdo não conferidos em 20/10).
  Ler `NW_CONFIG`, `NW_ACOES`, `NW_COLUNAS` antes de alterar integração. Não editar o Dataset sem pedido.
- Ações usadas (presença no fonte não comprova execução ou liberação no Fluig):

| Ação | Parâmetros enviados pela tela | Uso |
|---|---|---|
| `consultarParametros` | `limite` (100), `aposId`; filtros `estabelDe`/`estabelAte`, `itemDe`/`itemAte` (mesmo código nos dois), `codTipo`, `ativo` | tabela (todas as páginas por `proximoId`) |
| `apoiarEstabelecimentos` | `filtro`, `limite` (20) | autocomplete Estabelecimento (filtro e modal) |
| `apoiarItens` | `filtro`, `limite` (20), `codEstabel` (se escolhido) | autocomplete Item; unidade vem do item |
| `consultarTiposApoio` | `filtro`, `ativo` (`todos` no filtro; `true` no cadastro), `limite` (20) | autocomplete Tipo |
| `incluirParametro` | `idParam` 0, `codEstabel`, `item`, `codTipo`, `capacidade`, `unidade`, `ativo` true, `versao` 0, `chaveIdempotente` | Novo |
| `alterarParametro` | `idParam`, `codEstabel`, `item`, `codTipo`, `capacidade`, `unidade`, `ativo`, `versao`, `acao`, `chaveIdempotente` | `acao`: `ALTERAR` (editar; ativar), `INATIVAR` (desativar), `EXCLUIR` |

- Campos lidos de cada parâmetro (`converterParametroEmItem`): `idParam`, `codEstabel`, `descricaoEstabelecimento`, `item`, `descricaoItem`,
  `unidade`, `codTipo`, `descricaoTipo`, `capacidade`, `ativo`, `versao`. Descrições opcionais: sem elas a coluna mostra só o código.
- Resposta de comando conferida por `fotografiaParametroValida` (`idParam`, `codEstabel`, `item`, `codTipo`, `unidade`, `capacidade`, `ativo`,
  `versao`, `excluido`); fora do esperado = resultado incerto. `repeticao` true → aviso "já confirmado anteriormente".
- Códigos de erro com texto próprio (`MENSAGENS_ERRO`): `AUTORIZACAO_NAO_CONFIGURADA`, `SEM_PERMISSAO`, `ESCRITA_DESABILITADA`, `CONFLITO_VERSAO`.
  Incertos (`resultadoComandoIncerto`): `FALHA_CHAMADA`, `RESPOSTA_INVALIDA`, `HTTP_*`.

## Fontes da verdade
| O quê | Onde |
|---|---|
| Widget | `https://github.com/HumbertoAlcantaraArruda/BP-WIDGET-ITENSCOMCTRLDEEMB`, branch `master` |
| Dataset publicado | `https://github.com/DataIT-Solucoes/BP-NW-DATASET` → `dsNwEmbalagens.js` |
| Receita dos badges nos filtros | `BADGE_FILTROS.md` |
| Protótipo histórico | `https://humcode.com.br/mockup-fluig.html` (não consultado em 20/10) |

## Levantado em 20/10/2026
- `application.info`: versão 0.1.0, categoria SYSTEM, JS .1 e CSS .2. O card do `edit.ftl` diz "v1.0", diferente da versão dos metadados.
- `view.ftl`: Bootstrap Icons 1.11.3, Mulish, Tabulator 6.4.0 (CSS) e Select2 4.0.13 com pt-BR; JS do Tabulator carregado pelo próprio widget.
- Build: o `.war` tem 12 entradas (`src/main/webapp/` na raiz, `src/main/resources/` em `WEB-INF/classes/`); sem `pom.xml` nem fonte Java.
  Desde 21/10 gerado por `scripts/entregar.ps1` (`pack-widget.ps1`).
