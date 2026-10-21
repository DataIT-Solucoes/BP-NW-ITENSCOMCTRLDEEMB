# Padrão visual dos widgets `nw*` (Branco Peres)

Base: `widget_nw_embalagens` (`nwe`, classes `embalagens-*`/container `cadastro-embalagens`),
`widget_nw_itensComCtrllDeEmb` (`nwi`) e `widget_nw_manutEtiq` (`nwm`). Widget novo copia o padrão com o prefixo próprio.
Em `widget_nw_embalagens` o prefixo real das classes é `embalagens-*` (o "nwe" é o nome curto usado no texto).

## Paleta oficial (não usar cores fora dela)
Variáveis no topo do CSS, dentro de `.fluig-style-guide.<prefixo>`:

| Variável (sufixo) | Valor | Uso |
|---|---|---|
| `cor-principal` | `#006B35` | verde institucional: ação principal, foco, seleção, situação Ativo |
| `cor-principal-hover` | `#00552A` | hover do verde |
| `cor-destaque` | `#FFD200` | amarelo solar: brilho da linha gravada/alterada |
| `cor-exclusao` | `#ED1C24` | vermelho da marca: só ação destrutiva/inativar |
| `cor-erro` | `#C4161C` | texto de erro (o vermelho puro tem contraste baixo em letra pequena) |
| `cor-texto` | `#20201E` | carvão: texto e ícones |
| `cor-texto-secundario` | `#5E5D57` | texto secundário |
| `fundo-superficie` | `#F7F5EE` | marfim: filtros, cabeçalho/rodapé da tabela |
| `fundo-hover` | `#E5EDE3` | verde névoa: fundo de seleção e hover |
| `cor-borda` / `cor-borda-campo` | `#E3E1D8` / `#D3D1C7` | bordas |

Fonte: **Mulish** (400/600/700/800), fallback `"Open Sans", Helvetica, Arial, sans-serif`. Container com
`padding: 28px`.

## Regra de ouro do CSS
Todo seletor começa com `.fluig-style-guide.<prefixo>` (ex.: `.fluig-style-guide.nwm .nwm-cabecalho`).
Sem isso o Style Guide vence (`.fluig-style-guide header`, `h2`…). Cabeçalhos usam `font-family: inherit` e
tabelas/inputs reescrevem `font-family: inherit` quando o Style Guide impõe Helvetica.

## Anatomia da tela (ordem)
1. **Cabeçalho**: selo redondo (anel verde 3px, 56px, ícone `bi-*` no miolo transparente) + título (26px, peso 800)
   + subtítulo (15px, secundário) + ações à direita (ex.: botão **Novo** verde/`destaque`).
2. **Abas** (se houver mais de uma): `role="tablist"`, botão com ícone, **indicador** deslizante verde embaixo
   (reposicionar quando a fonte Mulish termina de carregar: `document.fonts`).
3. **Filtros**: cartão **marfim** (sem divisória nem parte branca), `role="search"`; rótulo + campo; botão
   **Buscar** verde cheio. Busca vai ao servidor, não filtra só a tela, quando a fonte é Dataset.
4. **Tabela** (Tabulator 6.4.0, tema `tabulator_simple`): classe `.tabulator` na **própria** div da tabela
   (`.<p>-tabela.tabulator`, sem espaço); rodapé próprio (`footerElement`) com "Mostrando N …"; setas de
   ordenação inativas precisam de `[aria-sort="none"] .tabulator-col-content` no seletor.
5. **Modais**: `<dialog>` nativo (`showModal()/close()`), estrutura cabeçalho/corpo/rodapé, botão fechar `bi-x-lg`
   com `aria-label`. Confirmações destrutivas com `role="alertdialog"`, foco inicial em **Cancelar**.
6. **Avisos rápidos**: `FLUIGC.toast` (`type: 'warning'|'success'|'danger'`).

## Botões
`<p>-botao` + variantes: `-destaque` (verde cheio), `-contorno` (borda), `-perigo` (vermelho, só destrutivo).
Ações por linha são **só-ícone** com `title` + `aria-label` (ex.: Detalhes `bi-eye`, Imprimir `bi-printer`,
Receber `bi-box-arrow-in-down`, Estornar `bi-arrow-counterclockwise`, Descartar `bi-trash3`,
Transferir `bi-arrow-left-right`, Editar lápis). Botão grudado a um campo (Aplicar/Executar) fica acoplado à direita dele.

## Campos e autocomplete
- Autocomplete **próprio** (não o FLUIGC): mínimo **2 caracteres**, debounce **350 ms**, limite **20**,
  `abort` da consulta anterior por campo, resposta antiga ignorada, **exigir item selecionado** (código),
  limpar dependentes ao trocar o pai, não baixar cadastro inteiro. Busca por código **ou** descrição.
  ARIA de combobox (`role="combobox"`, `aria-expanded`, `aria-controls`).
- Exibição de lookup: `código — descrição`; em campos de **faixa De/Até** o autocomplete preenche só o código.
- Faixa De/Até = **uma caixa dividida ao meio**.
- **Select2 4.0.13** (pt-BR) para selects com busca (ação em lote, escolher item); dropdown acoplado ao campo, sem folga.
- Campo obrigatório: `<abbr class="...-obrigatorio" title="Obrigatório">*</abbr>`; inválido: classe `is-invalido` +
  `aria-invalid`; aviso por `FLUIGC.toast({type:'warning'})` e foco no campo que falta.
- Erro de campo: `<p class="...-campo-erro" data-erro="nome">` ligado por `aria-describedby`.
- Chip colorido para status/unidade (em vez de pintar a linha inteira).
- Switch Ativo/Inativo na linha quando a regra permite.

## Decisões de UX já tomadas pelo usuário (vale para telas parecidas)
- **O que a tela legada mostra sempre, o mockup também mostra** (ex.: tabela "Itens selecionados" sempre visível,
  vazia com "Nenhum item selecionado").
- **Sem enfeites para sinalizar regra** (círculo "ou", colchete, texto "preencha X ou Y"): a regra fica só na validação/toast.
- **Sem textos de dica embaixo dos campos de filtro** quando o usuário disser que não quer (no `nwm` foram removidos).
- Filtros: layout "Hierarquia" — linha de cima com os campos principais em colunas iguais, linha de baixo com os
  secundários; cartão todo marfim. A "grade de 16 caixas iguais" foi recusada ("horrível").
- Tabela inteira **sem paginação** quando a tela legada não paginava (altura própria `maxHeight: 560`, cabeçalho fixo,
  DOM virtual); com Dataset/REST, **uma página por consulta + botão "Carregar mais"** pelo cursor.
- Ordenação por coluna ligada; ordem inicial definida na regra.
- Densidade: linha ~47px; larguras de coluna ajustadas para não truncar cabeçalho a 1366px; todas as ações visíveis.
- Remover do cabeçalho botões sem efeito conhecido (ex.: "Gerar etiquetas" foi removido) em vez de deixar placeholder.
- Nome exibido da tela pode diferir do `application.title` (que fica o gerado).

## Acessibilidade (conferir sempre)
Rótulo ligado a cada campo (`for`/`id` com `-${instanceId}`), `aria-label` nos botões só-ícone, `role="alert"` nos
erros de modal, foco visível (verde), `<dialog>` com `aria-labelledby`, contraste (por isso `#C4161C` no texto de erro).
Há MCP `accesslint` disponível para auditar.

## Tabulator: cuidados
- `tabela.alert(texto)` vira HTML: mensagem vinda da API entra como elemento com `textContent`
  (função de escape para qualquer texto externo).
- Carregar o JS uma vez por página (promessa global) **ou** `<script>` com SRI no `view.ftl`.
- Ordenar reordena só o que já foi carregado.
- Fallback de erro visível se a biblioteca não carregar.
