// Tabulator (tabela) vem do CDN. Carregado uma vez só, mesmo com várias instâncias do widget na página.
var NWI_TABULATOR_JS = 'https://cdnjs.cloudflare.com/ajax/libs/tabulator/6.4.0/js/tabulator.min.js';
var nwiTabulatorPromise = null;

// DADOS MOCKADOS, só para visualizar a tela. Trocar pelos datasets/REST quando forem definidos.
// Listas de apoio (estabelecimento, item e tipo de embalagem) usadas pelos autocompletes.
var NWI_FONTES = {
    estabelecimentos: [
        { codigo: '10901', descricao: 'Fazenda 10901' },
        { codigo: '10902', descricao: 'Fazenda 10902' },
        { codigo: '10904', descricao: 'Fazenda 10904' }
    ],
    itens: [
        { codigo: '365131', descricao: 'DIMEXION - ONU 3018', unidade: 'LT' },
        { codigo: '361378', descricao: 'OMITE 720 CE BR - ONU 3082', unidade: 'LT' },
        { codigo: '357867', descricao: 'REGLONE', unidade: 'LT' }
    ],
    tipos: [
        { codigo: 'PL', descricao: 'PLÁSTICA' },
        { codigo: 'MT', descricao: 'METÁLICA' },
        { codigo: 'RF', descricao: 'REFORÇADA' }
    ]
};

var NWI_DADOS_MOCK = [
    {
        id: 1,
        estCodigo: '10901', estDescricao: 'Fazenda 10901',
        itemCodigo: '365131', itemDescricao: 'DIMEXION - ONU 3018',
        unidade: 'LT',
        tipoCodigo: 'PL', tipoDescricao: 'PLÁSTICA',
        capacidade: 20, ativo: true
    },
    {
        id: 2,
        estCodigo: '10902', estDescricao: 'Fazenda 10902',
        itemCodigo: '361378', itemDescricao: 'OMITE 720 CE BR - ONU 3082',
        unidade: 'LT',
        tipoCodigo: 'PL', tipoDescricao: 'PLÁSTICA',
        capacidade: 10, ativo: true
    }
];

var widget_nw_itensComCtrllDeEmb = SuperWidget.extend({

    //aba atualmente selecionada
    abaAtual: 'itens-controlados',

    //instância do Tabulator
    tabela: null,

    //linha do Tabulator em edição (null = modal em modo "novo") e linha aguardando confirmação de exclusão
    linhaEditando: null,
    linhaExcluindo: null,

    //maior id já usado nos dados mockados (enquanto não há gravação de verdade)
    ultimoId: 0,

    //método iniciado quando a widget é carregada
    init() {
        var self = this;
        this.$tabs = $('.nwi-tabs', this.DOM);
        this.moverIndicador();
        $(window).on('resize.nwi' + this.instanceId, function () { self.moverIndicador(); });
        //a fonte Mulish chega depois e muda a largura da aba: medir de novo
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(function () { self.moverIndicador(); });
            document.fonts.addEventListener('loadingdone', function () { self.moverIndicador(); });
        }

        this.ultimoId = NWI_DADOS_MOCK.reduce(function (maior, p) { return Math.max(maior, p.id); }, 0);

        this.carregarTabulator().then(function () {
            self.montarTabela();
        }, function () {
            $('[data-tabela]', self.DOM).html('<p class="nwi-tabela-erro">Não foi possível carregar a tabela. Verifique a conexão com a internet e recarregue a página.</p>');
        });

        this.prepararAutocompletes();
        this.prepararModalCadastro();
        this.prepararModalExcluir();
    },

    //BIND de eventos
    bindings: {
        local: {
            'tab': ['click_selecionarAba', 'keydown_navegarAbas'],
            'buscar': ['click_buscar'],
            'novo': ['click_abrirModalNovo'],
            'fechar-modal': ['click_fecharModalCadastro'],
            'fechar-excluir': ['click_fecharModalExcluir'],
            'confirmar-excluir': ['click_confirmarExclusao']
        },
        global: {}
    },

    selecionarAba(htmlElement, event) {
        this.ativarAba($(htmlElement));
    },

    //setas/Home/End movem o foco entre as abas (padrão WAI-ARIA)
    navegarAbas(htmlElement, event) {
        var abas = this.$tabs.find('.nwi-tab');
        var i = abas.index(htmlElement);
        var destino = null;

        if (event.key === 'ArrowRight') destino = (i + 1) % abas.length;
        else if (event.key === 'ArrowLeft') destino = (i - 1 + abas.length) % abas.length;
        else if (event.key === 'Home') destino = 0;
        else if (event.key === 'End') destino = abas.length - 1;
        if (destino === null) return;

        event.preventDefault();
        this.ativarAba(abas.eq(destino));
        abas.eq(destino).trigger('focus');
    },

    ativarAba($aba) {
        this.$tabs.find('.nwi-tab')
            .removeClass('is-active').attr({ 'aria-selected': 'false', tabindex: '-1' });
        $aba.addClass('is-active').attr({ 'aria-selected': 'true', tabindex: '0' });
        this.abaAtual = $aba.data('aba');
        this.moverIndicador();
    },

    moverIndicador() {
        var $ativa = this.$tabs.find('.nwi-tab.is-active');
        if (!$ativa.length) return;
        this.$tabs.find('.nwi-tabs-indicador').css({
            width: $ativa.outerWidth() + 'px',
            transform: 'translateX(' + $ativa.position().left + 'px)'
        });
    },

    // ---------- Autocomplete (estabelecimento, item e tipo de embalagem) ----------

    //um só conjunto de handlers, delegado a partir da div do widget: vale para os filtros e para o modal
    prepararAutocompletes() {
        var self = this;
        var $raiz = $(this.DOM);

        $raiz.on('input.nwi', '[data-auto] .nwi-campo-input', function () {
            var $input = $(this);
            $input.removeData('codigo');
            if ($input.attr('name') === 'item') self.preencherUnidade('');
            self.abrirSugestoes($input);
        });

        $raiz.on('focus.nwi', '[data-auto] .nwi-campo-input', function () {
            self.abrirSugestoes($(this));
        });

        $raiz.on('keydown.nwi', '[data-auto] .nwi-campo-input', function (event) {
            self.teclaNoAutocomplete($(this), event);
        });

        //clique na sugestão: mousedown, porque o blur do input fecha a lista antes do click
        $raiz.on('mousedown.nwi', '[data-auto] .nwi-sugestao', function (event) {
            event.preventDefault();
            var $caixa = $(this).closest('[data-auto]');
            self.escolherSugestao($caixa.find('.nwi-campo-input'), $(this).data('indice'));
        });

        $raiz.on('blur.nwi', '[data-auto] .nwi-campo-input', function () {
            var $input = $(this);
            setTimeout(function () { self.fecharSugestoes($input); }, 150);
        });
    },

    //lista filtrada pelo que foi digitado (a partir de 2 caracteres, como no protótipo)
    sugestoesPara($input) {
        var $caixa = $input.closest('[data-auto]');
        var fonte = NWI_FONTES[$caixa.data('auto')] || [];
        var termo = this.normalizar($input.val());
        if (termo.length < 2) return null;

        var self = this;
        return fonte.filter(function (x) {
            return self.normalizar(x.codigo + ' ' + x.descricao).indexOf(termo) !== -1;
        }).slice(0, 20);
    },

    abrirSugestoes($input) {
        if ($input.prop('readonly')) return;
        var $lista = $input.closest('[data-auto]').find('.nwi-sugestoes');
        var achados = this.sugestoesPara($input);

        if (achados === null) {
            this.fecharSugestoes($input);
            return;
        }

        $lista.empty();
        if (!achados.length) {
            $lista.append($('<li>').addClass('nwi-sugestao-vazia').text('Nenhuma opção encontrada.'));
        } else {
            achados.forEach(function (x, i) {
                $('<li>')
                    .addClass('nwi-sugestao')
                    .attr({ role: 'option', 'aria-selected': 'false' })
                    .data('indice', i)
                    .append($('<span>').addClass('nwi-sugestao-codigo').text(x.codigo))
                    .append($('<span>').addClass('nwi-sugestao-descricao').text(x.descricao))
                    .appendTo($lista);
            });
        }
        $lista.prop('hidden', false);
        $input.attr('aria-expanded', 'true');
    },

    fecharSugestoes($input) {
        $input.closest('[data-auto]').find('.nwi-sugestoes').prop('hidden', true).empty();
        $input.attr('aria-expanded', 'false');
    },

    //setas navegam, Enter escolhe, Esc fecha
    teclaNoAutocomplete($input, event) {
        var $lista = $input.closest('[data-auto]').find('.nwi-sugestoes');
        var $opcoes = $lista.find('.nwi-sugestao');

        if (event.key === 'Escape') {
            this.fecharSugestoes($input);
            return;
        }
        if (!$opcoes.length) return;

        var atual = $opcoes.index($opcoes.filter('.is-ativa'));

        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            var destino = event.key === 'ArrowDown'
                ? (atual + 1) % $opcoes.length
                : (atual <= 0 ? $opcoes.length - 1 : atual - 1);
            $opcoes.removeClass('is-ativa').attr('aria-selected', 'false');
            $opcoes.eq(destino).addClass('is-ativa').attr('aria-selected', 'true');
            $opcoes.eq(destino)[0].scrollIntoView({ block: 'nearest' });
            return;
        }
        if (event.key === 'Enter' && atual !== -1) {
            event.preventDefault();
            this.escolherSugestao($input, $opcoes.eq(atual).data('indice'));
        }
    },

    escolherSugestao($input, indice) {
        var achados = this.sugestoesPara($input);
        if (!achados || !achados[indice]) return;
        var escolhido = achados[indice];

        $input.val(escolhido.codigo + ' — ' + escolhido.descricao);
        $input.data('codigo', escolhido.codigo);
        this.fecharSugestoes($input);

        //o item define a unidade do cadastro
        if ($input.attr('name') === 'item') this.preencherUnidade(escolhido.unidade || '');
        if ($input.attr('name')) this.marcarErro($input.attr('name'), '');
    },

    preencherUnidade(unidade) {
        $('[name="unidade"]', this.DOM).val(unidade);
    },

    // ---------- Tabela ----------

    carregarTabulator() {
        if (window.Tabulator) return Promise.resolve();
        if (!nwiTabulatorPromise) {
            nwiTabulatorPromise = new Promise(function (resolve, reject) {
                var script = document.createElement('script');
                script.src = NWI_TABULATOR_JS;
                script.onload = resolve;
                script.onerror = function () {
                    nwiTabulatorPromise = null;
                    reject();
                };
                document.head.appendChild(script);
            });
        }
        return nwiTabulatorPromise;
    },

    montarTabela() {
        var self = this;
        this.tabela = new Tabulator($('[data-tabela]', this.DOM)[0], {
            data: NWI_DADOS_MOCK.slice(),
            layout: 'fitColumns',
            responsiveLayout: false,
            pagination: true,
            paginationSize: 10,
            paginationCounter: function (pageSize, currentRow, currentPage, totalRows) {
                if (!totalRows) return '';
                var ate = Math.min(currentRow + pageSize - 1, totalRows);
                return 'Mostrando ' + currentRow + '–' + ate + ' de ' + totalRows;
            },
            initialSort: [{ column: 'estCodigo', dir: 'asc' }],
            placeholder: 'Nenhum item controlado encontrado.',
            locale: 'pt-br',
            langs: {
                'pt-br': {
                    data: { loading: 'Carregando...', error: 'Erro ao carregar' },
                    pagination: {
                        //o Tabulator coloca estes textos como HTML no botão: ícones em vez de « ‹ › »
                        first: '<i class="bi bi-chevron-double-left" aria-hidden="true"></i>', first_title: 'Primeira página',
                        last: '<i class="bi bi-chevron-double-right" aria-hidden="true"></i>', last_title: 'Última página',
                        prev: '<i class="bi bi-chevron-left" aria-hidden="true"></i>', prev_title: 'Página anterior',
                        next: '<i class="bi bi-chevron-right" aria-hidden="true"></i>', next_title: 'Próxima página'
                    }
                }
            },
            columns: [
                {
                    title: 'Estabelecimento', field: 'estCodigo', sorter: 'string', widthGrow: 2, minWidth: 180, vertAlign: 'middle',
                    formatter: function (cell) { return self.celulaCodigoDescricao(cell.getRow().getData().estCodigo, cell.getRow().getData().estDescricao); }
                },
                {
                    title: 'Item', field: 'itemCodigo', sorter: 'string', widthGrow: 3, minWidth: 220, vertAlign: 'middle',
                    formatter: function (cell) { return self.celulaCodigoDescricao(cell.getRow().getData().itemCodigo, cell.getRow().getData().itemDescricao); }
                },
                {
                    title: 'Unidade', field: 'unidade', sorter: 'string', width: 135, vertAlign: 'middle',
                    formatter: function (cell) {
                        var span = document.createElement('span');
                        span.className = 'nwi-sigla';
                        span.textContent = cell.getValue();
                        return span;
                    }
                },
                {
                    title: 'Tipo de Embalagem', field: 'tipoCodigo', sorter: 'string', widthGrow: 2, minWidth: 170, vertAlign: 'middle',
                    formatter: function (cell) { return self.celulaCodigoDescricao(cell.getRow().getData().tipoCodigo, cell.getRow().getData().tipoDescricao); }
                },
                {
                    title: 'Capacidade', field: 'capacidade', sorter: 'number', width: 140, hozAlign: 'right', vertAlign: 'middle',
                    formatter: function (cell) {
                        var span = document.createElement('span');
                        span.className = 'nwi-capacidade';
                        span.textContent = self.formatarCapacidade(cell.getValue());
                        return span;
                    }
                },
                {
                    title: 'Situação', field: 'ativo', sorter: 'boolean', width: 140, vertAlign: 'middle',
                    formatter: function (cell) { return self.montarSwitch(cell.getRow()); }
                },
                {
                    //sem ordenação de verdade: a seta do cabeçalho é só visual (CSS .nwi-col-acoes)
                    title: 'Ações', headerSort: false, cssClass: 'nwi-col-acoes', width: 120, hozAlign: 'right', vertAlign: 'middle',
                    formatter: function (cell) { return self.montarBotoesAcoes(cell.getRow().getData()); },
                    cellClick: function (event, cell) {
                        var botao = event.target.closest('[data-acao]');
                        if (!botao) return;
                        if (botao.getAttribute('data-acao') === 'editar') self.abrirModalEditar(cell.getRow());
                        else self.abrirModalExcluir(cell.getRow());
                    }
                }
            ]
        });
    },

    celulaCodigoDescricao(codigo, descricao) {
        var span = document.createElement('span');
        var forte = document.createElement('span');
        forte.className = 'nwi-codigo';
        forte.textContent = codigo;
        var resto = document.createElement('span');
        resto.className = 'nwi-descricao';
        resto.textContent = ' — ' + descricao;
        span.appendChild(forte);
        span.appendChild(resto);
        return span;
    },

    //4 casas decimais e vírgula, como no Progress
    formatarCapacidade(valor) {
        return Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    },

    //MOCK: a troca de situação só altera a linha da tela. Trocar pelo PATCH quando o serviço existir.
    montarSwitch(linha) {
        var self = this;
        var dados = linha.getData();
        var label = document.createElement('label');
        label.className = 'nwi-switch';

        var input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = !!dados.ativo;
        input.setAttribute('aria-label', 'Situação de ' + dados.itemCodigo + ' em ' + dados.estCodigo);

        var trilho = document.createElement('span');
        trilho.className = 'nwi-switch-trilho';

        var texto = document.createElement('span');
        texto.className = 'nwi-switch-texto';
        texto.textContent = dados.ativo ? 'Ativo' : 'Inativo';

        input.addEventListener('change', function () {
            texto.textContent = input.checked ? 'Ativo' : 'Inativo';
            linha.update({ ativo: input.checked });
        });
        //o clique no switch não deve selecionar/ordenar nada atrás dele
        label.addEventListener('click', function (event) { event.stopPropagation(); });

        label.appendChild(input);
        label.appendChild(trilho);
        label.appendChild(texto);
        return label;
    },

    montarBotoesAcoes(dados) {
        var grupo = document.createElement('div');
        grupo.className = 'nwi-acoes';
        [
            { acao: 'editar', icone: 'bi-pencil', texto: 'Editar' },
            { acao: 'excluir', icone: 'bi-trash3', texto: 'Excluir' }
        ].forEach(function (b) {
            var botao = document.createElement('button');
            botao.type = 'button';
            botao.className = 'nwi-acao nwi-acao-' + b.acao;
            botao.setAttribute('data-acao', b.acao);
            botao.setAttribute('aria-label', b.texto + ' ' + dados.itemCodigo + ' em ' + dados.estCodigo);
            botao.title = b.texto;
            botao.innerHTML = '<i class="bi ' + b.icone + '" aria-hidden="true"></i>';
            grupo.appendChild(botao);
        });
        return grupo;
    },

    // ---------- Filtros ----------

    buscar(htmlElement, event) {
        if (!this.tabela) return;
        var self = this;
        var est = this.valorFiltro('[data-filtro-est]');
        var item = this.valorFiltro('[data-filtro-item]');
        var tipo = this.valorFiltro('[data-filtro-tipo]');
        var situacao = $('[data-filtro-situacao]', this.DOM).val();

        if (!est && !item && !tipo && situacao === 'todos') {
            this.tabela.clearFilter();
            return;
        }

        this.tabela.setFilter(function (linha) {
            return self.combina(est, linha.estCodigo, linha.estDescricao)
                && self.combina(item, linha.itemCodigo, linha.itemDescricao)
                && self.combina(tipo, linha.tipoCodigo, linha.tipoDescricao)
                && (situacao === 'todos' || (situacao === 'ativo') === !!linha.ativo);
        });
    },

    //quando a opção veio da lista, vale o código escolhido; digitação livre vira busca por texto
    valorFiltro(seletor) {
        var $input = $(seletor, this.DOM);
        var codigo = $input.data('codigo');
        return { codigo: codigo || null, texto: this.normalizar($input.val()) };
    },

    combina(filtro, codigo, descricao) {
        if (!filtro || (!filtro.codigo && !filtro.texto)) return true;
        if (filtro.codigo) return String(codigo) === String(filtro.codigo);
        return this.normalizar(codigo + ' ' + descricao).indexOf(filtro.texto) !== -1;
    },

    // ---------- Modal de cadastro (<dialog> nativo, não o FLUIGC.modal) ----------

    prepararModalCadastro() {
        var self = this;
        this.$modal = $('[data-modal-cadastro]', this.DOM);
        this.$form = this.$modal.find('form');

        //fechar com Esc não passa por fecharModalCadastro: o "close" cobre esse caso.
        //Ele é assíncrono: se o modal já foi reaberto (ex.: em modo edição), não apaga o que foi preenchido.
        this.$modal.on('close', function () {
            if (!self.$modal[0].open) self.limparForm();
        });

        //clique no fundo escurecido: o alvo é o próprio <dialog> (o conteúdo fica dentro do <form>)
        this.$modal.on('click', function (event) {
            if (event.target === self.$modal[0]) self.fecharModalCadastro();
        });

        this.$form.on('submit', function (event) {
            event.preventDefault();
            self.salvar();
        });

        //o erro de um campo some assim que a pessoa volta a digitar nele
        this.$form.on('input', '.nwi-campo-input', function () {
            if (this.name) self.marcarErro(this.name, '');
        });
    },

    abrirModalNovo(htmlElement, event) {
        this.abrirModalCadastro(null);
    },

    abrirModalEditar(linha) {
        this.abrirModalCadastro(linha);
    },

    //mesmo modal para criar (linha = null) e editar (linha = linha do Tabulator)
    abrirModalCadastro(linha) {
        var modal = this.$modal[0];
        if (!modal || typeof modal.showModal !== 'function' || modal.open) return;
        //limpa também ao abrir: o evento "close" é assíncrono e o Chrome não o dispara com a aba oculta
        this.limparForm();

        var editando = !!linha;
        this.$modal.find('[data-modal-titulo]').text(editando ? 'Editar item controlado' : 'Novo item controlado');
        this.$modal.find('[data-modal-subtitulo]').text(editando ? 'Altere o tipo de embalagem ou a capacidade e salve.' : 'Preencha os dados para criar a parametrização.');
        this.$modal.find('[data-modal-salvar]').text(editando ? 'Salvar alterações' : 'Criar parametrização');

        //estabelecimento e item são imutáveis na edição
        this.$form.find('[name="estabelecimento"], [name="item"]').prop('readonly', editando);

        if (editando) {
            this.linhaEditando = linha;
            var d = linha.getData();
            this.$form.find('[name="estabelecimento"]').val(d.estCodigo + ' — ' + d.estDescricao).data('codigo', d.estCodigo);
            this.$form.find('[name="item"]').val(d.itemCodigo + ' — ' + d.itemDescricao).data('codigo', d.itemCodigo);
            this.$form.find('[name="unidade"]').val(d.unidade);
            this.$form.find('[name="tipo"]').val(d.tipoCodigo + ' — ' + d.tipoDescricao).data('codigo', d.tipoCodigo);
            this.$form.find('[name="capacidade"]').val(d.capacidade);
        }
        modal.showModal();
    },

    fecharModalCadastro(htmlElement, event) {
        var modal = this.$modal[0];
        if (!modal || !modal.open) return;
        modal.close();
        this.limparForm();
    },

    limparForm() {
        var self = this;
        this.linhaEditando = null;
        this.$form[0].reset();
        this.$form.find('.nwi-campo-input').removeData('codigo');
        this.$form.find('.nwi-sugestoes').prop('hidden', true).empty();
        ['estabelecimento', 'item', 'tipo', 'capacidade'].forEach(function (campo) { self.marcarErro(campo, ''); });
    },

    marcarErro(campo, mensagem) {
        this.$form.find('[name="' + campo + '"]')
            .toggleClass('is-invalido', !!mensagem)
            .attr('aria-invalid', mensagem ? 'true' : 'false');
        this.$form.find('[data-erro="' + campo + '"]').text(mensagem);
    },

    //devolve o registro escolhido no autocomplete (null quando a pessoa digitou algo fora da lista)
    selecionado(campo, fonte) {
        var $input = this.$form.find('[name="' + campo + '"]');
        var codigo = $input.data('codigo');
        if (!codigo) return null;
        return NWI_FONTES[fonte].filter(function (x) { return x.codigo === codigo; })[0] || null;
    },

    salvar() {
        var self = this;
        var estabelecimento = this.selecionado('estabelecimento', 'estabelecimentos');
        var item = this.selecionado('item', 'itens');
        var tipo = this.selecionado('tipo', 'tipos');
        var capacidade = parseFloat(String(this.$form.find('[name="capacidade"]').val()).replace(',', '.'));
        var primeiroInvalido = null;

        if (!estabelecimento) {
            this.marcarErro('estabelecimento', 'Selecione um estabelecimento da lista.');
            primeiroInvalido = primeiroInvalido || 'estabelecimento';
        }
        if (!item) {
            this.marcarErro('item', 'Selecione um item da lista.');
            primeiroInvalido = primeiroInvalido || 'item';
        }
        if (!tipo) {
            this.marcarErro('tipo', 'Selecione um tipo de embalagem da lista.');
            primeiroInvalido = primeiroInvalido || 'tipo';
        }
        if (isNaN(capacidade)) {
            this.marcarErro('capacidade', 'Informe a capacidade.');
            primeiroInvalido = primeiroInvalido || 'capacidade';
        } else if (capacidade <= 0) {
            this.marcarErro('capacidade', 'A capacidade deve ser maior que zero.');
            primeiroInvalido = primeiroInvalido || 'capacidade';
        }
        if (primeiroInvalido) {
            this.$form.find('[name="' + primeiroInvalido + '"]').trigger('focus');
            return;
        }

        var registro = {
            estCodigo: estabelecimento.codigo, estDescricao: estabelecimento.descricao,
            itemCodigo: item.codigo, itemDescricao: item.descricao,
            unidade: item.unidade || '',
            tipoCodigo: tipo.codigo, tipoDescricao: tipo.descricao,
            capacidade: capacidade
        };

        //MOCK: só altera a tabela da tela. Trocar pela gravação no dataset/REST quando existir.
        var linhaEditando = this.linhaEditando;   //guardar antes: fechar limpa o formulário
        this.fecharModalCadastro();
        if (!this.tabela) return;

        var gravar;
        if (linhaEditando) {
            gravar = linhaEditando.update(registro).then(function () {
                linhaEditando.reformat();   //atualiza o aria-label dos botões de ação
                return linhaEditando;
            });
        } else {
            registro.id = ++this.ultimoId;
            registro.ativo = true;
            gravar = this.tabela.addRow(registro);
        }

        gravar.then(function (linha) {
            self.reaplicarOrdem();
            self.destacarLinha(linha);
        });
    },

    reaplicarOrdem() {
        var ordem = this.tabela.getSorters().map(function (s) { return { column: s.field, dir: s.dir }; });
        if (ordem.length) this.tabela.setSort(ordem);
    },

    // ---------- Confirmação de exclusão ----------

    prepararModalExcluir() {
        var self = this;
        this.$modalExcluir = $('[data-modal-excluir]', this.DOM);
        this.$modalExcluir.on('close', function () {
            if (!self.$modalExcluir[0].open) self.linhaExcluindo = null;
        });
        this.$modalExcluir.on('click', function (event) {
            if (event.target === self.$modalExcluir[0]) self.fecharModalExcluir();
        });
    },

    abrirModalExcluir(linha) {
        var modal = this.$modalExcluir[0];
        if (!modal || typeof modal.showModal !== 'function' || modal.open) return;
        var d = linha.getData();
        this.linhaExcluindo = linha;
        this.$modalExcluir.find('[data-excluir-item]')
            .text(d.itemCodigo + ' — ' + d.itemDescricao + ' (' + d.estCodigo + ')');
        modal.showModal();
    },

    fecharModalExcluir(htmlElement, event) {
        var modal = this.$modalExcluir[0];
        if (modal && modal.open) modal.close();
        this.linhaExcluindo = null;
    },

    //MOCK: só remove da tabela da tela. Trocar pela exclusão no dataset/REST quando existir.
    confirmarExclusao(htmlElement, event) {
        var linha = this.linhaExcluindo;
        this.fecharModalExcluir();
        if (linha) linha.delete();
    },

    //leva até a página da linha gravada e pisca em amarelo (se ela não estiver escondida pelo filtro)
    destacarLinha(linha) {
        var visivel = this.tabela.getRows('active').indexOf(linha) !== -1;
        if (!visivel) return;
        linha.pageTo().then(function () {
            var el = linha.getElement();
            el.classList.remove('nwi-linha-nova');
            void el.offsetWidth;
            el.classList.add('nwi-linha-nova');
            setTimeout(function () { el.classList.remove('nwi-linha-nova'); }, 2200);
        });
    },

    //minúsculas e sem acento, para a busca não depender disso
    normalizar(texto) {
        return String(texto || '').trim().toLowerCase()
            .normalize('NFD').replace(/[̀-ͯ]/g, '');
    }
});
