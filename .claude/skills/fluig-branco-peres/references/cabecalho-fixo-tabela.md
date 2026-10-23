# Cabeçalho fixo da tabela (Tabulator) ao descer a página

Como prender o cabeçalho da tabela no topo da janela enquanto o usuário rola a **página** (não a tabela).
Modelo pronto: `widget_nw_bags` (`prepararCabecalhoFixo`, commit `8dca8ae`, 23/10/2026). Ideia original: widget
`atend_cd_production` (`BP-RessuprimentoCD-Atendimento`, `cons_ativarTheadFixoConsulta`), que faz o mesmo com `<thead>`.

Neste arquivo, `<p>` é o prefixo do widget (`nwb`, `nwe`, `nwi`, `nwm`…) e `<P>` o sufixo das constantes (`BAGS`…).

## Quando usar
- Tabela **sem altura própria**: ela cresce com a página e quem rola é a janela (ex.: paginação de 10 linhas + sub-tabela aberta).
- Se a tabela tem altura própria (`height`/`maxHeight` no Tabulator), o cabeçalho já fica fixo dentro dela. **Não** aplicar.

## Por que não `position: sticky`
- O Tabulator põe `overflow: hidden` no `.tabulator` (e o tema da tela também). Com `overflow` diferente de `visible` num
  ancestral, o `sticky` só gruda **dentro** desse ancestral, nunca na janela.
- O `.tabulator-header` é uma `div` que o Tabulator alinha com a rolagem horizontal do corpo: tirá-lo do lugar quebra isso.
- Por isso: uma **cópia** do cabeçalho em `position: fixed`, mostrada só quando o original sai da tela.

## Como funciona
1. Uma `div.<p>-cabecalho-fixo` (`position: fixed`, `hidden`, `aria-hidden`) é criada **dentro do widget** (`this.DOM`),
   não no `body`: os seletores `.fluig-style-guide.<p>` continuam valendo e dois widgets na página não se misturam.
2. A cópia do `.tabulator-header` vai dentro de uma `div` com as **mesmas classes** da tabela (e o atributo
   `tabulator-layout`): assim o CSS `.<p>-tabela.tabulator .tabulator-header ...` pega a cópia sem regra nova. As larguras das
   colunas vêm junto (o Tabulator grava `width` inline em cada `.tabulator-col`).
3. No `scroll`/`resize` da janela, `getBoundingClientRect()` da tabela decide: topo da tabela acima da linha
   `TOPO_CABECALHO_FIXO_<P>` **e** ainda sobra corpo abaixo do cabeçalho (descontado o rodapé) → mostra, com `left`/`width`
   da tabela. Senão, esconde.
4. A cópia é refeita quando a tabela redesenha (`renderComplete`, `dataSorted`, `columnResized`) e no `resize`. Enquanto está
   escondida, só marca "desatualizada" e copia de novo ao aparecer.
5. Rolagem horizontal (tela estreita): a cópia recebe o `scrollLeft` do `.tabulator-tableholder`.
6. Clique numa coluna da cópia → dispara `click` no elemento da coluna original (`tabela.getColumn(field).getElement()`): a
   ordenação é a do Tabulator, e a cópia é refeita pelo `dataSorted` (seta de ordenação certa).

## Passo a passo

### 1. Constante (junto das outras do JS)
```js
//cabeçalho fixo da tabela: distância do topo da janela (abaixo da barra do Fluig; mesmo valor do atend_cd_production)
var TOPO_CABECALHO_FIXO_<P> = 100;
```

### 2. Método no SuperWidget
Trocar `this.tabela<Nome>` pela variável da tabela do widget, `<p>` e `<P>` pelos do widget.
```js
  //Cabeçalho fixo (ideia do atend_cd_production): ao descer a página, uma cópia do .tabulator-header fica presa no topo,
  //alinhada à tabela, até o fim dela. A cópia é refeita quando a tabela redesenha (ordenação, largura das colunas, resize).
  //Clicar numa coluna da cópia ordena a tabela de verdade. Fica dentro do widget (não no body) e só para leitor de tela some
  prepararCabecalhoFixo() {
    var self = this,
      tabela = this.tabela<Nome>,
      $tabela = $(tabela.element),
      desatualizado = true,
      evento = ".<p>CabecalhoFixo" + this.instanceId;
    var $fixo = $("<div>", {
      class: "<p>-cabecalho-fixo",
      "aria-hidden": "true",
      hidden: true,
    })
      .css("top", TOPO_CABECALHO_FIXO_<P> + "px")
      .appendTo(this.DOM);

    //a cópia vai dentro de uma div com as classes da tabela, para pegar o mesmo CSS (.<p>-tabela.tabulator .tabulator-header)
    var copiar = function () {
      var $copia = $tabela.children(".tabulator-header").clone();
      $copia.find("[id]").removeAttr("id");
      $copia.find("[tabindex]").addBack("[tabindex]").removeAttr("tabindex");
      $fixo
        .empty()
        .append(
          $("<div>", {
            class: $tabela.attr("class"),
            "tabulator-layout": $tabela.attr("tabulator-layout"),
          }).append($copia),
        );
      desatualizado = false;
    };

    var ajustar = function () {
      var caixa = $tabela[0].getBoundingClientRect(),
        alturaCabecalho = $tabela.children(".tabulator-header").outerHeight() || 0,
        alturaRodape = $tabela.children(".tabulator-footer").outerHeight() || 0;
      var mostrar =
        $tabela.is(":visible") &&
        caixa.top < TOPO_CABECALHO_FIXO_<P> &&
        caixa.bottom - alturaRodape >
          TOPO_CABECALHO_FIXO_<P> + alturaCabecalho;
      if (!mostrar) {
        $fixo.prop("hidden", true);
        return;
      }
      if (desatualizado || $fixo.prop("hidden")) copiar();
      $fixo
        .css({ left: caixa.left + "px", width: caixa.width + "px" })
        .prop("hidden", false);
      //rolagem horizontal da tabela (tela estreita): a cópia acompanha
      $fixo
        .find(".tabulator-header")
        .scrollLeft($tabela.children(".tabulator-tableholder").scrollLeft());
    };

    var refazer = function () {
      desatualizado = true;
      ajustar();
    };
    $.each(["renderComplete", "dataSorted", "columnResized"], function (i, nome) {
      tabela.on(nome, refazer);
    });
    $(window)
      .off(evento)
      .on("scroll" + evento, ajustar)
      .on("resize" + evento, refazer);
    $tabela.children(".tabulator-tableholder").on("scroll" + evento, ajustar);

    $fixo.on("click", ".tabulator-col[tabulator-field]", function () {
      var coluna = tabela.getColumn($(this).attr("tabulator-field"));
      if (coluna && coluna.getDefinition().headerSort !== false)
        coluna
          .getElement()
          .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
  },
```

### 3. Chamar logo depois de criar a tabela
No método que faz `new Tabulator(...)` (no `nwb`: fim do `montarTabelas`), **uma vez** por tabela:
```js
    this.prepararCabecalhoFixo();
```
Pode ser antes do `tableBuilt`: a cópia só é feita quando a tabela já está na tela e o usuário rola.

### 4. CSS (junto do bloco da tabela)
`top`, `left` e `width` vêm do JS. O raio (`14px`) e a sombra seguem o `.<p>-tabela.tabulator` do widget: conferir.
```css
/* cabeçalho fixo: cópia do cabeçalho da tabela presa no topo ao descer a página (prepararCabecalhoFixo; top e left no JS) */
.fluig-style-guide.<p> .<p>-cabecalho-fixo {
    position: fixed;
    z-index: 40;
    overflow: hidden;
    border-radius: 0 0 14px 14px;
    box-shadow: 0 6px 16px rgba(32, 32, 30, 0.12);
}

.fluig-style-guide.<p> .<p>-cabecalho-fixo > .<p>-tabela.tabulator {
    margin: 0;
    border-radius: 0 0 14px 14px;
}

.fluig-style-guide.<p> .<p>-cabecalho-fixo .tabulator-header {
    overflow: hidden;
}
```
- `z-index: 40`: abaixo do loading global do padrão `nw` (`.<p>-carregando-global`, 50). Modais `<dialog>` ficam na camada
  superior e cobrem a cópia sem precisar de z-index.
- O widget precisa da regra `.fluig-style-guide.<p> [hidden] { display: none !important; }` (padrão `nw`). Sem ela, o
  `display` de alguma regra pode vencer o `hidden`.

## O que adaptar em cada tela
| Ponto | Onde olhar |
|---|---|
| Nome da tabela (`this.tabela<Nome>`) e de onde chamar | método que faz `new Tabulator(...)` |
| Classe da tabela (`.<p>-tabela`) | CSS `.<p>-tabela.tabulator` do widget |
| Mais de uma tabela que rola com a página | chamar uma vez por tabela; trocar `evento` para incluir o nome da tabela (senão o `.off(evento)` da 2ª desliga a 1ª) |
| Tabela dentro de aba | já coberto: aba escondida → `$tabela.is(":visible")` falso → cópia escondida |
| Coluna com `headerSort: false` | o clique na cópia é ignorado (como no original) |
| Cabeçalho com checkbox "marcar todos" (`rowSelection` no título) | **não coberto**: o clone não tem o evento. Religar como o `atend_cd_production` faz com `#consulta-checkbox-todos` (sincronizar os dois `checked`), ou não usar nessa tabela |
| Filtro no cabeçalho (`headerFilter`) | **não coberto**: o campo copiado não filtra. Não usar nessa tabela sem adaptar |

## Como testar (Fluig de TESTE)
1. Página com dados suficientes para rolar (abrir uma sub-tabela ajuda). Descer: a cópia aparece quando o cabeçalho original
   passa da barra do Fluig e some quando o fim da tabela chega.
2. A cópia fica **logo abaixo** da barra do Fluig, sem cobrir nem deixar folga. Se não, ajustar `TOPO_CABECALHO_FIXO_<P>`.
3. Colunas da cópia alinhadas com as do corpo; redimensionar a janela e conferir de novo.
4. Clicar numa coluna da cópia: a tabela ordena e a seta da cópia muda.
5. Tela estreita (rolagem horizontal da tabela): a cópia acompanha.
6. Abrir um modal com a cópia visível: o modal fica por cima.

## Pegadinhas
- **Ancestral com `transform`, `filter` ou `perspective`** faz o `position: fixed` ficar preso nele, não na janela (a cópia rola
  junto ou some). Se acontecer na página do Fluig, mudar o `appendTo(this.DOM)` para `appendTo(document.body)` e, como os
  seletores `.fluig-style-guide.<p>` deixam de pegar, pôr na `$fixo` também as classes do container
  (`fluig-style-guide <p>`) ou repetir o CSS do cabeçalho sem o container.
- Os 100px vêm do `atend_cd_production` (mesmo portal). Página com outra barra no topo → outro valor.
- Não copiar a cópia em todo `scroll`: só quando a tabela redesenha (`desatualizado`) ou quando a cópia volta a aparecer.
- `renderComplete` dispara a cada redesenho (paginação, `reformat`): por isso `refazer` só marca e o `ajustar` decide.
- Listeners da janela sempre com namespace + `instanceId` (`.off(evento)` antes do `.on`), para a mesma página com dois
  widgets ou um `init` repetido não duplicar.

## Rollback
No `nwb` foi um commit só (`8dca8ae`): `git revert <commit>` e entregar de novo. Ao aplicar em outra tela, manter a mudança
**num commit só** pelo mesmo motivo.
