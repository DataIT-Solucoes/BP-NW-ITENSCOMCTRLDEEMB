# Badge da escolha nos filtros (autocomplete)

Receita para aplicar em outra tela o que foi feito nos filtros Estabelecimento, Item e Tipo de Embalagem
do `widget_nw_itensComCtrllDeEmb` (commit `9e171f1` + correção do × que apaga o texto).
Referência visual original: `widget_nw_manutEtiq` (`.nwm-selecionado-chip`).

## Comportamento

1. A pessoa digita (2+ caracteres) e escolhe uma sugestão do `FLUIGC.autocomplete`.
2. O código e o registro ficam guardados no input (`.data('codigo')`, `.data('registro')`).
3. O input **continua no lugar** (borda e ícone de lupa), fica `readonly`, com o texto transparente.
4. Por cima dele aparece a badge `código — descrição`. A descrição é cortada com reticências e o código nunca.
   O `title` da badge mostra o texto completo.
5. O botão **×** esconde a badge, destrava o campo, **apaga o texto**, limpa o código e devolve o foco ao input.

Não muda a busca: quem monta os filtros continua lendo `$campo.data('codigo')`.

## Pré-requisitos no HTML (`view.ftl`)

O input precisa estar dentro de uma caixa com `position: relative` (no `nwi`, `.nwi-campo-caixa`).
A badge é anexada nessa caixa. Nada a acrescentar no `view.ftl`: a badge é criada pelo JS.

```html
<div class="nwi-campo-caixa">
    <i class="bi bi-search" aria-hidden="true"></i>
    <input type="text" class="nwi-campo-input" autocomplete="off" data-filtro-est>
</div>
```

## JS

Trocar o prefixo `nwi` pelo da tela (`nwe`, `nwm`…). Todo o código é jQuery (regra do projeto).

### 1. Opção `comBadge` no autocomplete

No handler de seleção do autocomplete (`fluig.autocomplete.selected` / `fluig.autocomplete.autocompleted`),
depois de guardar o código e o registro:

```js
if (configuracao.comBadge) self.mostrarSelecionado($campo, registro, autocomplete);
```

E ligar só nos filtros (o modal de cadastro não usa badge):

```js
this.prepararAutocompleteApoio($('[data-filtro-est]', this.DOM), {
    // ...
    comBadge: true,
});
```

Dois pontos do autocomplete que a badge depende (já existiam no `nwi`):
- o handler de `input` e o `source` ignoram o campo quando ele está `readonly` (`if ($campo.prop('readonly')) return;`),
  então o campo travado não dispara consulta;
- `$campo.data('buscaApoio')` guarda a configuração, usada no × para cancelar consulta e chamar `aoMudarSelecao`.

### 2. Métodos da instância

```js
// O campo continua no lugar (com o texto escondido) e trava; a badge fica por cima dele.
mostrarSelecionado: function ($campo, registro, autocomplete) {
    var self = this;
    var $badge = $campo.data('badgeSelecionado');
    if (!$badge) {
        $badge = $('<span>', { 'class': 'nwi-selecionado', hidden: true })
            .append($('<span>', { 'class': 'nwi-selecionado-chip' })
                .append($('<span>', { 'class': 'nwi-selecionado-texto' })
                    .append($('<span>', { 'class': 'nwi-selecionado-codigo' }))
                    .append($('<span>', { 'class': 'nwi-selecionado-descricao' })))
                .append($('<button>', { type: 'button', 'class': 'nwi-selecionado-remover' })
                    .append($('<i>', { 'class': 'bi bi-x', 'aria-hidden': 'true' }))
                    .on('click.nwiApoio', function () { self.removerSelecionado($campo, autocomplete); })))
            .appendTo($campo.closest('.nwi-campo-caixa'));
        $campo.data('badgeSelecionado', $badge);
    }

    var rotulo = formatarRotulo(registro.codigo, registro.descricao);
    $badge.find('.nwi-selecionado-codigo').text(registro.codigo);
    $badge.find('.nwi-selecionado-descricao').text(registro.descricao ? ' — ' + registro.descricao : '');
    $badge.find('.nwi-selecionado-chip').attr('title', rotulo);
    $badge.find('.nwi-selecionado-remover').attr({ title: 'Remover', 'aria-label': 'Remover ' + rotulo });

    if (autocomplete) autocomplete.close();
    $campo.addClass('is-selecionado').prop('readOnly', true);
    $badge.prop('hidden', false);
    $badge.find('.nwi-selecionado-remover').trigger('focus');
},

removerSelecionado: function ($campo, autocomplete) {
    var $badge = $campo.data('badgeSelecionado');
    if ($badge) $badge.prop('hidden', true);
    $campo.removeClass('is-selecionado').prop('readOnly', false)
        .removeData('codigo').removeData('registro');
    // o val('') do FLUIGC.autocomplete pode não limpar (vazio vira leitura): limpa o typeahead e o input direto
    if ($.fn.typeahead && $campo.hasClass('tt-input')) $campo.typeahead('val', '');
    $campo.val('');
    if (autocomplete) autocomplete.close();
    var buscaApoio = $campo.data('buscaApoio');
    if (buscaApoio) {
        this.cancelarConsultaApoio(buscaApoio);
        if (buscaApoio.configuracao.aoMudarSelecao) buscaApoio.configuracao.aoMudarSelecao();
    }
    $campo.trigger('focus');
},
```

`formatarRotulo(codigo, descricao)` devolve `codigo — descricao` (ou só o código). Se a tela não tiver, criar igual.

## CSS

Todo seletor começa por `.fluig-style-guide.<prefixo>`. Variáveis da paleta: `--nwi-verde`, `--nwi-nevoa`,
`--nwi-tinta`, `--nwi-tinta-suave` (trocar pelo prefixo da tela).
Medidas pensadas para input de **44px** com ícone à esquerda (`padding-left: 40px`): `left: 36px` e `height: 44px`
na `.nwi-selecionado`. Ajuste se o campo da outra tela for diferente.

```css
/* O campo fica no lugar (mantém borda e ícone), com o texto escondido; a badge fica por cima dele. */
.fluig-style-guide.nwi .nwi-campo-caixa .nwi-campo-input.is-selecionado,
.fluig-style-guide.nwi .nwi-campo-caixa .nwi-campo-input.is-selecionado:hover {
    border-color: var(--nwi-verde);
    background-color: #fff !important;
    color: transparent;
    cursor: default;
}

.fluig-style-guide.nwi .nwi-selecionado {
    position: absolute;
    z-index: 3;
    top: 0;
    left: 36px;
    right: 8px;
    display: flex;
    align-items: center;
    height: 44px;
    min-width: 0;
    pointer-events: none;
}

.fluig-style-guide.nwi .nwi-selecionado[hidden] {
    display: none;
}

.fluig-style-guide.nwi .nwi-selecionado-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    max-width: 100%;
    box-sizing: border-box;
    padding: 2px 2px 2px 8px;
    border: 1px solid var(--nwi-verde);
    border-radius: 999px;
    background-color: var(--nwi-nevoa);
    font-size: 12px;
    font-weight: 700;
    line-height: 1.4;
    color: var(--nwi-tinta);
    pointer-events: auto;
}

.fluig-style-guide.nwi .nwi-selecionado-texto {
    display: flex;
    flex: 0 1 auto;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
}

.fluig-style-guide.nwi .nwi-selecionado-codigo {
    flex: 0 0 auto;
    max-width: 100%;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
}

.fluig-style-guide.nwi .nwi-selecionado-descricao {
    flex: 0 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    font-weight: 600;
}

.fluig-style-guide.nwi .nwi-selecionado-remover {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    font-size: 14px;
    color: var(--nwi-tinta-suave);
    cursor: pointer;
}

.fluig-style-guide.nwi .nwi-selecionado-remover:hover {
    background-color: rgba(0, 107, 53, 0.12);
    color: var(--nwi-tinta);
}

.fluig-style-guide.nwi .nwi-selecionado-remover:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(0, 107, 53, 0.28);
}
```

## Pegadinhas

- **`autocomplete.val('')` não apaga o texto** (provável: vazio é tratado como leitura). No × limpe direto:
  `$campo.typeahead('val', '')` (quando é `.tt-input`) e `$campo.val('')`.
- O typeahead cria um clone `.tt-hint` com os mesmos atributos. Ao ler o campo, use `.not('.tt-hint').first()`.
- O typeahead aplica fundo próprio no input: por isso o `background-color: #fff !important` no `.is-selecionado`.
- O `.nwi-campo-input[readonly]` da tela deixa o campo marfim; o `.is-selecionado` (mais específico) mantém branco.
- `pointer-events: none` na faixa da badge e `auto` no chip: clicar fora do chip não fica preso na faixa.
- Vários widgets na mesma página: a badge é presa ao `$campo` (`.data('badgeSelecionado')`), sem `id` global.
- Diferença em relação ao `manutEtiq`: lá o input some (`display: none`) e a badge ocupa o lugar dentro de uma caixa
  De/Até; aqui o input fica visível por baixo, porque o `FLUIGC.autocomplete` embrulha o input num `<span>`.
- Separador: `—` (travessão), igual à tabela do `nwi`. O `manutEtiq` usa `-`.

## Conferir depois de aplicar

- Arquivos do widget em CRLF: `grep -c $'\r' arquivo` igual ao número de linhas.
- `node --check` no JS.
- No Fluig (depois de publicar): escolher, ver a badge, clicar no ×, campo vazio e destravado, buscar sem filtro.
