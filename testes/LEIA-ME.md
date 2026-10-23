# Testes do widget_nw_itensComCtrllDeEmb

Testes **locais** (Node + jsdom, sem rede e sem navegador): o JS do widget com jQuery 3.6.3, Tabulator 6.4.0 e Select2 4.0.13 reais
(mesmas versões do Fluig/CDN) e o markup do `view.ftl`. Não usam o Chrome nem o MCP, e não gravam nada no Fluig.

```
cd testes
npm install        # só na primeira vez
npm test           # ou: node rodar-testes.cjs  → tem de terminar com FALHARAM=0
```

| Suíte | O que testa |
|---|---|
| `testar-contrato-github.cjs` | `dataset/dsNwEmbalagens.js` igual ao do GitHub `DataIT-Solucoes/BP-NW-DATASET` (main, baixado com o `gh`); as 6 ações do widget existem, liberadas ao DefaultGroup-1, escritas em `escritasHabilitadas`; limites dentro do teto; formatos de pedido aceitos |
| `testar-transporte-dataset.cjs` | pedido ao `/api/public/ecm/dataset/search`, envelope quebrado, HTTP, recusas, cursor repetido/vazio, carga velha cancelada, Tabulator pelo CDN (uma vez por página; falha mostra aviso) |
| `testar-tela.cjs` | carga em páginas de 100 por cursor, colunas e valores, placeholder, autocompletes dos filtros (mínimo 2, parâmetros, resposta velha, falha), badge e ×, Buscar com filtros, Select2, abas |
| `testar-comandos.cjs` | Novo (validações, unidade do item, só tipos ativos, `incluirParametro`), Editar (estabelecimento/item travados, `ALTERAR`), interruptor (`INATIVAR`/`ALTERAR`), Excluir (`EXCLUIR`), `CONFLITO_VERSAO`, resultado incerto com a mesma chave, repetição, recusas, trava dos modais |
| `testar-cabecalho-fixo.cjs` | cabeçalho fixo: quando aparece/some, posição, conteúdo da cópia, ordenação pela cópia, rolagem horizontal, refazer no resize/redesenho, tabela escondida, listeners por instância, CSS |

## De onde vêm as respostas
- **Pedidos:** o `dataset/dsNwEmbalagens.js` roda num `vm` e valida todo pedido do widget com as funções do próprio Dataset
  (`nwParametros`, estabelecimentos da regra do DefaultGroup-1, `escritasHabilitadas`). Pedido que o Dataset recusaria volta
  como recusa e o teste falha (`conferirContrato`).
- **Respostas: simuladas**, não gravadas do Fluig. Um servidor em memória (`servidorSimulado` em `ambiente.cjs`) aplica cursor
  `proximoId`, versão, chave idempotente e `CONFLITO_VERSAO`. As respostas de consulta passam pelo `nwValidarResposta` do Dataset.
  As fotografias de comando seguem o que o widget confere (`fotografiaParametroValida`): **o retorno real do backend não foi visto**.
- Dados fictícios: estabelecimentos `10904` e `11301` (os da regra do Dataset), itens `IT-*`, tipos `CX01`, `SC02`, `TB03` (inativo).
- **Simulado:** só o que é do Fluig, da rede ou do layout: `$.ajax`, `FLUIGC.toast`, `FLUIGC.autocomplete` (cria a cópia `tt-hint`
  antes do campo, como o typeahead do Fluig), bindings do SuperWidget, timers com atraso, `<dialog>`, medidas e `scrollLeft`.
  O cabeçalho fixo usa a caixa da tabela (`getBoundingClientRect`) definida pelo teste.
- `NWI_FONTE_WIDGET=<arquivo>` roda os testes com outra cópia do JS (ex.: defeito plantado, para conferir que os testes pegam).

## O que estes testes não cobrem
Layout real (larguras, sobreposição do modal, posição sob a barra do Fluig), CDN, sessão/permissões do Fluig e o retorno real do
Datasul. Isso continua em `docs/pendencias.md` ("Confirmar no Fluig de TESTE").
