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

    var TODOS = 'todos';
    var MINIMO_CARACTERES_BUSCA = 2;
    var LIMITE_SUGESTOES = 20;
    var LIMITE_PAGINA_PARAMETROS = 100;
    var ATRASO_CONSULTA_TIPOS_MS = 250;
    var ATRASO_CONSULTA_APOIO_MS = 350;
    var ATRASO_FECHAR_SUGESTOES_MS = 150;
    var ESPERA_ANIMACAO_INTERRUPTOR_MS = 220;
    var DURACAO_DESTAQUE_LINHA_MS = 2200;

    var MENSAGENS_ERRO = {
        AUTORIZACAO_NAO_CONFIGURADA: 'O acesso a esta tela ainda não foi configurado no Fluig (grupos e permissões).',
        SEM_PERMISSAO: 'Você não tem permissão para esta ação.'
    };

    // DADOS MOCKADOS, só para visualizar a tela. Trocar pelos datasets/REST quando forem definidos.
    // Listas de apoio (estabelecimento e item) usadas pelos autocompletes. O tipo de embalagem vem do dataset (FLUIGC.autocomplete).
    var OPCOES_APOIO_MOCK = {
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
            return extrairEnvelope(transporte, acao);
        }, function (jqXHR, textStatus) {
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

    // Minúsculas e sem acento, para a busca não depender disso.
    function normalizarTexto(texto) {
        return String(texto || '').trim().toLowerCase()
            .normalize('NFD').replace(/[̀-ͯ]/g, '');
    }

    // 4 casas decimais e vírgula, como no Progress.
    function formatarCapacidade(valor) {
        return Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    }

    // O consultarParametros devolve só os códigos; sem descrição, a célula mostra apenas o código.
    function criarCelulaCodigoDescricao(codigo, descricao) {
        var $celula = $('<span>').append($('<span>', { 'class': 'nwi-codigo', text: codigo }));
        if (descricao) $celula.append($('<span>', { 'class': 'nwi-descricao', text: ' — ' + descricao }));
        return $celula[0];
    }

    // Converte uma linha de dados do consultarParametros no registro usado pela tabela.
    function converterParametroEmItem(parametro) {
        return {
            id: Number(parametro.idParam),
            estCodigo: parametro.codEstabel, estDescricao: '',
            itemCodigo: parametro.item, itemDescricao: '',
            unidade: parametro.unidade,
            tipoCodigo: parametro.codTipo, tipoDescricao: '',
            capacidade: Number(parametro.capacidade),
            ativo: parametro.ativo === true,
            versao: parametro.versao
        };
    }

    function obterMaiorId(itens) {
        var maiorId = 0;
        $.each(itens, function (indice, item) {
            maiorId = Math.max(maiorId, item.id);
        });
        return maiorId;
    }

    function formatarRotulo(codigo, descricao) {
        return codigo + ' — ' + descricao;
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

        // maior id já carregado (os novos itens ganham o próximo número enquanto não há gravação de verdade)
        ultimoId: 0,

        // carga inicial da tabela (consultarParametros)
        sequenciaCarga: 0,
        consultaCarga: null,
        cargaFalhou: false,

        // autocompletes do Fluig: filtros (Estabelecimento, Item, Tipo) e Tipo do modal de cadastro
        autocompleteEstabelecimentoFiltro: null,
        autocompleteItemFiltro: null,
        autocompleteTipoFiltro: null,
        autocompleteTipoCadastro: null,

        // método iniciado quando a widget é carregada
        init: function () {
            var self = this;
            this.prepararAbas();
            this.definirCarregando(true);

            this.carregarTabulator().then(function () {
                self.montarTabela();
            }, function () {
                self.definirCarregando(false);
                $('[data-tabela]', self.DOM).html('<p class="nwi-tabela-erro">Não foi possível carregar a tabela. Verifique a conexão com a internet e recarregue a página.</p>');
            });

            this.prepararAutocompletes();
            // Select2 vem do CDN, carregado pelo view.ftl; se o CDN falhar, segue com o select nativo
            if ($.fn.select2) this.prepararSelectSituacao();
            this.prepararAutocompletesDosFiltros();
            this.autocompleteTipoCadastro = this.prepararAutocompleteTipoDoCadastro();
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

        // ---------- Autocomplete próprio (estabelecimento e item) ----------

        // um só conjunto de handlers, delegado a partir da div do widget: vale para os filtros e para o modal
        prepararAutocompletes: function () {
            var self = this;
            var $raiz = $(this.DOM);

            $raiz.on('input.itensControlados', '[data-auto] .nwi-campo-input', function () {
                var $campo = $(this);
                $campo.removeData('codigo');
                if ($campo.attr('name') === 'item') self.preencherUnidade('');
                self.abrirSugestoes($campo);
            });

            $raiz.on('focus.itensControlados', '[data-auto] .nwi-campo-input', function () {
                self.abrirSugestoes($(this));
            });

            $raiz.on('keydown.itensControlados', '[data-auto] .nwi-campo-input', function (evento) {
                self.tratarTeclaNasSugestoes($(this), evento);
            });

            // clique na sugestão: mousedown, porque o blur do campo fecha a lista antes do click
            $raiz.on('mousedown.itensControlados', '[data-auto] .nwi-sugestao', function (evento) {
                evento.preventDefault();
                var $campo = $(this).closest('[data-auto]').find('.nwi-campo-input');
                self.escolherSugestao($campo, $(this).data('indice'));
            });

            $raiz.on('blur.itensControlados', '[data-auto] .nwi-campo-input', function () {
                var $campo = $(this);
                setTimeout(function () { self.fecharSugestoes($campo); }, ATRASO_FECHAR_SUGESTOES_MS);
            });
        },

        // lista filtrada pelo que foi digitado (a partir de 2 caracteres, como no protótipo); null = ainda não buscar
        filtrarOpcoes: function ($campo) {
            var nomeFonte = $campo.closest('[data-auto]').data('auto');
            var opcoes = OPCOES_APOIO_MOCK[nomeFonte] || [];
            var termo = normalizarTexto($campo.val());
            if (termo.length < MINIMO_CARACTERES_BUSCA) return null;

            var encontradas = $.grep(opcoes, function (opcao) {
                return normalizarTexto(opcao.codigo + ' ' + opcao.descricao).indexOf(termo) !== -1;
            });
            return encontradas.slice(0, LIMITE_SUGESTOES);
        },

        abrirSugestoes: function ($campo) {
            if ($campo.prop('readonly')) return;
            var $lista = $campo.closest('[data-auto]').find('.nwi-sugestoes');
            var opcoes = this.filtrarOpcoes($campo);

            if (opcoes === null) {
                this.fecharSugestoes($campo);
                return;
            }

            $lista.empty();
            if (!opcoes.length) {
                $lista.append($('<li>').addClass('nwi-sugestao-vazia').text('Nenhuma opção encontrada.'));
            } else {
                $.each(opcoes, function (indice, opcao) {
                    $('<li>')
                        .addClass('nwi-sugestao')
                        .attr({ role: 'option', 'aria-selected': 'false' })
                        .data('indice', indice)
                        .append($('<span>').addClass('nwi-sugestao-codigo').text(opcao.codigo))
                        .append($('<span>').addClass('nwi-sugestao-descricao').text(opcao.descricao))
                        .appendTo($lista);
                });
            }
            $lista.prop('hidden', false);
            $campo.attr('aria-expanded', 'true');
        },

        fecharSugestoes: function ($campo) {
            $campo.closest('[data-auto]').find('.nwi-sugestoes').prop('hidden', true).empty();
            $campo.attr('aria-expanded', 'false');
        },

        // setas navegam, Enter escolhe, Esc fecha
        tratarTeclaNasSugestoes: function ($campo, evento) {
            var $opcoes = $campo.closest('[data-auto]').find('.nwi-sugestoes .nwi-sugestao');

            if (evento.key === 'Escape') {
                this.fecharSugestoes($campo);
                return;
            }
            if (!$opcoes.length) return;

            var indiceAtivo = $opcoes.index($opcoes.filter('.is-ativa'));

            if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
                evento.preventDefault();
                this.destacarSugestao($opcoes, indiceAtivo, evento.key === 'ArrowDown');
            } else if (evento.key === 'Enter' && indiceAtivo !== -1) {
                evento.preventDefault();
                this.escolherSugestao($campo, $opcoes.eq(indiceAtivo).data('indice'));
            }
        },

        // move o destaque para a próxima (ou anterior) sugestão, dando a volta no começo e no fim da lista
        destacarSugestao: function ($opcoes, indiceAtivo, paraBaixo) {
            var indiceDestino;
            if (paraBaixo) indiceDestino = (indiceAtivo + 1) % $opcoes.length;
            else indiceDestino = indiceAtivo <= 0 ? $opcoes.length - 1 : indiceAtivo - 1;

            $opcoes.removeClass('is-ativa').attr('aria-selected', 'false');
            var $destino = $opcoes.eq(indiceDestino).addClass('is-ativa').attr('aria-selected', 'true');
            $destino[0].scrollIntoView({ block: 'nearest' });
        },

        escolherSugestao: function ($campo, indice) {
            var opcoes = this.filtrarOpcoes($campo);
            if (!opcoes || !opcoes[indice]) return;
            var escolhida = opcoes[indice];
            var nomeCampo = $campo.attr('name');

            $campo.val(formatarRotulo(escolhida.codigo, escolhida.descricao));
            $campo.data('codigo', escolhida.codigo);
            this.fecharSugestoes($campo);

            // o item define a unidade do cadastro
            if (nomeCampo === 'item') this.preencherUnidade(escolhida.unidade || '');
            if (nomeCampo) this.marcarErro(nomeCampo, '');
        },

        preencherUnidade: function (unidade) {
            $('[name="unidade"]', this.DOM).val(unidade);
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
            var self = this;
            var $estabelecimento = $('[data-filtro-est]', this.DOM);
            var $item = $('[data-filtro-item]', this.DOM);
            var avisouFaltaEstabelecimento = false;

            this.autocompleteEstabelecimentoFiltro = this.prepararAutocompleteApoio($estabelecimento, {
                identificador: 'estabelecimento-filtro',
                acao: ACAO_APOIAR_ESTABELECIMENTOS,
                nomeDoApoio: 'os estabelecimentos',
                atraso: ATRASO_CONSULTA_APOIO_MS,
                montarParametros: function (termo) {
                    return { filtro: termo, limite: LIMITE_SUGESTOES };
                },
                // trocar o estabelecimento invalida o item escolhido (o item é consultado dentro dele)
                aoMudarSelecao: function () {
                    avisouFaltaEstabelecimento = false;
                    $item.removeData('codigo').removeData('registro');
                    if (self.autocompleteItemFiltro) self.autocompleteItemFiltro.val('');
                }
            });

            this.autocompleteItemFiltro = this.prepararAutocompleteApoio($item, {
                identificador: 'item-filtro',
                acao: ACAO_APOIAR_ITENS,
                nomeDoApoio: 'os itens',
                atraso: ATRASO_CONSULTA_APOIO_MS,
                // o item só pode ser consultado depois de escolher o estabelecimento
                montarParametros: function (termo) {
                    var codigoEstabelecimento = $estabelecimento.data('codigo');
                    if (!codigoEstabelecimento) {
                        if (!avisouFaltaEstabelecimento) {
                            self.avisar('Escolha o estabelecimento na lista antes de buscar o item.', 'info');
                            avisouFaltaEstabelecimento = true;
                        }
                        return null;
                    }
                    return { codEstabel: codigoEstabelecimento, filtro: termo, limite: LIMITE_SUGESTOES };
                }
            });

            this.autocompleteTipoFiltro = this.prepararAutocompleteApoio($('[data-filtro-tipo]', this.DOM), {
                identificador: 'tipo-filtro',
                acao: ACAO_CONSULTAR_TIPOS_APOIO,
                nomeDoApoio: 'os tipos de embalagem',
                atraso: ATRASO_CONSULTA_TIPOS_MS,
                montarParametros: function (termo) {
                    return { filtro: termo, ativo: TODOS, limite: LIMITE_SUGESTOES };
                }
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

        // A escolha fica no próprio campo: data('codigo') e data('registro') = { codigo, descricao }; digitar depois dela apaga os dois.
        // configuracao:
        //   identificador     nome único do autocomplete dentro do widget
        //   acao              ação do dataset consultada
        //   nomeDoApoio       usado nas mensagens de erro ("os itens", "os tipos de embalagem")
        //   atraso            espera (ms) depois da última tecla antes de chamar o servidor
        //   montarParametros  recebe o termo digitado e devolve os parâmetros da ação (null = ainda não pode consultar)
        //   aoMudarSelecao    opcional; chamado quando a escolha é trocada ou apagada
        prepararAutocompleteApoio: function ($campo, configuracao) {
            var self = this;
            var buscaApoio = { sequencia: 0, temporizador: null, consulta: null, configuracao: configuracao };
            var autocomplete;

            function avisarMudancaDeSelecao() {
                if (configuracao.aoMudarSelecao) configuracao.aoMudarSelecao();
            }

            $campo.on('input', function () {
                $campo.removeData('codigo').removeData('registro');
                self.cancelarConsultaApoio(buscaApoio);
                avisarMudancaDeSelecao();
            });
            $campo.on('fluig.autocomplete.selected fluig.autocomplete.autocompleted', function (evento) {
                var apoio = evento.item;
                if (!apoio || typeof apoio.codigo !== 'string' || !apoio.codigo) return;
                avisarMudancaDeSelecao();
                autocomplete.val(apoio.rotulo);
                $campo.data('codigo', apoio.codigo).data('registro', { codigo: apoio.codigo, descricao: apoio.descricao });
                self.cancelarConsultaApoio(buscaApoio);
                if ($campo.attr('name')) self.marcarErro($campo.attr('name'), '');
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
                source: function (termo, responder) { self.consultarApoio(buscaApoio, termo, responder); }
            });
            return autocomplete;
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
                return { codigo: opcao.codigo, descricao: opcao.descricao, rotulo: formatarRotulo(opcao.codigo, opcao.descricao) };
            });
        },

        avisar: function (mensagem, tipo) {
            if (window.FLUIGC && FLUIGC.toast) FLUIGC.toast({ title: '', message: mensagem, type: tipo });
        },

        // preenche o campo Tipo do modal como se a pessoa tivesse escolhido da lista (edição)
        definirTipoNoCadastro: function (codigo, descricao) {
            var $campo = this.obterCampoDoCadastro('tipo');
            this.autocompleteTipoCadastro.val(formatarRotulo(codigo, descricao));
            $campo.data('codigo', codigo).data('registro', { codigo: codigo, descricao: descricao });
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
            // a tabela só aceita dados depois de construída
            this.tabela.on('tableBuilt', function () { self.carregarParametros(); });
        },

        definirColunas: function () {
            var self = this;
            return [
                {
                    title: 'Estabelecimento', field: 'estCodigo', sorter: 'string', widthGrow: 2, minWidth: 180, vertAlign: 'middle',
                    formatter: function (celula) {
                        var item = celula.getRow().getData();
                        return criarCelulaCodigoDescricao(item.estCodigo, item.estDescricao);
                    }
                },
                {
                    title: 'Item', field: 'itemCodigo', sorter: 'string', widthGrow: 3, minWidth: 220, vertAlign: 'middle',
                    formatter: function (celula) {
                        var item = celula.getRow().getData();
                        return criarCelulaCodigoDescricao(item.itemCodigo, item.itemDescricao);
                    }
                },
                {
                    title: 'Unidade', field: 'unidade', sorter: 'string', width: 135, vertAlign: 'middle',
                    formatter: function (celula) {
                        return $('<span>', { 'class': 'nwi-sigla', text: celula.getValue() })[0];
                    }
                },
                {
                    title: 'Tipo de Embalagem', field: 'tipoCodigo', sorter: 'string', widthGrow: 2, minWidth: 170, vertAlign: 'middle',
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
                    title: 'Situação', field: 'ativo', sorter: 'boolean', width: 130, hozAlign: 'left', vertAlign: 'middle',
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
                    title: 'Ações', headerSort: false, cssClass: 'nwi-col-acoes', width: 200, hozAlign: 'right', vertAlign: 'middle',
                    formatter: function (celula) { return self.montarBotoesAcoes(celula.getRow().getData()); },
                    cellClick: function (evento, celula) { self.tratarCliqueNasAcoes(evento, celula.getRow()); }
                }
            ];
        },

        tratarCliqueNasAcoes: function (evento, linha) {
            var $botao = $(evento.target).closest('[data-acao]');
            if (!$botao.length || $botao.prop('disabled')) return;

            var acao = $botao.attr('data-acao');
            if (acao === 'editar') this.abrirModalEditar(linha);
            else if (acao === 'situacao') this.alterarSituacao(linha, $botao);
            else if (acao === 'excluir') this.abrirModalExcluir(linha);
        },

        // MOCK: a troca de situação só altera a linha da tela. Trocar pelo PATCH quando o serviço existir.
        alterarSituacao: function (linha, $interruptor) {
            var ativo = !linha.getData().ativo;
            // o update redesenha a célula: esperar a bolinha chegar ao outro lado antes disso
            $interruptor.prop('disabled', true).attr({
                'aria-checked': ativo ? 'true' : 'false',
                title: ativo ? 'Desativar' : 'Ativar'
            });
            setTimeout(function () { linha.update({ ativo: ativo }); }, ESPERA_ANIMACAO_INTERRUPTOR_MS);
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
        carregarParametros: function () {
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
                var parametros = { limite: LIMITE_PAGINA_PARAMETROS };
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

        cancelarCarga: function () {
            if (this.consultaCarga && this.consultaCarga.abort) this.consultaCarga.abort();
            this.consultaCarga = null;
        },

        exibirItensCarregados: function (itens, cargaAindaValida) {
            var self = this;
            return this.tabela.setData(itens).then(function () {
                if (!cargaAindaValida()) return;
                self.ultimoId = obterMaiorId(itens);
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

        buscar: function () {
            if (!this.tabela) return;
            // depois de uma falha na carga, Buscar tenta carregar de novo
            if (this.cargaFalhou) {
                this.carregarParametros();
                return;
            }
            var self = this;
            var estabelecimento = this.lerFiltroComAutocomplete('[data-filtro-est]');
            var item = this.lerFiltroComAutocomplete('[data-filtro-item]');
            var tipo = this.lerFiltroComAutocomplete('[data-filtro-tipo]');
            var situacao = $('[data-filtro-situacao]', this.DOM).val();

            if (!estabelecimento && !item && !tipo && situacao === TODOS) {
                this.tabela.clearFilter();
                return;
            }

            this.tabela.setFilter(function (linha) {
                return self.corresponde(estabelecimento, linha.estCodigo, linha.estDescricao)
                    && self.corresponde(item, linha.itemCodigo, linha.itemDescricao)
                    && self.corresponde(tipo, linha.tipoCodigo, linha.tipoDescricao)
                    && (situacao === TODOS || (situacao === 'ativo') === !!linha.ativo);
            });
        },

        // quando a opção veio da lista, vale o código escolhido; digitação livre vira busca por texto
        lerFiltroComAutocomplete: function (seletor) {
            var $campo = $(seletor, this.DOM);
            return { codigo: $campo.data('codigo') || null, texto: normalizarTexto($campo.val()) };
        },

        corresponde: function (filtro, codigo, descricao) {
            if (!filtro || (!filtro.codigo && !filtro.texto)) return true;
            if (filtro.codigo) return String(codigo) === String(filtro.codigo);
            return normalizarTexto(codigo + ' ' + descricao).indexOf(filtro.texto) !== -1;
        },

        // ---------- Modal de cadastro (<dialog> nativo, não o FLUIGC.modal) ----------

        prepararModalCadastro: function () {
            var self = this;
            this.$modalCadastro = $('[data-modal-cadastro]', this.DOM);
            this.$formulario = this.$modalCadastro.find('form');

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
            return this.$formulario.find('[name="' + nome + '"]');
        },

        abrirModalNovo: function () {
            this.abrirModalCadastro(null);
        },

        abrirModalEditar: function (linha) {
            this.abrirModalCadastro(linha);
        },

        // mesmo modal para criar (linha = null) e editar (linha = linha do Tabulator)
        abrirModalCadastro: function (linha) {
            var modal = this.$modalCadastro[0];
            if (!modal || typeof modal.showModal !== 'function' || modal.open) return;
            // limpa também ao abrir: o evento "close" é assíncrono e o Chrome não o dispara com a aba oculta
            this.limparFormulario();

            var editando = !!linha;
            this.$modalCadastro.find('[data-modal-titulo]').text(editando ? 'Editar item controlado' : 'Novo item controlado');
            this.$modalCadastro.find('[data-modal-subtitulo]').text(editando ? 'Altere o tipo de embalagem ou a capacidade e salve.' : 'Preencha os dados para criar a parametrização.');
            this.$modalCadastro.find('[data-modal-salvar]').text(editando ? 'Salvar alterações' : 'Criar parametrização');

            // estabelecimento e item são imutáveis na edição
            this.$formulario.find('[name="estabelecimento"], [name="item"]').prop('readonly', editando);

            if (editando) this.preencherFormularioComLinha(linha);
            modal.showModal();
        },

        preencherFormularioComLinha: function (linha) {
            var item = linha.getData();
            this.linhaEditando = linha;
            this.obterCampoDoCadastro('estabelecimento')
                .val(formatarRotulo(item.estCodigo, item.estDescricao)).data('codigo', item.estCodigo);
            this.obterCampoDoCadastro('item')
                .val(formatarRotulo(item.itemCodigo, item.itemDescricao)).data('codigo', item.itemCodigo);
            this.obterCampoDoCadastro('unidade').val(item.unidade);
            this.definirTipoNoCadastro(item.tipoCodigo, item.tipoDescricao);
            this.obterCampoDoCadastro('capacidade').val(item.capacidade);
        },

        fecharModalCadastro: function () {
            var modal = this.$modalCadastro[0];
            if (!modal || !modal.open) return;
            modal.close();
            this.limparFormulario();
        },

        limparFormulario: function () {
            var self = this;
            this.linhaEditando = null;
            this.$formulario[0].reset();
            this.$formulario.find('.nwi-campo-input').removeData('codigo').removeData('registro');
            if (this.autocompleteTipoCadastro) this.autocompleteTipoCadastro.val('');
            this.$formulario.find('.nwi-sugestoes').prop('hidden', true).empty();
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
        obterOpcaoEscolhida: function (nomeCampo, nomeFonte) {
            var codigo = this.obterCampoDoCadastro(nomeCampo).data('codigo');
            if (!codigo) return null;
            var encontradas = $.grep(OPCOES_APOIO_MOCK[nomeFonte], function (opcao) { return opcao.codigo === codigo; });
            return encontradas[0] || null;
        },

        // ---------- Salvar ----------

        salvar: function () {
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
                estabelecimento: this.obterOpcaoEscolhida('estabelecimento', 'estabelecimentos'),
                item: this.obterOpcaoEscolhida('item', 'itens'),
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
            if (isNaN(escolhas.capacidade)) recusar('capacidade', 'Informe a capacidade.');
            else if (escolhas.capacidade <= 0) recusar('capacidade', 'A capacidade deve ser maior que zero.');
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

        // MOCK: só altera a tabela da tela. Trocar pela gravação no dataset/REST quando existir.
        gravarRegistro: function (registro) {
            var self = this;
            var linhaEditando = this.linhaEditando;   // guardar antes: fechar limpa o formulário
            this.fecharModalCadastro();
            if (!this.tabela) return;

            var gravacao;
            if (linhaEditando) {
                gravacao = linhaEditando.update(registro).then(function () {
                    linhaEditando.reformat();   // atualiza o aria-label dos botões de ação
                    return linhaEditando;
                });
            } else {
                registro.id = ++this.ultimoId;
                registro.ativo = true;
                gravacao = this.tabela.addRow(registro);
            }

            gravacao.then(function (linha) {
                self.reaplicarOrdem();
                self.destacarLinha(linha);
            });
        },

        reaplicarOrdem: function () {
            var ordem = $.map(this.tabela.getSorters(), function (ordenacao) {
                return { column: ordenacao.field, dir: ordenacao.dir };
            });
            if (ordem.length) this.tabela.setSort(ordem);
        },

        // leva até a página da linha gravada e pisca em amarelo (se ela não estiver escondida pelo filtro)
        destacarLinha: function (linha) {
            var visivel = $.inArray(linha, this.tabela.getRows('active')) !== -1;
            if (!visivel) return;
            linha.pageTo().then(function () {
                var $linha = $(linha.getElement());
                $linha.removeClass('nwi-linha-nova');
                void $linha[0].offsetWidth; // reinicia a animação se a linha já estava piscando
                $linha.addClass('nwi-linha-nova');
                setTimeout(function () { $linha.removeClass('nwi-linha-nova'); }, DURACAO_DESTAQUE_LINHA_MS);
            });
        },

        // ---------- Confirmação de exclusão ----------

        prepararModalExcluir: function () {
            var self = this;
            this.$modalExcluir = $('[data-modal-excluir]', this.DOM);
            this.$modalExcluir.on('close', function () {
                if (!self.$modalExcluir[0].open) self.linhaExcluindo = null;
            });
            this.$modalExcluir.on('click', function (evento) {
                if (evento.target === self.$modalExcluir[0]) self.fecharModalExcluir();
            });
        },

        abrirModalExcluir: function (linha) {
            var modal = this.$modalExcluir[0];
            if (!modal || typeof modal.showModal !== 'function' || modal.open) return;
            var item = linha.getData();
            this.linhaExcluindo = linha;
            this.$modalExcluir.find('[data-excluir-item]')
                .text(formatarRotulo(item.itemCodigo, item.itemDescricao) + ' (' + item.estCodigo + ')');
            modal.showModal();
        },

        fecharModalExcluir: function () {
            var modal = this.$modalExcluir[0];
            if (modal && modal.open) modal.close();
            this.linhaExcluindo = null;
        },

        // MOCK: só remove da tabela da tela. Trocar pela exclusão no dataset/REST quando existir.
        confirmarExclusao: function () {
            var linha = this.linhaExcluindo;
            this.fecharModalExcluir();
            if (linha) linha.delete();
        }
    });
})();
