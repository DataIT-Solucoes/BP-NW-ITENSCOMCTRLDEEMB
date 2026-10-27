// Tudo fica dentro de uma função isolada: constantes e funções auxiliares não vazam para a página,
// onde outros widgets (ex.: widget_nw_embalagens) podem usar os mesmos nomes.
var widget_nw_itensComCtrllDeEmb = (function () {

    // Tabulator (tabela) vem do CDN. Carregado uma vez só, mesmo com várias instâncias do widget na página.
    var URL_SCRIPT_TABULATOR = 'https://cdnjs.cloudflare.com/ajax/libs/tabulator/6.4.0/js/tabulator.min.js';
    var promessaCarregamentoTabulator = null;

    var URL_BUSCA_DATASET = '/api/public/ecm/dataset/search';
    var DATASET_EMBALAGENS = 'dsNwEmbalagens';
    var ACAO_CONSULTAR_TIPOS_APOIO = 'consultarTiposApoio';
    var ACAO_APOIAR_ESTABELECIMENTOS = 'apoiarEstabelecimentos';
    var ACAO_APOIAR_ITENS = 'apoiarItens';
    var ACAO_CONSULTAR_PARAMETROS = 'consultarParametros';
    var ACAO_INCLUIR_PARAMETRO = 'incluirParametro';
    var ACAO_ALTERAR_PARAMETRO = 'alterarParametro';

    var TODOS = 'todos';
    var MINIMO_CARACTERES_BUSCA = 2;
    var LIMITE_SUGESTOES = 20;
    var LIMITE_PAGINA_PARAMETROS = 100;
    var ATRASO_CONSULTA_TIPOS_MS = 250;
    var ATRASO_CONSULTA_APOIO_MS = 350;
    // cabeçalho fixo da tabela: distância do topo da janela (abaixo da barra do Fluig; mesmo valor do widget_nw_bags)
    var TOPO_CABECALHO_FIXO = 100;

    var MENSAGENS_ERRO = {
        AUTORIZACAO_NAO_CONFIGURADA: 'O acesso a esta tela ainda não foi configurado no Fluig (grupos e permissões).',
        SEM_PERMISSAO: 'Você não tem permissão para esta ação.',
        ESCRITA_DESABILITADA: 'A gravação de parâmetros ainda não está habilitada no dataset.',
        CONFLITO_VERSAO: 'Este parâmetro foi alterado por outra pessoa. A lista será recarregada; confira o registro antes de tentar novamente.'
    };

    // ---------- Funções auxiliares (não dependem da instância do widget) ----------

    // Chama uma ação do dataset dsNwEmbalagens e devolve o envelope da resposta.
    function chamarEmbalagens(acao, parametros) {
        var requisicao = $.ajax({
            url: URL_BUSCA_DATASET,
            type: 'POST',
            contentType: 'application/json',
            dataType: 'json',
            data: JSON.stringify({
                datasetId: DATASET_EMBALAGENS,
                filterFields: ['acao', acao, 'parametros', JSON.stringify(parametros)],
                resultFields: [], limit: '1', orderBy: ''
            })
        });

        var resultado = requisicao.then(function (transporte) {
            if (acao === ACAO_INCLUIR_PARAMETRO && window.console) console.log('[itensControlados] Retorno do ' + acao + ':', transporte);
            return extrairEnvelope(transporte, acao);
        }, function (jqXHR, textStatus) {
            if (acao === ACAO_INCLUIR_PARAMETRO && window.console) console.log('[itensControlados] Falha no ' + acao + ':', textStatus, jqXHR.status, jqXHR.responseText);
            throw new Error(textStatus === 'abort' ? 'Chamada cancelada.' : 'Falha HTTP ' + jqXHR.status + ' no transporte Fluig.');
        });
        resultado.abort = function () { requisicao.abort(); };
        return resultado;
    }

    function extrairEnvelope(transporte, acao) {
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
    }

    // 4 casas decimais e vírgula, como no Progress.
    function formatarCapacidade(valor) {
        return Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    }

    // O consultarParametros devolve as descrições (descricaoEstabelecimento, descricaoItem, descricaoTipo); sem descrição, a célula mostra apenas o código.
    function criarCelulaCodigoDescricao(codigo, descricao) {
        var $celula = $('<span>').append($('<span>', { 'class': 'nwi-codigo', text: codigo }));
        if (descricao) $celula.append($('<span>', { 'class': 'nwi-descricao', text: ' — ' + descricao }));
        return $celula[0];
    }

    // Converte uma linha de dados do consultarParametros no registro usado pela tabela.
    function converterParametroEmItem(parametro) {
        return {
            id: Number(parametro.idParam),
            estCodigo: parametro.codEstabel, estDescricao: parametro.descricaoEstabelecimento || '',
            itemCodigo: parametro.item, itemDescricao: parametro.descricaoItem || '',
            unidade: parametro.unidade,
            tipoCodigo: parametro.codTipo, tipoDescricao: parametro.descricaoTipo || '',
            capacidade: Number(parametro.capacidade),
            ativo: parametro.ativo === true,
            versao: parametro.versao
        };
    }

    function formatarRotulo(codigo, descricao) {
        return descricao ? codigo + ' — ' + descricao : codigo;
    }

    function gerarChaveIdempotente() {
        var bytes = new Uint8Array(16);
        window.crypto.getRandomValues(bytes);
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        var hexadecimal = $.map(bytes, function (byte) { return (byte + 0x100).toString(16).slice(1); }).join('');
        return hexadecimal.slice(0, 8) + '-' + hexadecimal.slice(8, 12) + '-' + hexadecimal.slice(12, 16) + '-' + hexadecimal.slice(16, 20) + '-' + hexadecimal.slice(20);
    }

    function resultadoComandoIncerto(codigo) {
        return codigo === 'FALHA_CHAMADA' || codigo === 'RESPOSTA_INVALIDA' || codigo === 'HTTP_STATUS_INDISPONIVEL' || /^HTTP_/.test(codigo || '');
    }

    function fotografiaParametroValida(resultado, parametros, acaoDataset) {
        if (acaoDataset === ACAO_INCLUIR_PARAMETRO) {
            if (!/^[1-9][0-9]*$/.test(String(resultado.idParam)) || Number(resultado.idParam) > 2147483647 ||
                resultado.codTipo !== parametros.codTipo || resultado.ativo !== parametros.ativo) return false;
        } else if (Number(resultado.idParam) !== parametros.idParam) return false;
        if (parametros.acao === 'EXCLUIR') return resultado.excluido === true;
        return resultado.excluido === false && typeof resultado.codEstabel === 'string' && resultado.codEstabel === parametros.codEstabel &&
            typeof resultado.item === 'string' && resultado.item === parametros.item && typeof resultado.codTipo === 'string' && !!resultado.codTipo &&
            typeof resultado.unidade === 'string' && !!resultado.unidade && typeof resultado.capacidade === 'number' && isFinite(resultado.capacidade) && resultado.capacidade > 0 &&
            typeof resultado.ativo === 'boolean' && /^[1-9][0-9]*$/.test(String(resultado.versao)) && Number(resultado.versao) <= 2147483647;
    }

    // ---------- Widget ----------

    return SuperWidget.extend({

        // aba atualmente selecionada
        abaAtual: 'itens-controlados',

        // instância do Tabulator
        tabela: null,

        // linha do Tabulator em edição (null = modal em modo "novo") e linha aguardando confirmação de exclusão
        linhaEditando: null,
        linhaExcluindo: null,

        // carga da tabela pelo Buscar (consultarParametros)
        sequenciaCarga: 0,
        consultaCarga: null,
        cargaFalhou: false,
        filtrosAplicados: null,
        gravando: false,
        situacoesPendentes: null,
        intencoesComando: null,

        // autocompletes do Fluig: filtros e modal de cadastro
        autocompleteEstabelecimentoFiltro: null,
        autocompleteItemFiltro: null,
        autocompleteTipoFiltro: null,
        autocompleteEstabelecimentoCadastro: null,
        autocompleteItemCadastro: null,
        autocompleteTipoCadastro: null,

        // método iniciado quando a widget é carregada
        init: function () {
            var self = this;
            this.intencoesComando = {};
            this.situacoesPendentes = {};
            this.prepararAbas();
            this.definirCarregando(true);

            this.carregarTabulator().then(function () {
                self.montarTabela();
            }, function () {
                self.definirCarregando(false);
                $('[data-tabela]', self.DOM).html('<p class="nwi-tabela-erro">Não foi possível carregar a tabela. Verifique a conexão com a internet e recarregue a página.</p>');
            });

            // Select2 vem do CDN, carregado pelo view.ftl; se o CDN falhar, segue com o select nativo
            if ($.fn.select2) this.prepararSelectSituacao();
            this.prepararAutocompletesDosFiltros();
            this.prepararModalCadastro();
            this.prepararModalExcluir();
        },

        // BIND de eventos
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

        // ---------- Abas ----------

        prepararAbas: function () {
            var self = this;
            this.$abas = $('.nwi-tabs', this.DOM);
            this.moverIndicador();
            $(window).on('resize.itensControlados' + this.instanceId, function () { self.moverIndicador(); });
            // a fonte Mulish chega depois e muda a largura da aba: medir de novo
            if (document.fonts && document.fonts.ready) {
                document.fonts.ready.then(function () { self.moverIndicador(); });
                $(document.fonts).on('loadingdone', function () { self.moverIndicador(); });
            }
        },

        selecionarAba: function (elemento) {
            this.ativarAba($(elemento));
        },

        // setas/Home/End movem o foco entre as abas (padrão WAI-ARIA)
        navegarAbas: function (elemento, evento) {
            var $abas = this.$abas.find('.nwi-tab');
            var indiceAtual = $abas.index(elemento);
            var indiceDestino = null;

            if (evento.key === 'ArrowRight') indiceDestino = (indiceAtual + 1) % $abas.length;
            else if (evento.key === 'ArrowLeft') indiceDestino = (indiceAtual - 1 + $abas.length) % $abas.length;
            else if (evento.key === 'Home') indiceDestino = 0;
            else if (evento.key === 'End') indiceDestino = $abas.length - 1;
            if (indiceDestino === null) return;

            evento.preventDefault();
            this.ativarAba($abas.eq(indiceDestino));
            $abas.eq(indiceDestino).trigger('focus');
        },

        ativarAba: function ($aba) {
            this.$abas.find('.nwi-tab')
                .removeClass('is-active').attr({ 'aria-selected': 'false', tabindex: '-1' });
            $aba.addClass('is-active').attr({ 'aria-selected': 'true', tabindex: '0' });
            this.abaAtual = $aba.data('aba');
            this.moverIndicador();
        },

        moverIndicador: function () {
            var $abaAtiva = this.$abas.find('.nwi-tab.is-active');
            if (!$abaAtiva.length) return;
            this.$abas.find('.nwi-tabs-indicador').css({
                width: $abaAtiva.outerWidth() + 'px',
                transform: 'translateX(' + $abaAtiva.position().left + 'px)'
            });
        },

        preencherUnidade: function (unidade) {
            this.obterCampoDoCadastro('unidade').val(unidade);
        },

        // ---------- Select2 (Situação) ----------

        prepararSelectSituacao: function () {
            var $select = $('[data-filtro-situacao]', this.DOM);
            $select.select2({
                language: 'pt-BR',
                width: '100%',
                // só três opções: sem o campo de busca dentro da lista
                minimumResultsForSearch: Infinity,
                // a lista abre dentro do widget, para pegar o estilo de .fluig-style-guide.nwi
                dropdownParent: $(this.DOM)
            });
            // o Select2 desenha a própria seta: some a do select nativo
            $select.closest('.nwi-campo-caixa-select').addClass('is-select2');
        },

        // ---------- Autocomplete do Fluig (consulta as ações de apoio do dataset dsNwEmbalagens) ----------

        prepararAutocompletesDosFiltros: function () {
            var $estabelecimento = $('[data-filtro-est]', this.DOM);
            var $item = $('[data-filtro-item]', this.DOM);

            this.autocompleteEstabelecimentoFiltro = this.prepararAutocompleteApoio($estabelecimento, {
                identificador: 'estabelecimento-filtro',
                acao: ACAO_APOIAR_ESTABELECIMENTOS,
                nomeDoApoio: 'os estabelecimentos',
                atraso: ATRASO_CONSULTA_APOIO_MS,
                comBadge: true,
                montarParametros: function (termo) {
                    return { filtro: termo, limite: LIMITE_SUGESTOES };
                }
            });

            this.autocompleteItemFiltro = this.prepararAutocompleteApoio($item, {
                identificador: 'item-filtro',
                acao: ACAO_APOIAR_ITENS,
                nomeDoApoio: 'os itens',
                atraso: ATRASO_CONSULTA_APOIO_MS,
                comBadge: true,
                montarParametros: function (termo) {
                    var parametros = { filtro: termo, limite: LIMITE_SUGESTOES };
                    var codigoEstabelecimento = $estabelecimento.data('codigo');
                    if (codigoEstabelecimento) parametros.codEstabel = codigoEstabelecimento;
                    return parametros;
                }
            });

            this.autocompleteTipoFiltro = this.prepararAutocompleteApoio($('[data-filtro-tipo]', this.DOM), {
                identificador: 'tipo-filtro',
                acao: ACAO_CONSULTAR_TIPOS_APOIO,
                nomeDoApoio: 'os tipos de embalagem',
                atraso: ATRASO_CONSULTA_TIPOS_MS,
                comBadge: true,
                montarParametros: function (termo) {
                    return { filtro: termo, ativo: TODOS, limite: LIMITE_SUGESTOES };
                }
            });
        },

        prepararAutocompletesDoCadastro: function () {
            var self = this;
            var $estabelecimento = this.obterCampoDoCadastro('estabelecimento');
            var $item = this.obterCampoDoCadastro('item');

            this.autocompleteEstabelecimentoCadastro = this.prepararAutocompleteApoio($estabelecimento, {
                identificador: 'estabelecimento-cadastro',
                acao: ACAO_APOIAR_ESTABELECIMENTOS,
                nomeDoApoio: 'os estabelecimentos',
                atraso: ATRASO_CONSULTA_APOIO_MS,
                montarParametros: function (termo) {
                    return { filtro: termo, limite: LIMITE_SUGESTOES };
                }
            });

            this.autocompleteItemCadastro = this.prepararAutocompleteApoio($item, {
                identificador: 'item-cadastro',
                acao: ACAO_APOIAR_ITENS,
                nomeDoApoio: 'os itens',
                atraso: ATRASO_CONSULTA_APOIO_MS,
                montarParametros: function (termo) {
                    var parametros = { filtro: termo, limite: LIMITE_SUGESTOES };
                    var codigoEstabelecimento = $estabelecimento.data('codigo');
                    if (codigoEstabelecimento) parametros.codEstabel = codigoEstabelecimento;
                    return parametros;
                },
                aoMudarSelecao: function () { self.preencherUnidade(''); },
                aoSelecionar: function (registro) { self.preencherUnidade(registro.unidade || ''); }
            });
        },

        // no cadastro só aparecem tipos ativos
        prepararAutocompleteTipoDoCadastro: function () {
            return this.prepararAutocompleteApoio($('[name="tipo"]', this.DOM), {
                identificador: 'tipo-cadastro',
                acao: ACAO_CONSULTAR_TIPOS_APOIO,
                nomeDoApoio: 'os tipos de embalagem',
                atraso: ATRASO_CONSULTA_TIPOS_MS,
                montarParametros: function (termo) {
                    return { filtro: termo, ativo: true, limite: LIMITE_SUGESTOES };
                }
            });
        },

        // A escolha fica no próprio campo; o registro do item conserva a unidade devolvida em un.
        // configuracao:
        //   identificador     nome único do autocomplete dentro do widget
        //   acao              ação do dataset consultada
        //   nomeDoApoio       usado nas mensagens de erro ("os itens", "os tipos de embalagem")
        //   atraso            espera (ms) depois da última tecla antes de chamar o servidor
        //   montarParametros  recebe o termo digitado e devolve os parâmetros da ação (null = ainda não pode consultar)
        //   aoMudarSelecao    opcional; chamado quando a escolha é trocada ou apagada
        //   aoSelecionar      opcional; recebe o registro escolhido depois de armazená-lo no campo
        //   comBadge          opcional; mostra a escolha como badge dentro do campo, com botão para remover
        prepararAutocompleteApoio: function ($campo, configuracao) {
            var self = this;
            var buscaApoio = { sequencia: 0, temporizador: null, consulta: null, configuracao: configuracao };
            var autocomplete;
            $campo.data('buscaApoio', buscaApoio);

            function avisarMudancaDeSelecao() {
                if (configuracao.aoMudarSelecao) configuracao.aoMudarSelecao();
            }

            $campo.off('.nwiApoio').on('input.nwiApoio', function () {
                if ($campo.prop('readonly')) return;
                $campo.removeData('codigo').removeData('registro');
                self.cancelarConsultaApoio(buscaApoio);
                avisarMudancaDeSelecao();
            });
            $campo.on('fluig.autocomplete.selected.nwiApoio fluig.autocomplete.autocompleted.nwiApoio', function (evento) {
                var apoio = evento.item;
                if ($campo.prop('readonly')) return;
                if (!apoio || typeof apoio.codigo !== 'string' || !apoio.codigo) return;
                avisarMudancaDeSelecao();
                autocomplete.val(apoio.rotulo);
                var registro = { codigo: apoio.codigo, descricao: apoio.descricao };
                if (typeof apoio.unidade === 'string') registro.unidade = apoio.unidade;
                $campo.data('codigo', apoio.codigo).data('registro', registro);
                self.cancelarConsultaApoio(buscaApoio);
                if (configuracao.aoSelecionar) configuracao.aoSelecionar(registro);
                if ($campo.attr('name')) self.marcarErro($campo.attr('name'), '');
                if (configuracao.comBadge) self.mostrarSelecionado($campo, registro, autocomplete);
            });

            autocomplete = FLUIGC.autocomplete($campo, {
                type: 'autocomplete',
                name: 'apoio-' + configuracao.identificador + '-' + this.instanceId,
                minLength: MINIMO_CARACTERES_BUSCA,
                hint: false,
                highlight: true,
                autoLoading: false,
                displayKey: 'rotulo',
                templates: { suggestion: '.nwi-apoio-sugestao-' + this.instanceId },
                source: function (termo, responder) {
                    if ($campo.prop('readonly')) { responder([]); return; }
                    var registro = $campo.data('registro');
                    if (registro && termo === formatarRotulo(registro.codigo, registro.descricao)) {
                        responder([$.extend({}, registro, { rotulo: termo })]);
                        return;
                    }
                    self.consultarApoio(buscaApoio, termo, responder);
                }
            });
            return autocomplete;
        },

        // ---------- Badge da escolha (filtros) ----------

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
            // o val('') do FLUIGC.autocomplete só lê (valor vazio = getter): limpa pelo typeahead, que zera também a consulta dele
            if (autocomplete) $campo.typeahead('val', '');
            else $campo.val('');
            var buscaApoio = $campo.data('buscaApoio');
            if (buscaApoio) {
                this.cancelarConsultaApoio(buscaApoio);
                if (buscaApoio.configuracao.aoMudarSelecao) buscaApoio.configuracao.aoMudarSelecao();
            }
            $campo.trigger('focus');
        },

        // descarta a consulta em andamento (e as respostas que ainda chegarem dela)
        cancelarConsultaApoio: function (buscaApoio) {
            buscaApoio.sequencia++;
            if (buscaApoio.temporizador) clearTimeout(buscaApoio.temporizador);
            buscaApoio.temporizador = null;
            if (buscaApoio.consulta && buscaApoio.consulta.abort) buscaApoio.consulta.abort();
            buscaApoio.consulta = null;
        },

        consultarApoio: function (buscaApoio, termo, responder) {
            var self = this;
            var configuracao = buscaApoio.configuracao;
            termo = String(termo || '').trim();
            this.cancelarConsultaApoio(buscaApoio);
            var sequenciaDestaConsulta = buscaApoio.sequencia;
            if (termo.length < MINIMO_CARACTERES_BUSCA) {
                responder([]);
                return;
            }

            var parametros = configuracao.montarParametros(termo);
            if (parametros === null) {
                responder([]);
                return;
            }

            function respostaAindaValida() {
                return sequenciaDestaConsulta === buscaApoio.sequencia;
            }

            // espera a pessoa parar de digitar antes de chamar o servidor
            buscaApoio.temporizador = setTimeout(function () {
                buscaApoio.temporizador = null;
                var consulta = chamarEmbalagens(configuracao.acao, parametros);
                buscaApoio.consulta = consulta;

                consulta.then(function (resultado) {
                    if (!respostaAindaValida()) return;
                    buscaApoio.consulta = null;
                    if (!resultado.sucesso) {
                        responder([]);
                        self.avisar(MENSAGENS_ERRO[resultado.codigoErro] || resultado.mensagem || 'Não foi possível consultar ' + configuracao.nomeDoApoio + '.', 'danger');
                        return;
                    }
                    responder(self.montarSugestoesApoio(resultado.dados));
                }, function () {
                    if (!respostaAindaValida()) return;
                    buscaApoio.consulta = null;
                    responder([]);
                    self.avisar('Não foi possível consultar ' + configuracao.nomeDoApoio + '. Tente novamente.', 'danger');
                });
            }, configuracao.atraso);
        },

        // aceita só opções com código e descrição em texto; o rótulo é o que aparece na lista e no campo
        montarSugestoesApoio: function (opcoes) {
            var opcoesValidas = $.grep(opcoes || [], function (opcao) {
                return opcao && typeof opcao.codigo === 'string' && opcao.codigo && typeof opcao.descricao === 'string';
            });
            return $.map(opcoesValidas, function (opcao) {
                var sugestao = { codigo: opcao.codigo, descricao: opcao.descricao, rotulo: formatarRotulo(opcao.codigo, opcao.descricao) };
                if (typeof opcao.un === 'string') sugestao.unidade = opcao.un;
                return sugestao;
            });
        },

        avisar: function (mensagem, tipo) {
            if (window.FLUIGC && FLUIGC.toast) FLUIGC.toast({ title: '', message: mensagem, type: tipo });
        },

        // preenche o campo Tipo do modal como se a pessoa tivesse escolhido da lista (edição)
        definirTipoNoCadastro: function (codigo, descricao) {
            var $campo = this.obterCampoDoCadastro('tipo');
            $campo.data('codigo', codigo).data('registro', { codigo: codigo, descricao: descricao });
            this.autocompleteTipoCadastro.val(formatarRotulo(codigo, descricao));
            this.autocompleteTipoCadastro.close();
        },

        // ---------- Tabela ----------

        carregarTabulator: function () {
            if (window.Tabulator) return $.Deferred().resolve().promise();
            if (!promessaCarregamentoTabulator) {
                promessaCarregamentoTabulator = $.ajax({ url: URL_SCRIPT_TABULATOR, dataType: 'script', cache: true })
                    .fail(function () { promessaCarregamentoTabulator = null; });
            }
            return promessaCarregamentoTabulator;
        },

        montarTabela: function () {
            var self = this;
            this.tabela = new Tabulator($('[data-tabela]', this.DOM)[0], {
                data: [],
                layout: 'fitColumns',
                responsiveLayout: false,
                pagination: true,
                paginationSize: 10,
                paginationCounter: function (tamanhoPagina, primeiraLinha, paginaAtual, totalLinhas) {
                    if (!totalLinhas) return '';
                    var ultimaLinha = Math.min(primeiraLinha + tamanhoPagina - 1, totalLinhas);
                    return 'Mostrando ' + primeiraLinha + '–' + ultimaLinha + ' de ' + totalLinhas;
                },
                initialSort: [{ column: 'estCodigo', dir: 'asc' }],
                placeholder: 'Nenhum item controlado encontrado.',
                locale: 'pt-br',
                langs: {
                    'pt-br': {
                        data: { loading: 'Carregando...', error: 'Erro ao carregar' },
                        pagination: {
                            // o Tabulator coloca estes textos como HTML no botão: ícones em vez de « ‹ › »
                            first: '<i class="bi bi-chevron-double-left" aria-hidden="true"></i>', first_title: 'Primeira página',
                            last: '<i class="bi bi-chevron-double-right" aria-hidden="true"></i>', last_title: 'Última página',
                            prev: '<i class="bi bi-chevron-left" aria-hidden="true"></i>', prev_title: 'Página anterior',
                            next: '<i class="bi bi-chevron-right" aria-hidden="true"></i>', next_title: 'Próxima página'
                        }
                    }
                },
                columns: this.definirColunas()
            });
            // sem carga inicial: a tabela começa vazia e a consulta só acontece no Buscar
            this.tabela.on('tableBuilt', function () { self.definirCarregando(false); });
            this.prepararCabecalhoFixo();
        },

        // Cabeçalho fixo (copiado do widget_nw_bags): ao descer a página, uma cópia do .tabulator-header fica presa no topo,
        // alinhada à tabela, até o fim dela. A cópia é refeita quando a tabela redesenha (ordenação, largura das colunas, resize).
        // Clicar numa coluna da cópia ordena a tabela de verdade. Fica dentro do widget (não no body) e só para leitor de tela some
        prepararCabecalhoFixo: function () {
            var tabela = this.tabela,
                $tabela = $(tabela.element),
                desatualizado = true,
                evento = '.nwiCabecalhoFixo' + this.instanceId;
            var $fixo = $('<div>', { 'class': 'nwi-cabecalho-fixo', 'aria-hidden': 'true', hidden: true })
                .css('top', TOPO_CABECALHO_FIXO + 'px')
                .appendTo(this.DOM);

            // a cópia vai dentro de uma div com as classes da tabela, para pegar o mesmo CSS (.nwi-tabela.tabulator .tabulator-header)
            var copiar = function () {
                var $copia = $tabela.children('.tabulator-header').clone();
                $copia.find('[id]').removeAttr('id');
                $copia.find('[tabindex]').addBack('[tabindex]').removeAttr('tabindex');
                $fixo.empty().append($('<div>', {
                    'class': $tabela.attr('class'),
                    'tabulator-layout': $tabela.attr('tabulator-layout')
                }).append($copia));
                desatualizado = false;
            };

            var ajustar = function () {
                var caixa = $tabela[0].getBoundingClientRect(),
                    alturaCabecalho = $tabela.children('.tabulator-header').outerHeight() || 0,
                    alturaRodape = $tabela.children('.tabulator-footer').outerHeight() || 0;
                var mostrar = $tabela.is(':visible') &&
                    caixa.top < TOPO_CABECALHO_FIXO &&
                    caixa.bottom - alturaRodape > TOPO_CABECALHO_FIXO + alturaCabecalho;
                if (!mostrar) {
                    $fixo.prop('hidden', true);
                    return;
                }
                if (desatualizado || $fixo.prop('hidden')) copiar();
                $fixo.css({ left: caixa.left + 'px', width: caixa.width + 'px' }).prop('hidden', false);
                // rolagem horizontal da tabela (tela estreita): a cópia acompanha
                $fixo.find('.tabulator-header').scrollLeft($tabela.children('.tabulator-tableholder').scrollLeft());
            };

            var refazer = function () {
                desatualizado = true;
                ajustar();
            };
            $.each(['renderComplete', 'dataSorted', 'columnResized'], function (i, nome) {
                tabela.on(nome, refazer);
            });
            $(window).off(evento)
                .on('scroll' + evento, ajustar)
                .on('resize' + evento, refazer);
            $tabela.children('.tabulator-tableholder').on('scroll' + evento, ajustar);

            $fixo.on('click', '.tabulator-col[tabulator-field]', function () {
                var coluna = tabela.getColumn($(this).attr('tabulator-field'));
                if (coluna && coluna.getDefinition().headerSort !== false) {
                    coluna.getElement().dispatchEvent(new MouseEvent('click', { bubbles: true }));
                }
            });
        },

        // Larguras mínimas somam 1055 px: cabem sem rolagem horizontal a partir de ~1280 px de janela no Fluig (sem cortar
        // os cabeçalhos: texto + seta + padding). Abaixo disso a tabela rola.
        definirColunas: function () {
            var self = this;
            return [
                {
                    title: 'Estabelecimento', field: 'estCodigo', sorter: 'string', widthGrow: 2, minWidth: 170, vertAlign: 'middle',
                    formatter: function (celula) {
                        var item = celula.getRow().getData();
                        return criarCelulaCodigoDescricao(item.estCodigo, item.estDescricao);
                    }
                },
                {
                    title: 'Item', field: 'itemCodigo', sorter: 'string', widthGrow: 3, minWidth: 130, vertAlign: 'middle',
                    formatter: function (celula) {
                        var item = celula.getRow().getData();
                        return criarCelulaCodigoDescricao(item.itemCodigo, item.itemDescricao);
                    }
                },
                {
                    title: 'Unidade', field: 'unidade', sorter: 'string', width: 120, vertAlign: 'middle',
                    formatter: function (celula) {
                        return $('<span>', { 'class': 'nwi-sigla', text: celula.getValue() })[0];
                    }
                },
                {
                    title: 'Tipo de Embalagem', field: 'tipoCodigo', sorter: 'string', widthGrow: 2, minWidth: 190, vertAlign: 'middle',
                    formatter: function (celula) {
                        var item = celula.getRow().getData();
                        return criarCelulaCodigoDescricao(item.tipoCodigo, item.tipoDescricao);
                    }
                },
                {
                    title: 'Capacidade', field: 'capacidade', sorter: 'number', width: 140, hozAlign: 'right', vertAlign: 'middle',
                    formatter: function (celula) {
                        return $('<span>', { 'class': 'nwi-capacidade', text: formatarCapacidade(celula.getValue()) })[0];
                    }
                },
                {
                    title: 'Situação', field: 'ativo', sorter: 'boolean', width: 120, hozAlign: 'left', vertAlign: 'middle',
                    formatter: function (celula) {
                        var ativo = celula.getValue();
                        return $('<span>', {
                            'class': 'nwi-situacao ' + (ativo ? 'is-ativo' : 'is-inativo'),
                            text: ativo ? 'Ativo' : 'Inativo'
                        })[0];
                    }
                },
                {
                    // sem ordenação de verdade: a seta do cabeçalho é só visual (CSS .nwi-col-acoes)
                    title: 'Ações', headerSort: false, cssClass: 'nwi-col-acoes', width: 185, hozAlign: 'right', vertAlign: 'middle',
                    formatter: function (celula) { return self.montarBotoesAcoes(celula.getRow().getData()); },
                    cellClick: function (evento, celula) { self.tratarCliqueNasAcoes(evento, celula.getRow()); }
                }
            ];
        },

        tratarCliqueNasAcoes: function (evento, linha) {
            if (this.gravando) return;
            var $botao = $(evento.target).closest('[data-acao]');
            if (!$botao.length || $botao.prop('disabled')) return;

            var acao = $botao.attr('data-acao');
            if (acao === 'editar') this.abrirModalEditar(linha);
            else if (acao === 'situacao') this.alterarSituacao(linha, $botao);
            else if (acao === 'excluir') this.abrirModalExcluir(linha);
        },

        alterarSituacao: function (linha, $interruptor) {
            var self = this;
            var item = linha.getData();
            if (!this.situacoesPendentes) this.situacoesPendentes = {};
            if (this.situacoesPendentes[item.id]) return;
            var parametros = this.montarComandoParametro(item, item.ativo ? 'INATIVAR' : 'ALTERAR', { ativo: !item.ativo });
            if (!parametros) return;
            this.situacoesPendentes[item.id] = true;
            $interruptor.prop('disabled', true).attr('aria-busy', 'true');

            function finalizar() {
                delete self.situacoesPendentes[item.id];
                $interruptor.prop('disabled', false).attr('aria-busy', 'false');
                var linhaAtual = self.tabela ? self.tabela.getRow(item.id) : linha;
                if (linhaAtual) linhaAtual.reformat();
            }

            return this.executarComandoParametro(parametros).then(function (saida) {
                if (!saida.ok) { self.informarFalhaComando(saida); return; }
                return self.aplicarFotografiaParametro(linha, saida.resultado, null, false).then(function () {
                    self.avisar(saida.resultado.repeticao ? 'Comando já confirmado anteriormente.' : (saida.resultado.ativo ? 'Parâmetro ativado.' : 'Parâmetro desativado.'), 'success');
                });
            }).then(finalizar, function () {
                finalizar();
                self.avisar('Não foi possível atualizar a situação na tela. Clique em Buscar para conferir o registro.', 'warning');
            });
        },

        montarBotoesAcoes: function (item) {
            var descricaoDoItem = item.itemCodigo + ' em ' + item.estCodigo;
            var $grupo = $('<div>', { 'class': 'nwi-acoes', role: 'group', 'aria-label': 'Ações para ' + descricaoDoItem });

            $('<button>', {
                type: 'button',
                'class': 'nwi-interruptor',
                'data-acao': 'situacao',
                role: 'switch',
                'aria-checked': item.ativo ? 'true' : 'false',
                disabled: !!(this.situacoesPendentes && this.situacoesPendentes[item.id]),
                'aria-busy': this.situacoesPendentes && this.situacoesPendentes[item.id] ? 'true' : 'false',
                'aria-label': 'Ativo: ' + descricaoDoItem,
                title: item.ativo ? 'Desativar' : 'Ativar'
            }).append($('<span>', { 'class': 'nwi-interruptor-bolinha', 'aria-hidden': 'true' })).appendTo($grupo);

            $('<span>', { 'class': 'nwi-acoes-divisor', 'aria-hidden': 'true' }).appendTo($grupo);

            $.each([
                { acao: 'editar', icone: 'bi-pencil', texto: 'Editar' },
                { acao: 'excluir', icone: 'bi-trash3', texto: 'Excluir' }
            ], function (indice, botao) {
                $('<button>', {
                    type: 'button',
                    'class': 'nwi-acao nwi-acao-' + botao.acao,
                    'data-acao': botao.acao,
                    'aria-label': botao.texto + ' ' + descricaoDoItem,
                    title: botao.texto
                }).append($('<i>', { 'class': 'bi ' + botao.icone, 'aria-hidden': 'true' })).appendTo($grupo);
            });
            return $grupo[0];
        },

        // ---------- Carga da tabela (consultarParametros) ----------

        // enquanto carrega, Buscar e Novo ficam desabilitados
        definirCarregando: function (carregando) {
            $('[data-buscar], [data-novo]', this.DOM).prop('disabled', carregando);
        },

        // busca todas as páginas (cursor proximoId) e só então mostra a tabela
        // filtros (opcional): { parametros: filtros do consultarParametros }
        carregarParametros: function (filtros) {
            if (this.gravando) return;
            this.filtrosAplicados = filtros || null;
            var self = this;
            var sequenciaDestaCarga = ++this.sequenciaCarga;
            var itensCarregados = [];
            var cursoresConsultados = {};

            this.cancelarCarga();
            this.cargaFalhou = false;
            this.definirCarregando(true);
            this.tabela.alert('<div class="nwi-carregando" role="status" aria-label="Carregando itens controlados"><span class="nwi-loader" aria-hidden="true"></span></div>');

            function cargaAindaValida() {
                return sequenciaDestaCarga === self.sequenciaCarga;
            }

            function consultarPagina(cursor) {
                var parametros = $.extend({ limite: LIMITE_PAGINA_PARAMETROS }, filtros && filtros.parametros);
                if (cursor) parametros.aposId = cursor;

                self.consultaCarga = chamarEmbalagens(ACAO_CONSULTAR_PARAMETROS, parametros);

                

                return self.consultaCarga.then(function (resultado) {
                    if (!cargaAindaValida()) return;
                    self.consultaCarga = null;
                    if (!resultado.sucesso) {
                        throw new Error(MENSAGENS_ERRO[resultado.codigoErro] || resultado.mensagem || 'Não foi possível consultar os itens controlados.');
                    }
                    itensCarregados = itensCarregados.concat($.map(resultado.dados || [], converterParametroEmItem));

                    if (!resultado.temMais) return self.exibirItensCarregados(itensCarregados, cargaAindaValida);
                    if (!resultado.proximoId || cursoresConsultados[resultado.proximoId]) {
                        throw new Error('A consulta devolveu um cursor inválido.');
                    }
                    cursoresConsultados[resultado.proximoId] = true;
                    return consultarPagina(resultado.proximoId);
                });
            }

            return consultarPagina('').then(null, function (erro) {
                if (!cargaAindaValida()) return;
                self.mostrarErroDaCarga(erro && erro.message || 'Não foi possível consultar os itens controlados.');
            });
        },


        //===========================================================================

        cancelarCarga: function () {
            if (this.consultaCarga && this.consultaCarga.abort) this.consultaCarga.abort();
            this.consultaCarga = null;
        },

        exibirItensCarregados: function (itens, cargaAindaValida) {
            var self = this;
            return this.tabela.setData(itens).then(function () {
                if (!cargaAindaValida()) return;
                self.tabela.clearAlert();
                self.definirCarregando(false);
            });
        },

        mostrarErroDaCarga: function (mensagem) {
            if (window.console) console.error('[itensControlados] ' + mensagem);
            this.cargaFalhou = true;
            this.definirCarregando(false);
            this.tabela.clearData();
            this.tabela.alert($('<span>').text(mensagem + ' Clique em Buscar para tentar de novo.')[0], 'error');
        },

        // ---------- Filtros ----------

        // Buscar consulta o servidor com os filtros escolhidos (estabelecimento, item, tipo e situação vão no consultarParametros)
        buscar: function () {
            if (!this.tabela) return;
            var filtros = this.montarFiltrosDaBusca();
            if (filtros) this.carregarParametros(filtros);
        },

        // null = há campo digitado sem escolha na lista (a busca só aceita o código escolhido)
        montarFiltrosDaBusca: function () {
            var parametros = {};
            var rotulos = { '[data-filtro-est]': 'o estabelecimento', '[data-filtro-item]': 'o item', '[data-filtro-tipo]': 'o tipo de embalagem' };
            var codigos = {};
            var valido = true;
            var self = this;

            $.each(rotulos, function (seletor, rotulo) {
                // o autocomplete cria um clone .tt-hint com os mesmos atributos: vale só o campo real
                var $campo = $(seletor, self.DOM).not('.tt-hint').first();
                var codigo = $campo.data('codigo');
                if (!codigo && $.trim($campo.val())) {
                    self.avisar('Escolha ' + rotulo + ' na lista para buscar.', 'info');
                    valido = false;
                }
                codigos[seletor] = codigo ? String(codigo) : '';
            });
            if (!valido) return null;

            if (codigos['[data-filtro-est]']) {
                parametros.estabelDe = codigos['[data-filtro-est]'];
                parametros.estabelAte = codigos['[data-filtro-est]'];
            }
            if (codigos['[data-filtro-item]']) {
                parametros.itemDe = codigos['[data-filtro-item]'];
                parametros.itemAte = codigos['[data-filtro-item]'];
            }
            // valor do select: 'todos', 'true' (Ativo) ou 'false' (Inativo)
            var situacao = $('[data-filtro-situacao]', this.DOM).val();
            if (situacao !== TODOS) parametros.ativo = situacao === 'true';

            if (codigos['[data-filtro-tipo]']) parametros.codTipo = codigos['[data-filtro-tipo]'];

            return { parametros: parametros };
        },

        // ---------- Modal de cadastro (<dialog> nativo, não o FLUIGC.modal) ----------

        prepararModalCadastro: function () {
            var self = this;
            this.$modalCadastro = $('[data-modal-cadastro]', this.DOM);
            this.$formulario = this.$modalCadastro.find('form');
            this.$modalCadastro.on('cancel', function (evento) {
                if (self.gravando) evento.preventDefault();
            });

            // fechar com Esc não passa por fecharModalCadastro: o "close" cobre esse caso.
            // Ele é assíncrono: se o modal já foi reaberto (ex.: em modo edição), não apaga o que foi preenchido.
            this.$modalCadastro.on('close', function () {
                if (!self.$modalCadastro[0].open) self.limparFormulario();
            });

            // clique no fundo escurecido: o alvo é o próprio <dialog> (o conteúdo fica dentro do <form>)
            this.$modalCadastro.on('click', function (evento) {
                if (evento.target === self.$modalCadastro[0]) self.fecharModalCadastro();
            });

            this.$formulario.on('submit', function (evento) {
                evento.preventDefault();
                self.salvar();
            });

            // o erro de um campo some assim que a pessoa volta a digitar nele
            this.$formulario.on('input', '.nwi-campo-input', function () {
                if (this.name) self.marcarErro(this.name, '');
            });
        },

        obterCampoDoCadastro: function (nome) {
            return this.$formulario.find('[name="' + nome + '"]').not('.tt-hint');
        },

        abrirModalNovo: function () {
            this.abrirModalCadastro(null);
        },

        abrirModalEditar: function (linha) {
            this.abrirModalCadastro(linha);
        },

        // mesmo modal para criar (linha = null) e editar (linha = linha do Tabulator)
        abrirModalCadastro: function (linha) {
            if (this.gravando) return;
            var modal = this.$modalCadastro[0];
            if (!modal || typeof modal.showModal !== 'function' || modal.open) return;
            // limpa também ao abrir: o evento "close" é assíncrono e o Chrome não o dispara com a aba oculta
            this.limparFormulario();

            var editando = !!linha;
            this.$modalCadastro.find('[data-modal-titulo]').text(editando ? 'Editar item controlado' : 'Novo item controlado');
            this.$modalCadastro.find('[data-modal-subtitulo]').text(editando ? 'Altere o tipo de embalagem ou a capacidade e salve.' : 'Preencha os dados para criar a parametrização.');
            this.$modalCadastro.find('[data-modal-salvar]').text(editando ? 'Salvar alterações' : 'Criar parametrização');

            // estabelecimento e item são imutáveis na edição
            this.obterCampoDoCadastro('estabelecimento').prop('readonly', editando);
            this.obterCampoDoCadastro('item').prop('readonly', editando);

            // Campos imutáveis ficam sem componente de busca; Novo recebe instâncias limpas.
            if (!editando) this.prepararAutocompletesDoCadastro();
            this.autocompleteTipoCadastro = this.prepararAutocompleteTipoDoCadastro();
            if (editando) this.preencherFormularioComLinha(linha);
            modal.showModal();
        },

        preencherFormularioComLinha: function (linha) {
            var item = linha.getData();
            this.linhaEditando = linha;
            this.obterCampoDoCadastro('estabelecimento')
                .val(formatarRotulo(item.estCodigo, item.estDescricao))
                .data('codigo', item.estCodigo).data('registro', { codigo: item.estCodigo, descricao: item.estDescricao });
            this.obterCampoDoCadastro('item')
                .val(formatarRotulo(item.itemCodigo, item.itemDescricao))
                .data('codigo', item.itemCodigo).data('registro', { codigo: item.itemCodigo, descricao: item.itemDescricao, unidade: item.unidade });
            this.obterCampoDoCadastro('unidade').val(item.unidade);
            this.definirTipoNoCadastro(item.tipoCodigo, item.tipoDescricao);
            this.obterCampoDoCadastro('capacidade').val(item.capacidade);
        },

        fecharModalCadastro: function () {
            if (this.gravando) return;
            var modal = this.$modalCadastro[0];
            if (!modal || !modal.open) return;
            modal.close();
            this.limparFormulario();
        },

        limparFormulario: function () {
            var self = this;
            this.linhaEditando = null;
            this.$modalCadastro.find('[data-cadastro-mensagem]').text('');
            $.each({ estabelecimento: 'autocompleteEstabelecimentoCadastro', item: 'autocompleteItemCadastro', tipo: 'autocompleteTipoCadastro' }, function (campo, propriedade) {
                var $campo = self.obterCampoDoCadastro(campo);
                var buscaApoio = $campo.data('buscaApoio');
                if (buscaApoio) self.cancelarConsultaApoio(buscaApoio);
                var autocomplete = self[propriedade];
                if (autocomplete) {
                    autocomplete.close();
                    autocomplete.destroy();
                }
                self[propriedade] = null;
                $campo.off('.nwiApoio').removeData('buscaApoio').removeData('codigo').removeData('registro');
            });
            this.$formulario[0].reset();
            $.each(['estabelecimento', 'item', 'tipo', 'capacidade'], function (indice, campo) {
                self.marcarErro(campo, '');
            });
        },

        marcarErro: function (campo, mensagem) {
            this.obterCampoDoCadastro(campo)
                .toggleClass('is-invalido', !!mensagem)
                .attr('aria-invalid', mensagem ? 'true' : 'false');
            this.$formulario.find('[data-erro="' + campo + '"]').text(mensagem);
        },

        // devolve o registro escolhido no autocomplete (null quando a pessoa digitou algo fora da lista)
        obterOpcaoEscolhida: function (nomeCampo) {
            var $campo = this.obterCampoDoCadastro(nomeCampo);
            var registro = $campo.data('registro');
            return registro && registro.codigo === $campo.data('codigo') ? registro : null;
        },

        // ---------- Salvar ----------

        salvar: function () {
            if (this.gravando) return;
            var escolhas = this.lerEscolhasDoFormulario();
            var primeiroCampoInvalido = this.validarEscolhas(escolhas);
            if (primeiroCampoInvalido) {
                this.obterCampoDoCadastro(primeiroCampoInvalido).trigger('focus');
                return;
            }
            this.gravarRegistro(this.montarRegistro(escolhas));
        },

        lerEscolhasDoFormulario: function () {
            return {
                estabelecimento: this.obterOpcaoEscolhida('estabelecimento'),
                item: this.obterOpcaoEscolhida('item'),
                tipo: this.obterCampoDoCadastro('tipo').data('registro') || null,
                capacidade: parseFloat(String(this.obterCampoDoCadastro('capacidade').val()).replace(',', '.'))
            };
        },

        // marca o erro de cada campo inválido e devolve o nome do primeiro (null = tudo certo)
        validarEscolhas: function (escolhas) {
            var primeiroInvalido = null;
            var self = this;

            function recusar(campo, mensagem) {
                self.marcarErro(campo, mensagem);
                primeiroInvalido = primeiroInvalido || campo;
            }

            if (!escolhas.estabelecimento) recusar('estabelecimento', 'Selecione um estabelecimento da lista.');
            if (!escolhas.item) recusar('item', 'Selecione um item da lista.');
            if (!escolhas.tipo) recusar('tipo', 'Selecione um tipo de embalagem da lista.');
            if (!isFinite(escolhas.capacidade)) recusar('capacidade', 'Informe uma capacidade válida.');
            else if (escolhas.capacidade <= 0) recusar('capacidade', 'A capacidade deve ser maior que zero.');
            else if (Math.abs(escolhas.capacidade * 10000 - Math.round(escolhas.capacidade * 10000)) > 0.00001) recusar('capacidade', 'A capacidade deve ter até quatro casas decimais.');
            return primeiroInvalido;
        },

        montarRegistro: function (escolhas) {
            return {
                estCodigo: escolhas.estabelecimento.codigo, estDescricao: escolhas.estabelecimento.descricao,
                itemCodigo: escolhas.item.codigo, itemDescricao: escolhas.item.descricao,
                unidade: escolhas.item.unidade || '',
                tipoCodigo: escolhas.tipo.codigo, tipoDescricao: escolhas.tipo.descricao,
                capacidade: escolhas.capacidade
            };
        },

        montarComandoParametro: function (item, acao, alteracoes) {
            var parametros = $.extend({
                idParam: Number(item.id), codEstabel: item.estCodigo, item: item.itemCodigo,
                codTipo: item.tipoCodigo, capacidade: Number(item.capacidade), unidade: item.unidade,
                ativo: item.ativo, versao: Number(item.versao), acao: acao
            }, alteracoes);
            if (!/^[1-9][0-9]*$/.test(String(parametros.idParam)) || parametros.idParam > 2147483647 ||
                !/^[1-9][0-9]*$/.test(String(parametros.versao)) || parametros.versao > 2147483647) {
                this.avisar('Registro sem identificação ou versão válida. Clique em Buscar para carregar o parâmetro salvo no servidor.', 'danger');
                return null;
            }
            return parametros;
        },

        definirGravando: function (gravando) {
            this.gravando = gravando;
            $('[data-confirmar-excluir], [data-fechar-excluir], [data-fechar-modal]', this.DOM).prop('disabled', gravando);
            this.$formulario.find('.nwi-campo-input:not(.tt-hint), [type="submit"]').prop('disabled', gravando);
            this.$modalCadastro.attr('aria-busy', gravando ? 'true' : 'false');
            this.$modalExcluir.attr('aria-busy', gravando ? 'true' : 'false');
            this.$modalExcluir.find('[data-excluir-botao-texto]').text(gravando ? 'Excluindo...' : 'Excluir');
            if (this.linhaEditando) this.$modalCadastro.find('[data-modal-salvar]').text(gravando ? 'Salvando...' : 'Salvar alterações');
            else this.$modalCadastro.find('[data-modal-salvar]').text(gravando ? 'Criando...' : 'Criar parametrização');
        },

        executarComandoParametro: function (parametros, acaoDataset) {
            var self = this;
            acaoDataset = acaoDataset || ACAO_ALTERAR_PARAMETRO;
            var assinatura = acaoDataset + ':' + JSON.stringify(parametros);
            if (!this.intencoesComando) this.intencoesComando = {};
            try {
                if (!this.intencoesComando[assinatura]) this.intencoesComando[assinatura] = gerarChaveIdempotente();
            } catch (erro) {
                return $.Deferred().resolve({ ok: false, mensagem: 'Não foi possível gerar a identificação do comando. Recarregue a página e tente novamente.' }).promise();
            }
            var parametrosComChave = $.extend({}, parametros, { chaveIdempotente: this.intencoesComando[assinatura] });

            return chamarEmbalagens(acaoDataset, parametrosComChave).then(function (resultado) {
                if (!resultado.sucesso) return {
                    ok: false, codigoErro: resultado.codigoErro, incerto: resultadoComandoIncerto(resultado.codigoErro),
                    mensagem: MENSAGENS_ERRO[resultado.codigoErro] || resultado.mensagem || 'O Datasul recusou a gravação.'
                };
                if (!fotografiaParametroValida(resultado, parametros, acaoDataset)) return { ok: false, incerto: true };
                delete self.intencoesComando[assinatura];
                return { ok: true, resultado: resultado };
            }, function () {
                return { ok: false, incerto: true };
            }).then(function (saida) {
                if (saida.incerto) saida.mensagem = 'Não foi possível confirmar a gravação. Clique em Buscar para conferir o registro antes de tentar novamente. Uma nova tentativa com os mesmos dados usará a mesma identificação do comando.';
                return saida;
            });
        },

        informarFalhaComando: function (saida, $modal) {
            if ($modal) $modal.find('[data-cadastro-mensagem], [data-excluir-mensagem]').text(saida.mensagem);
            this.avisar(saida.mensagem, saida.incerto ? 'warning' : 'danger');
            if (saida.codigoErro === 'CONFLITO_VERSAO') {
                if ($modal === this.$modalCadastro) this.fecharModalCadastro();
                if ($modal === this.$modalExcluir) this.fecharModalExcluir();
                this.carregarParametros(this.filtrosAplicados);
            }
        },

        aplicarFotografiaParametro: function (linha, resultado, registro, mostrarLinha) {
            var self = this;
            // Buscar pode substituir as linhas enquanto o toggle aguarda a gravação.
            if (this.tabela) linha = this.tabela.getRow(Number(resultado.idParam));
            if (!linha || Number(linha.getData().versao) > Number(resultado.versao)) return $.Deferred().resolve().promise();
            var anterior = registro || linha.getData();
            var atualizado = converterParametroEmItem(resultado);
            atualizado.estDescricao = atualizado.estDescricao || anterior.estDescricao;
            atualizado.itemDescricao = atualizado.itemDescricao || anterior.itemDescricao;
            atualizado.tipoDescricao = atualizado.tipoDescricao || (atualizado.tipoCodigo === anterior.tipoCodigo ? anterior.tipoDescricao : '');
            return linha.update(atualizado).then(function () {
                linha.reformat();
                self.reaplicarOrdem();
                if (mostrarLinha !== false) self.mostrarPaginaDaLinha(linha);
            }).then(null, function () {
                self.avisar('Gravação confirmada. A lista será recarregada para mostrar o registro atualizado.', 'warning');
                self.carregarParametros(self.filtrosAplicados);
            });
        },

        gravarAlteracao: function (registro) {
            var self = this;
            var linha = this.linhaEditando;
            var parametros = this.montarComandoParametro(linha.getData(), 'ALTERAR', { codTipo: registro.tipoCodigo, capacidade: registro.capacidade });
            if (!parametros) return;
            this.$modalCadastro.find('[data-cadastro-mensagem]').text('');
            this.definirGravando(true);
            this.executarComandoParametro(parametros).then(function (saida) {
                self.definirGravando(false);
                if (!saida.ok) { self.informarFalhaComando(saida, self.$modalCadastro); return; }
                self.fecharModalCadastro();
                self.aplicarFotografiaParametro(linha, saida.resultado, registro);
                self.avisar(saida.resultado.repeticao ? 'Alteração já confirmada anteriormente.' : 'Parâmetro alterado.', 'success');
            });
        },

        gravarRegistro: function (registro) {
            if (this.gravando) return;
            if (this.linhaEditando) { this.gravarAlteracao(registro); return; }
            if (!this.tabela) { this.avisar('Aguarde o carregamento da tabela antes de criar o parâmetro.', 'warning'); return; }
            var self = this;
            var parametros = {
                idParam: 0, codEstabel: registro.estCodigo, item: registro.itemCodigo,
                codTipo: registro.tipoCodigo, capacidade: Number(registro.capacidade), unidade: registro.unidade,
                ativo: true, versao: 0
            };
            this.$modalCadastro.find('[data-cadastro-mensagem]').text('');
            this.definirGravando(true);
            this.executarComandoParametro(parametros, ACAO_INCLUIR_PARAMETRO).then(function (saida) {
                self.definirGravando(false);
                if (!saida.ok) { self.informarFalhaComando(saida, self.$modalCadastro); return; }
                self.fecharModalCadastro();
                var existente = self.tabela.getRow(Number(saida.resultado.idParam));
                if (existente) self.aplicarFotografiaParametro(existente, saida.resultado, registro);
                else {
                    var criado = converterParametroEmItem(saida.resultado);
                    criado.estDescricao = criado.estDescricao || registro.estDescricao;
                    criado.itemDescricao = criado.itemDescricao || registro.itemDescricao;
                    criado.tipoDescricao = criado.tipoDescricao || registro.tipoDescricao;
                    self.tabela.addRow(criado).then(function (linha) {
                        self.reaplicarOrdem();
                        self.mostrarPaginaDaLinha(linha);
                    }).then(null, function () {
                        self.avisar('Gravação confirmada. A lista será recarregada para mostrar o registro criado.', 'warning');
                        self.carregarParametros(self.filtrosAplicados);
                    });
                }
                self.avisar(saida.resultado.repeticao ? 'Inclusão já confirmada anteriormente.' : 'Parâmetro criado.', 'success');
            });
        },

        reaplicarOrdem: function () {
            var ordem = $.map(this.tabela.getSorters(), function (ordenacao) {
                return { column: ordenacao.field, dir: ordenacao.dir };
            });
            if (ordem.length) this.tabela.setSort(ordem);
        },

        // leva até a página da linha gravada, se ela não estiver escondida pelo filtro
        mostrarPaginaDaLinha: function (linha) {
            var visivel = $.inArray(linha, this.tabela.getRows('active')) !== -1;
            if (!visivel) return;
            linha.pageTo();
        },

        // ---------- Confirmação de exclusão ----------

        prepararModalExcluir: function () {
            var self = this;
            this.$modalExcluir = $('[data-modal-excluir]', this.DOM);
            this.$modalExcluir.on('cancel', function (evento) {
                if (self.gravando) evento.preventDefault();
            });
            this.$modalExcluir.on('close', function () {
                if (!self.$modalExcluir[0].open) self.linhaExcluindo = null;
            });
            this.$modalExcluir.on('click', function (evento) {
                if (evento.target === self.$modalExcluir[0]) self.fecharModalExcluir();
            });
        },

        abrirModalExcluir: function (linha) {
            if (this.gravando) return;
            var modal = this.$modalExcluir[0];
            if (!modal || typeof modal.showModal !== 'function' || modal.open) return;
            var item = linha.getData();
            this.linhaExcluindo = linha;
            this.$modalExcluir.find('[data-excluir-item]').text(formatarRotulo(item.itemCodigo, item.itemDescricao));
            this.$modalExcluir.find('[data-excluir-estabelecimento]').text(formatarRotulo(item.estCodigo, item.estDescricao));
            this.$modalExcluir.find('[data-excluir-unidade]').text(item.unidade || '—');
            this.$modalExcluir.find('[data-excluir-tipo]').text(formatarRotulo(item.tipoCodigo, item.tipoDescricao));
            this.$modalExcluir.find('[data-excluir-capacidade]').text(formatarCapacidade(item.capacidade));
            this.$modalExcluir.find('[data-excluir-situacao]').text(item.ativo ? 'Ativo' : 'Inativo');
            this.$modalExcluir.find('[data-excluir-mensagem]').text('');
            modal.showModal();
        },

        fecharModalExcluir: function () {
            if (this.gravando) return;
            var modal = this.$modalExcluir[0];
            if (modal && modal.open) modal.close();
            this.linhaExcluindo = null;
        },

        confirmarExclusao: function () {
            if (this.gravando) return;
            var self = this;
            var linha = this.linhaExcluindo;
            if (!linha) return;
            var parametros = this.montarComandoParametro(linha.getData(), 'EXCLUIR');
            if (!parametros) return;
            this.$modalExcluir.find('[data-excluir-mensagem]').text('');
            this.definirGravando(true);
            this.executarComandoParametro(parametros).then(function (saida) {
                self.definirGravando(false);
                if (!saida.ok) { self.informarFalhaComando(saida, self.$modalExcluir); return; }
                self.fecharModalExcluir();
                linha.delete().then(null, function () { self.carregarParametros(self.filtrosAplicados); });
                self.avisar(saida.resultado.repeticao ? 'Exclusão já confirmada anteriormente.' : 'Parâmetro excluído.', 'success');
            });
        }
    });
})();
