// Tabulator (tabela) vem do CDN. Carregado uma vez só, mesmo com várias instâncias do widget na página.
var NWI_TABULATOR_JS = 'https://cdnjs.cloudflare.com/ajax/libs/tabulator/6.4.0/js/tabulator.min.js';
var nwiTabulatorPromise = null;

// DADOS MOCKADOS, só para visualizar a tela. Trocar pelos datasets/REST quando forem definidos.
// Listas de apoio (estabelecimento e item) usadas pelos autocompletes. O tipo de embalagem vem do dataset (FLUIGC.autocomplete).
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
    ]
};

var NWI_LIMITE_SUGESTOES_TIPOS = 20;

var NWI_MENSAGENS_ERRO = {
    AUTORIZACAO_NAO_CONFIGURADA: 'O acesso a esta tela ainda não foi configurado no Fluig (grupos e permissões).',
    SEM_PERMISSAO: 'Você não tem permissão para esta ação.'
};

//chama uma ação do dataset dsNwEmbalagens (rota /api/public/ecm/dataset/search) e devolve o envelope da resposta
function nwiChamarEmbalagens(acao, parametros) {
    var xhr = $.ajax({
        url: '/api/public/ecm/dataset/search',
        type: 'POST',
        contentType: 'application/json',
        dataType: 'json',
        data: JSON.stringify({
            datasetId: 'dsNwEmbalagens',
            filterFields: ['acao', acao, 'parametros', JSON.stringify(parametros)],
            resultFields: [], limit: '1', orderBy: ''
        })
    });
    var resultado = xhr.then(function (transporte) {
        if (!transporte || !Array.isArray(transporte.content) || transporte.content.length !== 1) {
            throw new Error('Dataset fora do contrato de uma linha de envelope.');
        }
        var linha = transporte.content[0];
        if (linha.acao && linha.acao !== acao) throw new Error('Ação da resposta divergente.');
        var envelope;
        try { envelope = JSON.parse(linha.resultadoJson); }
        catch (erro) { throw new Error('Envelope JSON do Dataset inválido.'); }
        if (!envelope || typeof envelope.sucesso !== 'boolean') throw new Error('Resultado funcional do Dataset inválido.');
        return envelope;
    }, function (jqXHR, textStatus) {
        throw new Error(textStatus === 'abort' ? 'Chamada cancelada.' : 'Falha HTTP ' + jqXHR.status + ' no transporte Fluig.');
    });
    resultado.abort = function () { xhr.abort(); };
    return resultado;
}

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

    //autocompletes do Fluig do Tipo de Embalagem (filtro e modal)
    acTipoFiltro: null,
    acTipoForm: null,

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
        this.acTipoFiltro = this.prepararAutocompleteTipo($('[data-filtro-tipo]', this.DOM), 'filtro', 'todos');
        this.acTipoForm = this.prepararAutocompleteTipo($('[name="tipo"]', this.DOM), 'form', true);
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

    // ---------- Autocomplete do Fluig: Tipo de Embalagem (dataset dsNwEmbalagens, ação consultarTiposApoio) ----------

    //a escolha fica no próprio input: data('codigo') e data('registro') = { codigo, descricao }; digitar depois dela apaga os dois
    //ativo: 'todos' (filtro) ou true (cadastro: só tipos ativos), como aceita a ação do dataset
    prepararAutocompleteTipo($input, sufixo, ativo) {
        var self = this;
        var estado = { seq: 0, timer: null, consulta: null, ativo: ativo };
        var ac;

        $input.on('input', function () {
            $input.removeData('codigo').removeData('registro');
            self.cancelarSugestoesTipos(estado);
        });
        $input.on('fluig.autocomplete.selected fluig.autocomplete.autocompleted', function (event) {
            var item = event.item;
            if (!item || typeof item.codigo !== 'string' || !item.codigo) return;
            ac.val(item.rotulo);
            $input.data('codigo', item.codigo).data('registro', { codigo: item.codigo, descricao: item.descricao });
            self.cancelarSugestoesTipos(estado);
            if ($input.attr('name')) self.marcarErro($input.attr('name'), '');
        });

        ac = FLUIGC.autocomplete($input, {
            type: 'autocomplete',
            name: 'nwi-tipos-' + sufixo + '-' + this.instanceId,
            minLength: 2,
            hint: false,
            highlight: true,
            autoLoading: false,
            displayKey: 'rotulo',
            templates: { suggestion: '.nwi-tipo-sugestao-' + this.instanceId },
            source: function (termo, responder) { self.consultarSugestoesTipos(estado, termo, responder); }
        });
        return ac;
    },

    cancelarSugestoesTipos(estado) {
        estado.seq++;
        if (estado.timer) clearTimeout(estado.timer);
        estado.timer = null;
        if (estado.consulta && estado.consulta.abort) estado.consulta.abort();
        estado.consulta = null;
    },

    consultarSugestoesTipos(estado, termo, responder) {
        var self = this;
        termo = String(termo || '').trim();
        this.cancelarSugestoesTipos(estado);
        var seq = estado.seq;
        if (termo.length < 2) {
            responder([]);
            return;
        }
        //espera a pessoa parar de digitar antes de chamar o servidor
        estado.timer = setTimeout(function () {
            estado.timer = null;
            var consulta = nwiChamarEmbalagens('consultarTiposApoio', { filtro: termo, ativo: estado.ativo, limite: NWI_LIMITE_SUGESTOES_TIPOS });
            estado.consulta = consulta;
            consulta.then(function (resultado) {
                if (seq !== estado.seq) return;
                estado.consulta = null;
                if (!resultado.sucesso) {
                    responder([]);
                    self.avisar(NWI_MENSAGENS_ERRO[resultado.codigoErro] || resultado.mensagem || 'Não foi possível consultar os tipos de embalagem.', 'danger');
                    return;
                }
                var itens = $.grep(resultado.dados || [], function (item) {
                    return item && typeof item.codigo === 'string' && item.codigo && typeof item.descricao === 'string';
                });
                responder($.map(itens, function (item) {
                    return { codigo: item.codigo, descricao: item.descricao, rotulo: item.codigo + ' — ' + item.descricao };
                }));
            }, function () {
                if (seq !== estado.seq) return;
                estado.consulta = null;
                responder([]);
                self.avisar('Não foi possível consultar os tipos de embalagem. Tente novamente.', 'danger');
            });
        }, 250);
    },

    avisar(mensagem, tipo) {
        if (window.FLUIGC && FLUIGC.toast) FLUIGC.toast({ title: '', message: mensagem, type: tipo });
    },

    //preenche o campo Tipo do modal como se a pessoa tivesse escolhido da lista (edição)
    definirTipoForm(codigo, descricao) {
        var $input = this.$form.find('[name="tipo"]');
        this.acTipoForm.val(codigo + ' — ' + descricao);
        $input.data('codigo', codigo).data('registro', { codigo: codigo, descricao: descricao });
    },

    // ---------- Tabela ----------

    carregarTabulator() {
        if (window.Tabulator) return Promise.resolve();
        if (!nwiTabulatorPromise) {
            nwiTabulatorPromise = new Promise(function (resolve, reject) {
                $.ajax({ url: NWI_TABULATOR_JS, dataType: 'script', cache: true }).done(function () {
                    resolve();
                }).fail(function () {
                    nwiTabulatorPromise = null;
                    reject();
                });
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
                        return $('<span>', { 'class': 'nwi-sigla', text: cell.getValue() })[0];
                    }
                },
                {
                    title: 'Tipo de Embalagem', field: 'tipoCodigo', sorter: 'string', widthGrow: 2, minWidth: 170, vertAlign: 'middle',
                    formatter: function (cell) { return self.celulaCodigoDescricao(cell.getRow().getData().tipoCodigo, cell.getRow().getData().tipoDescricao); }
                },
                {
                    title: 'Capacidade', field: 'capacidade', sorter: 'number', width: 140, hozAlign: 'right', vertAlign: 'middle',
                    formatter: function (cell) {
                        return $('<span>', { 'class': 'nwi-capacidade', text: self.formatarCapacidade(cell.getValue()) })[0];
                    }
                },
                {
                    title: 'Situação', field: 'ativo', sorter: 'boolean', width: 130, hozAlign: 'left', vertAlign: 'middle',
                    formatter: function (cell) {
                        var ativo = cell.getValue();
                        return $('<span>', {
                            'class': 'nwi-situacao ' + (ativo ? 'is-ativo' : 'is-inativo'),
                            text: ativo ? 'Ativo' : 'Inativo'
                        })[0];
                    }
                },
                {
                    //sem ordenação de verdade: a seta do cabeçalho é só visual (CSS .nwi-col-acoes)
                    title: 'Ações', headerSort: false, cssClass: 'nwi-col-acoes', width: 200, hozAlign: 'right', vertAlign: 'middle',
                    formatter: function (cell) { return self.montarBotoesAcoes(cell.getRow().getData()); },
                    cellClick: function (event, cell) {
                        var $botao = $(event.target).closest('[data-acao]');
                        if (!$botao.length || $botao.prop('disabled')) return;
                        var acao = $botao.attr('data-acao');
                        if (acao === 'editar') self.abrirModalEditar(cell.getRow());
                        else if (acao === 'situacao') self.alterarSituacao(cell.getRow(), $botao);
                        else if (acao === 'excluir') self.abrirModalExcluir(cell.getRow());
                    }
                }
            ]
        });
    },

    celulaCodigoDescricao(codigo, descricao) {
        return $('<span>')
            .append($('<span>', { 'class': 'nwi-codigo', text: codigo }))
            .append($('<span>', { 'class': 'nwi-descricao', text: ' — ' + descricao }))[0];
    },

    //4 casas decimais e vírgula, como no Progress
    formatarCapacidade(valor) {
        return Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    },

    //MOCK: a troca de situação só altera a linha da tela. Trocar pelo PATCH quando o serviço existir.
    alterarSituacao(linha, $interruptor) {
        var ativo = !linha.getData().ativo;
        //o update redesenha a célula: esperar a bolinha chegar ao outro lado antes disso
        $interruptor.prop('disabled', true).attr({
            'aria-checked': ativo ? 'true' : 'false',
            title: ativo ? 'Desativar' : 'Ativar'
        });
        setTimeout(function () { linha.update({ ativo: ativo }); }, 220);
    },

    montarBotoesAcoes(dados) {
        var rotulo = dados.itemCodigo + ' em ' + dados.estCodigo;
        var $grupo = $('<div>', { 'class': 'nwi-acoes', role: 'group', 'aria-label': 'Ações para ' + rotulo });
        $('<button>', {
            type: 'button',
            'class': 'nwi-interruptor',
            'data-acao': 'situacao',
            role: 'switch',
            'aria-checked': dados.ativo ? 'true' : 'false',
            'aria-label': 'Ativo: ' + rotulo,
            title: dados.ativo ? 'Desativar' : 'Ativar'
        }).append($('<span>', { 'class': 'nwi-interruptor-bolinha', 'aria-hidden': 'true' })).appendTo($grupo);
        $('<span>', { 'class': 'nwi-acoes-divisor', 'aria-hidden': 'true' }).appendTo($grupo);
        $.each([
            { acao: 'editar', icone: 'bi-pencil', texto: 'Editar' },
            { acao: 'excluir', icone: 'bi-trash3', texto: 'Excluir' }
        ], function (i, b) {
            $('<button>', {
                type: 'button',
                'class': 'nwi-acao nwi-acao-' + b.acao,
                'data-acao': b.acao,
                'aria-label': b.texto + ' ' + rotulo,
                title: b.texto
            }).append($('<i>', { 'class': 'bi ' + b.icone, 'aria-hidden': 'true' })).appendTo($grupo);
        });
        return $grupo[0];
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
            this.definirTipoForm(d.tipoCodigo, d.tipoDescricao);
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
        this.$form.find('.nwi-campo-input').removeData('codigo').removeData('registro');
        if (this.acTipoForm) this.acTipoForm.val('');
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
        var tipo = this.$form.find('[name="tipo"]').data('registro') || null;
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
            var $el = $(linha.getElement());
            $el.removeClass('nwi-linha-nova');
            void $el[0].offsetWidth; //reinicia a animação se a linha já estava piscando
            $el.addClass('nwi-linha-nova');
            setTimeout(function () { $el.removeClass('nwi-linha-nova'); }, 2200);
        });
    },

    //minúsculas e sem acento, para a busca não depender disso
    normalizar(texto) {
        return String(texto || '').trim().toLowerCase()
            .normalize('NFD').replace(/[̀-ͯ]/g, '');
    }
});
