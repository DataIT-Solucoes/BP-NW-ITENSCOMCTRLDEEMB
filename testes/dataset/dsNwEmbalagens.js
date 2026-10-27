var NW_CONFIG = {
    serviceCode: "DATASUL_REST_HOMOLOG",
    base: "/dts/datasul-rest/resources/prg/esp/v1/controle-embalagens",
    escritasHabilitadas: ["incluirTipo", "alterarTipo", "incluirParametro", "alterarParametro", "criarTransferencia", "criarRemessa", "criarDevolucao",
        "confirmarEtiqueta", "estornarEtiqueta", "inutilizarEtiqueta", "registrarPerdaExtravio",
        "abrirBag", "alterarBag", "comandarConteudoBag", "executarEventoBag", "reconciliarReservaWt"],
    maxReconciliacoesConsulta: 100,
    todosEstabelecimentosTeste: true,
    timeoutSegundos: "60",
    maxEntrada: 120000,
    maxResposta: 2000000,
    regras: [
        { grupo: "DefaultGroup-1", acoes: ["consultarTipos", "consultarTiposApoio", "incluirTipo", "alterarTipo"], estabelecimentos: [] },
        { grupo: "DefaultGroup-1", acoes: ["consultarParametros", "apoiarEstabelecimentos", "apoiarItens", "incluirParametro", "alterarParametro"], estabelecimentos: ["10904", "11301"] },
        { grupo: "DefaultGroup-1", acoes: ["consultarEtiquetas", "apoiarFamilias", "apoiarDepositos", "apoiarLotes", "apoiarDocumentosEntrada"], estabelecimentos: ["10904", "11301"] },
        { grupo: "DefaultGroup-1", acoes: ["classificarNatureza", "consultarEmbalagensOrigem", "consultarResultadoOperacao", "obterDadosImpressao", "consultarSituacaoEtiqueta", "consultarBags", "consultarConteudoBag", "criarTransferencia", "criarRemessa", "criarDevolucao"], estabelecimentos: ["10904", "11301"] },
        { grupo: "DefaultGroup-1", acoes: ["apoiarTipos", "consultarGeracao", "consultarOperacoes", "consultarItensOperacao", "consultarEventosOperacao",
            "confirmarEtiqueta", "estornarEtiqueta", "inutilizarEtiqueta", "registrarPerdaExtravio", "consultarHistoricoEtiqueta",
            "abrirBag", "alterarBag", "comandarConteudoBag", "executarEventoBag", "consultarElegiveisBag", "consultarHistoricoBag",
            "consultarRecebimentos", "consultarItensRecebimento", "consultarEmbalagensRecebimento", "reconciliarReservaWt",
            "apoiarEmbalagens", "apoiarBags", "apoiarSeries", "apoiarNaturezas", "apoiarNaturezasEntrada", "apoiarNaturezasSaida", "apoiarEmitentes"], estabelecimentos: ["10904", "11301"] }
    ]
};

var NW_COLUNAS = ["acao", "sucesso", "codigoErro", "mensagem", "httpStatus",
    "total", "temMais", "campoCursor", "proximoCursor", "repeticao", "resultadoJson"];

var NW_ACOES = {
    consultarTipos: nwGet("/tipos", false, "codigoDe codigoAte descricao ativo aposCodigo limite", "", "proximoCodigo", "aposCodigo", 100),
    incluirTipo: nwWrite("post", "/tipos", false, "codTipo descricao ativo versao chaveIdempotente", "codTipo descricao ativo chaveIdempotente"),
    alterarTipo: nwWrite("patch", "/tipos", false, "codTipo descricao ativo versao acao chaveIdempotente", "codTipo descricao ativo versao acao chaveIdempotente"),
    consultarParametros: nwGet("/parametros", true, "estabelDe estabelAte itemDe itemAte codTipo ativo aposId limite", "", "proximoId", "aposId", 100),
    incluirParametro: nwWrite("post", "/parametros", true, "idParam codEstabel item codTipo capacidade unidade ativo versao loteMigracao validadeMigracao chaveIdempotente", "codEstabel item codTipo capacidade unidade ativo chaveIdempotente"),
    alterarParametro: nwWrite("patch", "/parametros", true, "idParam codEstabel item codTipo capacidade unidade ativo versao acao loteMigracao validadeMigracao chaveIdempotente", "idParam codEstabel item codTipo capacidade unidade ativo versao acao chaveIdempotente"),
    consultarEtiquetas: nwGet("/etiquetas", true, "codEstabel codEtiqueta item lote codTipo tipoControle tipoLocal situacao idBag aposId limite estabelDe estabelAte itemDe itemAte depositoDe depositoAte etiquetaDe etiquetaAte loteDe loteAte validadeDe validadeAte familiaDe familiaAte modoNotas notaDe notaAte documento", "", "proximoId", "aposId", 100),
    consultarSituacaoEtiqueta: nwGet("/etiquetas/situacao", true, "codEstabel idEtiqueta", "codEstabel idEtiqueta", "", "", 0),
    apoiarEmbalagens: nwGet("/apoios/embalagens", true, "codEstabel filtro aposCodigo limite", "codEstabel filtro", "proximoCodigo", "aposCodigo", 20),
    apoiarBags: nwGet("/apoios/bags", true, "codEstabel filtro aposCodigo limite", "codEstabel filtro", "proximoCodigo", "aposCodigo", 20),
    apoiarSeries: nwGet("/apoios/series", true, "codEstabel filtro aposCodigo limite", "codEstabel filtro", "proximoCodigo", "aposCodigo", 20),
    apoiarNaturezas: nwGet("/apoios/naturezas", true, "codEstabel filtro aposCodigo limite", "codEstabel filtro", "proximoCodigo", "aposCodigo", 20),
    apoiarNaturezasEntrada: nwGet("/apoios/naturezas-entrada", true, "codEstabel filtro aposCodigo limite", "codEstabel filtro", "proximoCodigo", "aposCodigo", 20),
    apoiarNaturezasSaida: nwGet("/apoios/naturezas-saida", true, "codEstabel filtro aposCodigo limite", "codEstabel filtro", "proximoCodigo", "aposCodigo", 20),
    apoiarEmitentes: nwGet("/apoios/emitentes", true, "codEstabel filtro aposCodigo limite", "codEstabel filtro", "proximoCodigo", "aposCodigo", 20),
    apoiarEstabelecimentos: nwGet("/apoios/estabelecimentos", true, "filtro aposCodigo limite", "filtro", "proximoCodigo", "aposCodigo", 20),
    apoiarItens: nwGet("/apoios/itens", true, "codEstabel filtro tipoControleEstoque aposCodigo limite", "filtro", "proximoCodigo", "aposCodigo", 20),
    apoiarTipos: nwGet("/apoios/tipos", false, "filtro ativo aposCodigo limite", "filtro", "proximoCodigo", "aposCodigo", 20),
    apoiarFamilias: nwGet("/apoios/familias", true, "filtro aposCodigo limite", "filtro", "proximoCodigo", "aposCodigo", 20),
    apoiarDepositos: nwGet("/apoios/depositos", true, "codEstabel filtro aposCodigo limite", "filtro", "proximoCodigo", "aposCodigo", 20),
    apoiarLotes: nwGet("/apoios/lotes", true, "codEstabel estabelDe estabelAte item itemDe itemAte depositoDe depositoAte filtro aposCodigo limite", "filtro", "proximoCodigo", "aposCodigo", 20),
    apoiarDocumentosEntrada: nwGet("/apoios/documentos-entrada", true, "codEstabel estabelDe estabelAte filtro somenteComEmbalagens aposCodigo limite", "filtro", "proximoCodigo", "aposCodigo", 20),
    consultarBags: nwGet("/bags", true, "idBag codEstabel filtroLacre codTipo situacao inicio fim aposId limite", "", "proximoId", "aposId", 20),
    consultarConteudoBag: nwGet("/conteudo-bag", true, "idBag aposId limite", "idBag", "proximoId", "aposId", 20),
    obterDadosImpressao: nwGet("/dados-impressao", true, "idEtiqueta", "idEtiqueta", "proximoId", "", 0),
    consultarGeracao: nwGet("/geracoes", true, "idEvento aposId limite", "idEvento", "proximoId", "aposId", 100),
    classificarNatureza: nwGet("/operacoes/natureza", true, "codEstabel natureza", "codEstabel natureza", "", "", 0),
    consultarEmbalagensOrigem: nwGet("/operacoes/embalagens-origem", true, "codEstabel natureza emitenteOrigem serieOrigem numeroOrigem naturezaOrigem aposIdEtiqueta limite", "codEstabel natureza emitenteOrigem serieOrigem numeroOrigem naturezaOrigem", "proximoId", "aposIdEtiqueta", 100),
    consultarOperacoes: nwGet("/operacoes", true, "codEstabel idOperacao wt situacao tipoOperacao aposId limite", "codEstabel", "proximoId", "aposId", 100),
    consultarResultadoOperacao: nwGet("/operacoes/resultado", true, "codEstabel chaveIdempotente ramo emitenteOrigem serieOrigem numeroOrigem naturezaOrigem", "codEstabel chaveIdempotente ramo", "proximoId", "", 0),
    consultarItensOperacao: nwGet("/operacoes/itens", true, "codEstabel idOperacao aposId limite", "codEstabel idOperacao", "proximoId", "aposId", 100),
    consultarEventosOperacao: nwGet("/operacoes/eventos", true, "codEstabel idOperacao aposId limite", "codEstabel idOperacao", "proximoId", "aposId", 100),
    reconciliarReservaWt: nwWrite("post", "/operacoes/reservas/reconciliacao", true, "codEstabel idOperacao versao justificativa chaveIdempotente", "codEstabel idOperacao versao justificativa chaveIdempotente"),
    criarTransferencia: nwWrite("post", "/operacoes/transferencias", true, "codEstabel codEstabelDestino emitenteDestino natureza serie valorItem chaveIdempotente selecao", "codEstabel codEstabelDestino natureza serie valorItem chaveIdempotente selecao"),
    criarRemessa: nwWrite("post", "/operacoes/remessas", true, "codEstabel codEstabelDestino emitenteDestino natureza serie valorItem chaveIdempotente selecao", "codEstabel natureza serie valorItem chaveIdempotente selecao"),
    criarDevolucao: nwWrite("post", "/operacoes/devolucoes", true, "codEstabel natureza serie emitenteOrigem serieOrigem numeroOrigem naturezaOrigem chaveIdempotente selecao", "codEstabel natureza serie emitenteOrigem serieOrigem numeroOrigem naturezaOrigem chaveIdempotente selecao"),
    confirmarEtiqueta: nwWrite("post", "/etiquetas/confirmacoes", true, "codEstabel idEtiqueta versao acao justificativa chaveIdempotente", "codEstabel idEtiqueta versao acao chaveIdempotente"),
    estornarEtiqueta: nwWrite("post", "/etiquetas/estorno", true, "codEstabel idEtiqueta versao quantidadeAtual justificativa chaveIdempotente", "codEstabel idEtiqueta versao quantidadeAtual justificativa chaveIdempotente"),
    inutilizarEtiqueta: nwWrite("post", "/etiquetas/inutilizacao", true, "codEstabel idEtiqueta versao acao justificativa chaveIdempotente", "codEstabel idEtiqueta versao acao justificativa chaveIdempotente"),
    registrarPerdaExtravio: nwWrite("post", "/etiquetas/perda-extravio", true, "codEstabel idEtiqueta versao acao justificativa chaveIdempotente", "codEstabel idEtiqueta versao acao justificativa chaveIdempotente"),
    consultarHistoricoEtiqueta: nwGet("/etiquetas/historico", true, "codEstabel idEtiqueta aposRegistro limite", "codEstabel idEtiqueta", "proximoRegistro", "aposRegistro", 100),
    abrirBag: nwWrite("post", "/bags", true, "codEstabel codTipo destino motorista justificativa chaveIdempotente", "codEstabel codTipo chaveIdempotente"),
    alterarBag: nwWrite("patch", "/bags", true, "codEstabel idBag versao acao destino motorista nroLacre justificativa chaveIdempotente", "codEstabel idBag versao chaveIdempotente"),
    comandarConteudoBag: nwWrite("post", "/bags/conteudo", true, "codEstabel idBag versao acao etiquetas justificativa chaveIdempotente", "codEstabel idBag versao acao etiquetas chaveIdempotente"),
    executarEventoBag: nwWrite("post", "/bags/eventos", true, "codEstabel idBag versao acao nroLacre destino motorista justificativa chaveIdempotente", "codEstabel idBag versao acao chaveIdempotente"),
    consultarElegiveisBag: nwGet("/bags/elegiveis", true, "idBag aposId limite", "idBag", "proximoId", "aposId", 20),
    consultarHistoricoBag: nwGet("/bags/historico", true, "idBag aposId limite", "idBag", "proximoId", "aposId", 20),
    consultarRecebimentos: nwGet("/recebimentos", true, "codEstabel dataIni dataFim tipoData emitente serie numero natureza item etiqueta atualizado somenteComEmbalagens aposDocumento limite", "codEstabel dataIni dataFim", "proximoDocumento", "aposDocumento", 100),
    consultarItensRecebimento: nwGet("/recebimentos/itens", true, "codEstabel emitente serie numero natureza idEvento aposSequencia limite", "codEstabel emitente serie numero natureza", "proximaSequencia", "aposSequencia", 100),
    consultarEmbalagensRecebimento: nwGet("/recebimentos/embalagens", true, "codEstabel emitente serie numero natureza idEvento sequencia aposId limite", "codEstabel emitente serie numero natureza", "proximoId", "aposId", 100)

};

NW_ACOES.consultarTiposApoio = NW_ACOES.apoiarTipos;

function nwGet(rota, estabel, campos, obrigatorios, cursor, entradaCursor, teto) {
    return { metodo: "get", rota: rota, estabel: estabel, campos: campos.split(" "),
        obrigatorios: obrigatorios ? obrigatorios.split(" ") : [], cursor: cursor,
        entradaCursor: entradaCursor, teto: teto };
}
function nwWrite(metodo, rota, estabel, campos, obrigatorios) {
    return { metodo: metodo, rota: rota, estabel: estabel, campos: campos.split(" "),
        obrigatorios: obrigatorios.split(" "), cursor: "", entradaCursor: "", teto: 0 };
}
function defineStructure() {
    for (var i = 0; i < NW_COLUNAS.length; i++) addColumn(NW_COLUNAS[i]);
}
function onSync(lastSyncDate) { return null; }
function onMobileSync(user) { return null; }

function createDataset(fields, constraints, sortFields) {
    var ds = DatasetBuilder.newDataset();
    for (var i = 0; i < NW_COLUNAS.length; i++) ds.addColumn(NW_COLUNAS[i]);
    var acao = "", status = "", escrita = false, invocou = false, confirmouResultado = false;
    try {
        if ((fields && fields.length) || (sortFields && sortFields.length))
            nwFalhar("ENTRADA_INVALIDA", "Use o envelope completo e a ordenacao da API.");
        var entrada = nwEntrada(constraints);
        acao = entrada.acao;
        if (!nwTem(NW_ACOES, acao)) nwFalhar("ACAO_INVALIDA", "Acao nao disponivel neste Dataset.");
        var regra = NW_ACOES[acao];
        escrita = regra.metodo !== "get";
        var parametros = nwParametros(entrada.parametros, regra);
        var usuario = nwSessao("WKUser"), empresa = nwSessao("WKCompany");
        if (!usuario || !empresa) nwFalhar("CONTEXTO_INVALIDO", "Nao foi possivel identificar a sessao Fluig.");
        var permitidos = nwAutorizar(usuario, empresa, acao, regra.estabel);
        if (acao === "apoiarItens" && (!nwTem(parametros, "codEstabel") || parametros.codEstabel === ""))
            parametros.codEstabel = permitidos[0];
        nwConferirEstabelecimentos(parametros, permitidos);
        if (escrita && !nwEscritaHabilitada(acao))
            nwFalhar("ESCRITA_DESABILITADA", "Comandos ainda nao habilitados nesta configuracao do Dataset.");

        var req = { companyId: empresa, serviceCode: NW_CONFIG.serviceCode,
            endpoint: NW_CONFIG.base + regra.rota, method: regra.metodo,
            timeoutService: NW_CONFIG.timeoutSegundos, headers: { "Accept": "application/json" } };
        if (!escrita) {
            var query = ["usuario=" + encodeURIComponent(usuario)];
            if (regra.estabel) for (i = 0; i < permitidos.length; i++)
                query.push("estabelecimentoPermitido=" + encodeURIComponent(permitidos[i]));
            for (var nome in parametros) if (nwTem(parametros, nome)) {
                if (regra.rota === "/etiquetas" && nome === "documento") {
                    for (var d = 0; d < parametros.documento.length; d++)
                        query.push("documento=" + encodeURIComponent(parametros.documento[d]));
                } else query.push(encodeURIComponent(nome) + "=" + encodeURIComponent(String(parametros[nome])));
            }
            req.endpoint += "?" + query.join("&");
        } else {
            parametros.usuario = usuario;
            if (regra.estabel) parametros.estabelecimentosPermitidos = permitidos;
            req.params = parametros;
            req.options = { encoding: "UTF-8", mediaType: "application/json" };
            req.headers["Content-Type"] = "application/json";
        }
        var client = fluigAPI.getAuthorizeClientService();
        invocou = true;
        var resposta = client.invoke(JSON.stringify(req));
        try { status = nwTexto(resposta.getHttpStatusResult()); } catch (eStatus) { status = ""; }
        if (!/^[0-9]{3}$/.test(status)) nwFalhar("HTTP_STATUS_INDISPONIVEL", "Nao foi possivel confirmar o status HTTP da API.");
        var numeroStatus = Number(status);
        if (numeroStatus < 200 || numeroStatus >= 300)
            nwFalhar("HTTP_" + status, "A API respondeu HTTP " + status + ".");
        var corpo = nwTexto(resposta.getResult());
        if (!corpo || corpo.length > NW_CONFIG.maxResposta)
            nwFalhar("RESPOSTA_INVALIDA", "Resposta vazia ou acima do limite do Dataset.");
        var resultado;
        try { resultado = JSON.parse(corpo); }
        catch (eJson) { nwFalhar("RESPOSTA_INVALIDA", "A API nao retornou JSON valido."); }
        nwValidarResposta(resultado, regra, parametros);
        confirmouResultado = true;
        if (!resultado.sucesso) {
            var codigo = /^[A-Z0-9_]{1,100}$/.test(resultado.codigoErro || "") ? resultado.codigoErro : "RECUSA_API";
            nwFalhar(codigo, nwMensagem(resultado.mensagem));
        }
        if (acao === "consultarEtiquetas" || acao === "consultarSituacaoEtiqueta")
            resultado = nwReconciliarConsulta(client, req, regra, parametros, resultado, usuario, empresa, permitidos);
        nwLinha(ds, acao, status, resultado, regra.cursor);
    } catch (erro) {
        var codigoErro = erro && erro.nwCodigo ? erro.nwCodigo : "FALHA_CHAMADA";
        var mensagem = erro && erro.nwCodigo ? erro.nwMensagem : "Nao foi possivel concluir a chamada autorizada.";
        if (escrita && invocou && !confirmouResultado) {
            mensagem += " Se o resultado for incerto, consulte a mesma chave antes de repetir; nao gere chave nova.";
        }
        log.warn("[dsNwEmbalagens] acao=" + (nwTem(NW_ACOES, acao) ? acao : "INVALIDA") + " codigo=" + codigoErro);
        nwLinha(ds, acao && nwTem(NW_ACOES, acao) ? acao : "", status,
            { sucesso: false, codigoErro: codigoErro, mensagem: mensagem }, "");
    }
    return ds;
}

var NW_CONSTRAINTS_FLUIG = ["sqlLimit"];

function nwEntrada(constraints) {
    var entrada = {}, nomes = ["acao", "parametros"];
    for (var i = 0; constraints && i < constraints.length; i++) {
        var c = constraints[i], nome = nwTexto(c.getFieldName());
        if (nwIndice(NW_CONSTRAINTS_FLUIG, nome) >= 0) continue;
        if (nwIndice(nomes, nome) < 0 || nwTem(entrada, nome))
            nwFalhar("ENTRADA_INVALIDA", "Constraint desconhecida ou repetida: " + nome.replace(/[^A-Za-z0-9_.-]/g, "").substring(0, 40) + ".");
        var valor = nwTexto(c.getInitialValue());
        var valorFinal = c.getFinalValue ? nwTexto(c.getFinalValue()) : "";
        if (valorFinal !== "" && valorFinal !== valor) nwFalhar("ENTRADA_INVALIDA", "Faixas de constraints nao sao aceitas; use parametros JSON.");
        if (valor.length > NW_CONFIG.maxEntrada) nwFalhar("ENTRADA_INVALIDA", "Entrada acima do limite.");
        entrada[nome] = valor;
    }
    if (!entrada.acao || entrada.acao.length > 80) nwFalhar("ACAO_INVALIDA", "Informe uma acao nominal.");
    return { acao: entrada.acao, parametros: entrada.parametros || "{}" };
}

function nwParametros(texto, regra) {
    var p;
    try { p = JSON.parse(texto); } catch (e) { nwFalhar("PARAMETROS_INVALIDOS", "parametros deve conter um objeto JSON valido."); }
    if (!nwObjeto(p)) nwFalhar("PARAMETROS_INVALIDOS", "parametros deve ser um objeto JSON.");
    if (nwAcaoComplementada(regra)) return nwParametrosComplementados(p, regra);
    for (var nome in p) if (nwTem(p, nome)) {
        if (nwIndice(regra.campos, nome) < 0) nwFalhar("CAMPO_NAO_PERMITIDO", "Campo nao permitido para esta acao.");
        var v = p[nome];
        if (nome === "selecao") { nwSelecao(v); continue; }
        if (regra.rota === "/etiquetas" && nome === "documento") { p[nome] = nwDocumentosManutencao(v); continue; }
        if (regra.rota === "/apoios/documentos-entrada" && nome === "aposCodigo") {
            if (typeof v !== "string" || /[\x00-\x1f]/.test(v)) nwFalhar("PARAMETROS_INVALIDOS", "Cursor de documento invalido.");
            continue;
        }
        if (v === null || (typeof v !== "string" && typeof v !== "number" && typeof v !== "boolean"))
            nwFalhar("PARAMETROS_INVALIDOS", "Tipo de parametro invalido.");
        // TAB pertence a descricao-chave legada; somente o cursor opaco preserva esse byte.
        var controleTexto = nome === "aposCodigo" && regra.rota === "/apoios/naturezas" ? /[\x00-\x08\x0a-\x1f]/ : /[\x00-\x1f]/;
        if (typeof v === "string" && (v.length > (nome === "aposCodigo" && regra.rota === "/apoios/naturezas" ? 500 : nome === "chaveIdempotente" ? 200 : 100) || controleTexto.test(v)))
            nwFalhar("PARAMETROS_INVALIDOS", "Texto invalido ou acima do limite.");
        if (regra.metodo === "get") {
            if (nome === "limite") {
                if (!/^[1-9][0-9]*$/.test(String(v)) || Number(v) > regra.teto) nwFalhar("LIMITE_INVALIDO", "Limite fora da faixa desta consulta.");
            } else if (nome === "ativo") {
                if (v !== true && v !== false && v !== "true" && v !== "false" && !(regra.rota === "/apoios/tipos" && v === "todos")) nwFalhar("PARAMETROS_INVALIDOS", "ativo deve ser true ou false; todos somente no apoio de tipos.");
            } else if (typeof v !== "string") nwFalhar("PARAMETROS_INVALIDOS", "Filtros e IDs devem ser texto; limite pode ser numero.");
        } else {
            if (nwIndice(["idParam", "versao"], nome) >= 0) {
                if (typeof v !== "number" || v % 1 !== 0 || v < 0 || v > 2147483647) nwFalhar("PARAMETROS_INVALIDOS", "Versao/idParam cadastral deve ser inteiro JSON valido.");
            } else if (nome === "capacidade" || nome === "valorItem") {
                if (typeof v !== "number" || !isFinite(v) || v < 0) nwFalhar("PARAMETROS_INVALIDOS", "Quantidade monetaria/capacidade deve ser numero nao negativo.");
            } else if (nome === "ativo") {
                if (typeof v !== "boolean") nwFalhar("PARAMETROS_INVALIDOS", "ativo deve ser booleano JSON.");
            } else if (typeof v !== "string") nwFalhar("PARAMETROS_INVALIDOS", "Codigos e identificadores devem ser texto.");
        }
    }
    for (var i = 0; i < regra.obrigatorios.length; i++) {
        var obrigatorio = regra.obrigatorios[i];
        if (!nwTem(p, obrigatorio) || p[obrigatorio] === "") nwFalhar("PARAMETRO_OBRIGATORIO", "Faltam parametros obrigatorios desta acao.");
    }
    if (regra.teto && !nwTem(p, "limite")) p.limite = 20;
    if (nwNovoAutocomplete(regra)) nwValidarAutocomplete(p, regra);
    if (!nwNovoAutocomplete(regra) && nwTem(p, "filtro") && p.filtro.replace(/^\s+|\s+$/g, "").length < 2) nwFalhar("FILTRO_INVALIDO", "Digite pelo menos dois caracteres.");
    if (nwTem(p, "chaveIdempotente") && !p.chaveIdempotente.replace(/^\s+|\s+$/g, "")) nwFalhar("PARAMETROS_INVALIDOS", "Chave idempotente obrigatoria.");
    if (regra.rota === "/operacoes/resultado") {
        if (p.ramo !== "DIRETO" && p.ramo !== "DEVOLUCAO") nwFalhar("PARAMETROS_INVALIDOS", "Ramo deve ser DIRETO ou DEVOLUCAO.");
        if (p.ramo === "DEVOLUCAO") for (i = 0; i < 4; i++) {
            var origem = ["emitenteOrigem", "serieOrigem", "numeroOrigem", "naturezaOrigem"][i];
            if (!p[origem]) nwFalhar("PARAMETRO_OBRIGATORIO", "Informe a identidade completa da origem.");
        }
    }
    if (regra.rota === "/etiquetas") nwValidarNotasManutencao(p);
    return p;
}

function nwNovoAutocomplete(r) {
    return nwIndice(["/apoios/embalagens", "/apoios/bags", "/apoios/series", "/apoios/naturezas", "/apoios/naturezas-entrada", "/apoios/naturezas-saida", "/apoios/emitentes"], r.rota) >= 0;
}
function nwValidarAutocomplete(p, r) {
    p.filtro = p.filtro.replace(/^\s+|\s+$/g, "");
    if (!p.filtro || !p.codEstabel.replace(/^\s+|\s+$/g, "")) nwFalhar("FILTRO_INVALIDO", "Informe estabelecimento e filtro.");
    if ((r.rota === "/apoios/embalagens" || r.rota === "/apoios/bags") && !/^[0-9]{1,100}$/.test(p.filtro))
        nwFalhar("FILTRO_INVALIDO", "Informe o codigo numerico em texto.");
    if (r.rota === "/apoios/emitentes" && !/^[0-9]+$/.test(p.filtro) && p.filtro.length < 2)
        nwFalhar("FILTRO_INVALIDO", "Digite dois caracteres ou um codigo.");
    if (nwTem(p, "aposCodigo") && p.aposCodigo !== "" &&
        nwIndice(["/apoios/embalagens", "/apoios/bags", "/apoios/emitentes"], r.rota) >= 0 &&
        (!/^[0-9]+$/.test(p.aposCodigo) || Number(p.aposCodigo) > 2147483647))
        nwFalhar("CURSOR_INVALIDO", "Cursor numerico invalido.");
}
function nwTodosEstabelecimentosTeste() {
    if (NW_CONFIG.todosEstabelecimentosTeste !== true) return false;
    if (NW_CONFIG.serviceCode !== "DATASUL_REST_HOMOLOG")
        nwFalhar("AUTORIZACAO_NAO_CONFIGURADA", "Modo de todos os estabelecimentos exclusivo do servico de TESTE.");
    return true;
}
function nwPermiteEstabelecimento(permitidos, codigo) {
    return typeof codigo === "string" && /^[A-Za-z0-9_-]{1,20}$/.test(codigo) &&
        (nwIndice(permitidos, codigo) >= 0 || (nwIndice(permitidos, "*") >= 0 && nwTodosEstabelecimentosTeste()));
}
function nwIntersecaoEstabelecimentos(a, b) {
    if (nwIndice(a, "*") >= 0) return b.slice(0);
    if (nwIndice(b, "*") >= 0) return a.slice(0);
    var r = [];
    for (var i = 0; i < a.length; i++) if (nwIndice(b, a[i]) >= 0) r.push(a[i]);
    return r;
}

function nwAcaoComplementada(r) {
    return nwIndice(["/etiquetas/confirmacoes", "/etiquetas/estorno", "/etiquetas/inutilizacao",
        "/etiquetas/perda-extravio", "/etiquetas/historico", "/operacoes/reservas/reconciliacao", "/bags/conteudo", "/bags/eventos",
        "/bags/elegiveis", "/bags/historico", "/recebimentos", "/recebimentos/itens", "/recebimentos/embalagens"], r.rota) >= 0 ||
        (r.rota === "/bags" && r.metodo !== "get");
}
function nwTextoPreenchido(p, nome) {
    return nwTem(p, nome) && typeof p[nome] === "string" && p[nome].replace(/^\s+|\s+$/g, "") !== "";
}
function nwExigirCampos(p, nomes) {
    for (var i = 0; i < nomes.length; i++) {
        var nome = nomes[i];
        if (!nwTem(p, nome) || (typeof p[nome] === "string" && !nwTextoPreenchido(p, nome)))
            nwFalhar("PARAMETRO_OBRIGATORIO", "Informe " + nome + ".");
    }
}
function nwVersaoBag(v) {
    return typeof v === "number" && isFinite(v) && v % 1 === 0 && v > 0 && v <= 2147483647;
}

function nwEtiquetasBag(lista) {
    if (!nwArray(lista) || lista.length < 1 || lista.length > 100)
        nwFalhar("SELECAO_INVALIDA", "Informe de uma a cem etiquetas de Bag.");
    var ids = {};
    for (var i = 0; i < lista.length; i++) {
        var e = lista[i];
        if (!nwObjeto(e)) nwFalhar("SELECAO_INVALIDA", "Cada etiqueta deve ser um objeto.");
        for (var campo in e) if (nwTem(e, campo) && campo !== "idEtiqueta" && campo !== "versao")
            nwFalhar("SELECAO_INVALIDA", "Bag aceita somente idEtiqueta e versao.");
        if (!nwIdPositivo(e.idEtiqueta) || !nwVersaoBag(e.versao))
            nwFalhar("SELECAO_INVALIDA", "Etiqueta deve ser ID textual e versao um inteiro JSON positivo.");
        if (nwTem(ids, e.idEtiqueta)) nwFalhar("SELECAO_INVALIDA", "Etiqueta repetida.");
        ids[e.idEtiqueta] = true;
    }
}
function nwParametrosComplementados(p, r) {
    var leitura = r.metodo === "get", nome, v;
    for (nome in p) if (nwTem(p, nome)) {
        if (nwIndice(r.campos, nome) < 0) nwFalhar("CAMPO_NAO_PERMITIDO", "Campo nao permitido para esta acao.");
        v = p[nome];
        if (nome === "etiquetas") { nwEtiquetasBag(v); continue; }
        if (leitura && nome === "limite") {
            if ((typeof v !== "string" && typeof v !== "number") || !/^[1-9][0-9]*$/.test(String(v)) || Number(v) > r.teto)
                nwFalhar("LIMITE_INVALIDO", "Limite fora da faixa desta consulta.");
            continue;
        }
        if (!leitura && nome === "versao") {
            if (!nwVersaoBag(v)) nwFalhar("PARAMETROS_INVALIDOS", "versao deve ser inteiro JSON positivo.");
            continue;
        }
        if (!leitura && nome === "quantidadeAtual") {
            if (typeof v !== "number" || !isFinite(v) || !isFinite(v * 10000) || v < 0 || Number(v.toFixed(4)) !== v)
                nwFalhar("PARAMETROS_INVALIDOS", "quantidadeAtual deve ser numero nao negativo com ate quatro casas.");
            continue;
        }
        var maximo = nome === "justificativa" ? 1000 : nome === "destino" ? 80 : nome === "nroLacre" ? 40 :
            nome === "chaveIdempotente" ? 64 : nome === "aposDocumento" ? NW_CONFIG.maxEntrada : 100;
        if (typeof v !== "string" || v.length > maximo ||
            (nome === "justificativa" ? /[\x00-\x08\x0b\x0c\x0e-\x1f]/ : /[\x00-\x1f]/).test(v))
            nwFalhar("PARAMETROS_INVALIDOS", "Tipo ou tamanho textual invalido: " + nome + ".");
        if (leitura && nwIndice(["idEtiqueta", "idBag", "idEvento", "emitente", "sequencia", "aposSequencia", "aposId"], nome) >= 0 &&
            (!/^[0-9]+$/.test(v) || Number(v) > 2147483647 ||
             ((nome === "idEtiqueta" || nome === "idBag") && Number(v) <= 0)))
            nwFalhar("PARAMETROS_INVALIDOS", "Identificador/cursor deve ser numero inteiro em texto.");
        if (!leitura && (nome === "idEtiqueta" || nome === "idBag" || nome === "idOperacao") && !nwIdPositivo(v))
            nwFalhar("PARAMETROS_INVALIDOS", "ID deve ser inteiro positivo em texto.");
        if (!leitura && nome === "chaveIdempotente" && !/^[A-Za-z0-9_-]{1,64}$/.test(v))
            nwFalhar("PARAMETROS_INVALIDOS", "Chave idempotente invalida.");
        if (!leitura && nome === "nroLacre" && !nwTextoPreenchido(p, nome))
            nwFalhar("PARAMETROS_INVALIDOS", "Lacre nao pode ser vazio.");
    }
    nwExigirCampos(p, r.obrigatorios);
    if (leitura) {
        if (!nwTem(p, "limite")) p.limite = 20;
        return p;
    }
    if (r.rota === "/etiquetas/confirmacoes") {
        if (p.acao !== "CONFIRMAR_IMPRESSAO" && p.acao !== "RECEBER_FISICO")
            nwFalhar("PARAMETROS_INVALIDOS", "Acao de confirmacao invalida.");
        if (p.acao === "RECEBER_FISICO") nwExigirCampos(p, ["justificativa"]);
    }
    if ((r.rota === "/etiquetas/inutilizacao" && p.acao !== "INUTILIZAR") ||
        (r.rota === "/etiquetas/perda-extravio" && p.acao !== "REGISTRAR_PERDA_EXTRAVIO"))
        nwFalhar("PARAMETROS_INVALIDOS", "Acao incompativel com a rota.");
    if (r.rota === "/bags" && r.metodo === "post" && !/^[A-Za-z0-9]{2,3}$/.test(p.codTipo))
        nwFalhar("PARAMETROS_INVALIDOS", "Tipo de Bag invalido.");
    if (r.rota === "/bags" && r.metodo === "patch") {
        if (nwTem(p, "acao") && p.acao !== "EDITAR") nwFalhar("PARAMETROS_INVALIDOS", "Acao de edicao invalida.");
        if (!nwTem(p, "destino") && !nwTem(p, "motorista") && !nwTem(p, "nroLacre"))
            nwFalhar("PARAMETRO_OBRIGATORIO", "Informe ao menos um campo para editar.");
    }
    if (r.rota === "/bags/conteudo") {
        if (p.acao !== "INCLUIR" && p.acao !== "RETIRAR") nwFalhar("PARAMETROS_INVALIDOS", "Acao de conteudo invalida.");
        if (p.acao === "RETIRAR") nwExigirCampos(p, ["justificativa"]);
    }
    if (r.rota === "/bags/eventos") {
        if (nwIndice(["LACRAR", "ENVIAR", "CANCELAR", "REABRIR"], p.acao) < 0)
            nwFalhar("PARAMETROS_INVALIDOS", "Evento de Bag invalido.");
        if (p.acao === "LACRAR") nwExigirCampos(p, ["nroLacre"]);
        if (p.acao === "ENVIAR") nwExigirCampos(p, ["destino", "motorista"]);
        if (p.acao === "CANCELAR" || p.acao === "REABRIR") {
            nwExigirCampos(p, ["justificativa"]);
            if (nwTem(p, "nroLacre") || nwTem(p, "destino") || nwTem(p, "motorista"))
                nwFalhar("CAMPO_NAO_PERMITIDO", "Cancelamento/reabertura nao alteram metadados.");
        }
    }
    return p;
}

function nwDocumentosManutencao(valor) {
    var lista = typeof valor === "string" ? [valor] : valor;
    if (!nwArray(lista) || lista.length < 1 || lista.length > 20)
        nwFalhar("PARAMETROS_INVALIDOS", "Informe de um a vinte documentos de entrada.");
    for (var i = 0; i < lista.length; i++) {
        if (typeof lista[i] !== "string" || !lista[i].replace(/^\s+|\s+$/g, "") || /[\x00-\x1f]/.test(lista[i]))
            nwFalhar("PARAMETROS_INVALIDOS", "Identidade de documento invalida.");
    }
    return lista;
}

function nwValidarNotasManutencao(p) {
    if (nwTem(p, "modoNotas") && p.modoNotas !== "INTERVALO" && p.modoNotas !== "ESPECIFICAS")
        nwFalhar("FILTRO_INVALIDO", "modoNotas deve ser INTERVALO ou ESPECIFICAS.");
    if (p.modoNotas === "ESPECIFICAS") {
        if (!nwTem(p, "documento") || p.notaDe || p.notaAte)
            nwFalhar("FILTRO_INVALIDO", "Selecione documentos sem misturar intervalo de notas.");
    } else if (nwTem(p, "documento")) {
        nwFalhar("FILTRO_INVALIDO", "Documentos selecionados exigem modoNotas ESPECIFICAS.");
    }
}

function nwSelecao(lista) {
    if (!nwArray(lista) || lista.length < 1 || lista.length > 100) nwFalhar("SELECAO_INVALIDA", "Selecione de uma a cem embalagens.");
    var ids = {};
    for (var i = 0; i < lista.length; i++) {
        var e = lista[i];
        if (!nwObjeto(e)) nwFalhar("SELECAO_INVALIDA", "Cada selecao deve ser um objeto.");
        for (var nome in e) if (nwTem(e, nome) && nwIndice(["idEtiqueta", "versao", "quantidade"], nome) < 0)
            nwFalhar("SELECAO_INVALIDA", "Campo desconhecido na selecao.");
        if (!nwIdPositivo(e.idEtiqueta) || !nwIdPositivo(e.versao)) nwFalhar("SELECAO_INVALIDA", "Etiqueta/versao devem ser inteiros positivos em texto.");
        if (nwTem(ids, e.idEtiqueta)) nwFalhar("SELECAO_INVALIDA", "Etiqueta repetida.");
        ids[e.idEtiqueta] = true;
        if (typeof e.quantidade !== "number" || !isFinite(e.quantidade) || e.quantidade <= 0 ||
            Math.abs(e.quantidade * 10000 - Math.round(e.quantidade * 10000)) > 0.00001)
            nwFalhar("SELECAO_INVALIDA", "Quantidade deve ser positiva, com ate quatro casas decimais.");
    }
}

function nwAutorizar(usuario, empresa, acao, exigeEstabel) {
    if (!nwArray(NW_CONFIG.regras) || !NW_CONFIG.regras.length) nwFalhar("AUTORIZACAO_NAO_CONFIGURADA", "Configure os grupos e permissoes no servidor Fluig.");
    var constraints = [
        DatasetFactory.createConstraint("colleagueGroupPK.companyId", empresa, empresa, ConstraintType.MUST),
        DatasetFactory.createConstraint("colleagueGroupPK.colleagueId", usuario, usuario, ConstraintType.MUST)
    ];
    var grupos = DatasetFactory.getDataset("colleagueGroup", null, constraints, null);
    if (!grupos || typeof grupos.rowsCount === "undefined") nwFalhar("FALHA_AUTORIZACAO", "Nao foi possivel consultar os grupos da sessao.");
    var membros = {};
    for (var i = 0; i < grupos.rowsCount; i++) {
        if (nwCampoGrupo(grupos, i, "companyId") !== empresa ||
            nwCampoGrupo(grupos, i, "colleagueId") !== usuario) continue;
        var grupo = nwCampoGrupo(grupos, i, "groupId");
        if (grupo) membros["g:" + grupo] = true;
    }
    var liberado = false, permitidos = [];
    for (i = 0; i < NW_CONFIG.regras.length; i++) {
        var r = NW_CONFIG.regras[i];
        if (!nwObjeto(r) || !r.grupo || !nwArray(r.acoes) || !nwArray(r.estabelecimentos)) nwFalhar("AUTORIZACAO_NAO_CONFIGURADA", "Politica de autorizacao invalida.");
        if (!nwTem(membros, "g:" + r.grupo) || nwIndice(r.acoes, acao) < 0) continue;
        liberado = true;
        for (var j = 0; j < r.estabelecimentos.length; j++) {
            var est = r.estabelecimentos[j];
            if (typeof est !== "string" || !/^[A-Za-z0-9_-]{1,20}$/.test(est)) nwFalhar("AUTORIZACAO_NAO_CONFIGURADA", "Estabelecimento da politica invalido.");
            if (nwIndice(permitidos, est) < 0) permitidos.push(est);
        }
    }
    if (!liberado || (exigeEstabel && !permitidos.length)) nwFalhar("SEM_PERMISSAO", "Acao ou estabelecimento nao autorizado.");
    permitidos.sort();
    if (exigeEstabel && nwTodosEstabelecimentosTeste()) permitidos.push("*");
    return permitidos;
}

function nwCampoGrupo(grupos, linha, campo) {
    var valor = "";
    try { valor = nwTexto(grupos.getValue(linha, "colleagueGroupPK." + campo)); } catch (ePk) { valor = ""; }
    if (valor === "" || valor === "null") {
        try { valor = nwTexto(grupos.getValue(linha, campo)); } catch (eCurto) { valor = ""; }
    }
    return valor === "null" ? "" : valor;
}

function nwEscritaHabilitada(acao) {
    var cfg = NW_CONFIG.escritasHabilitadas;
    return cfg === true || (nwArray(cfg) && nwIndice(cfg, acao) >= 0);
}

function nwConferirEstabelecimentos(p, permitidos) {
    var nomes = ["codEstabel", "codEstabelDestino"];
    for (var i = 0; i < nomes.length; i++) if (nwTem(p, nomes[i]) && p[nomes[i]] !== "" && !nwPermiteEstabelecimento(permitidos, p[nomes[i]]))
        nwFalhar("SEM_PERMISSAO", "Estabelecimento nao autorizado para esta acao.");
}

function nwValidarResposta(r, regra, parametros) {
    if (!nwObjeto(r) || typeof r.sucesso !== "boolean") nwFalhar("RESPOSTA_INVALIDA", "Envelope funcional da API invalido.");
    if (!r.sucesso) return;
    if (nwTem(r, "dados") && !nwArray(r.dados)) nwFalhar("RESPOSTA_INVALIDA", "dados deve ser uma lista.");
    if (regra.metodo === "get" && regra.teto) {
        var linhas = regra.rota === "/geracoes" ? r.etiquetas : r.dados;
        if (!nwArray(linhas) || typeof r.total !== "number" || r.total !== linhas.length ||
            typeof r.temMais !== "boolean" || linhas.length > Number(parametros.limite))
            nwFalhar("RESPOSTA_INVALIDA", "Envelope da pagina invalido.");
        if (r.temMais) {
            var cursor = r[regra.cursor];
            if (typeof cursor !== "string" || !cursor || !linhas.length || cursor === parametros[regra.entradaCursor])
                nwFalhar("CURSOR_INVALIDO", "A API informou mais dados sem um cursor novo valido.");
            if (/^aposId/.test(regra.entradaCursor) && (!nwIdPositivo(cursor) || Number(cursor) <= Number(parametros[regra.entradaCursor] || "0")))
                nwFalhar("CURSOR_INVALIDO", "Cursor numerico nao avancou.");
        }
    }
    nwConferirRespostaSegura(r, 0);
}
function nwConferirRespostaSegura(valor, nivel) {
    if (nivel > 15) nwFalhar("RESPOSTA_INVALIDA", "Resposta acima da profundidade permitida.");
    if (typeof valor === "string" && /(?:authorization\s*[:=]|bearer\s+|set-cookie\s*:|(?:acTk|rfTk)\s*[:=])/i.test(valor))
        nwFalhar("RESPOSTA_INVALIDA", "Resposta contem informacao tecnica nao permitida.");
    if (!valor || typeof valor !== "object") return;
    for (var nome in valor) if (nwTem(valor, nome)) {
        if (/^(?:__proto__|prototype|constructor|password|senha|token|access_token|refresh_token|authorization|cookie|cookies|headers|oInput|stack|observacao|dados-evento|resultadoTecnico)$/i.test(nome))
            nwFalhar("RESPOSTA_INVALIDA", "Resposta contem campo nao permitido.");
        nwConferirRespostaSegura(valor[nome], nivel + 1);
    }
}

// Coordenacao da integracao: GET continua sem escrita; somente este POST libera.
function nwCandidatosReserva(resultado, permitidos) {
    var linhas = nwArray(resultado.dados) ? resultado.dados : [resultado];
    var porOperacao = {}, candidatos = [];
    for (var i = 0; i < linhas.length; i++) {
        var linha = linhas[i];
        if (!nwObjeto(linha) || linha.estadoReservaFiscal !== "WT_EXCLUIDO_SEM_FISCAL") continue;
        if (linha.reservaFiscalAtiva !== true || linha.situacaoApresentada !== "RESERVADA" ||
            typeof linha.codEstabel !== "string" || !nwPermiteEstabelecimento(permitidos, linha.codEstabel) ||
            !nwIdPositivo(linha.idOperacaoReserva) || !nwIdPositivo(linha.wtReserva) ||
            !nwVersaoBag(linha.versaoOperacaoReserva))
            nwFalhar("RESPOSTA_INVALIDA", "Metadados da reserva fiscal incompletos ou fora do contexto autorizado.");
        var chave = "op:" + linha.codEstabel + ":" + linha.idOperacaoReserva;
        var candidato = { codEstabel: linha.codEstabel, idOperacao: linha.idOperacaoReserva,
            wt: linha.wtReserva, versao: linha.versaoOperacaoReserva };
        if (nwTem(porOperacao, chave)) {
            if (porOperacao[chave].wt !== candidato.wt || porOperacao[chave].versao !== candidato.versao)
                nwFalhar("RESPOSTA_INVALIDA", "A mesma operacao retornou reservas divergentes.");
        } else {
            porOperacao[chave] = candidato;
            candidatos.push(candidato);
        }
    }
    return candidatos;
}

function nwInvocarReserva(client, req, regra, parametros) {
    var resposta = client.invoke(JSON.stringify(req)), status = "";
    try { status = nwTexto(resposta.getHttpStatusResult()); } catch (e) { status = ""; }
    if (!/^[0-9]{3}$/.test(status) || Number(status) < 200 || Number(status) >= 300)
        nwFalhar("FALHA_ATUALIZACAO_RESERVA", "Nao foi possivel confirmar a atualizacao da reserva.");
    var texto = nwTexto(resposta.getResult()), resultado;
    if (!texto || texto.length > NW_CONFIG.maxResposta)
        nwFalhar("RESPOSTA_INVALIDA", "Resposta vazia ou acima do limite do Dataset.");
    try { resultado = JSON.parse(texto); }
    catch (erro) { nwFalhar("RESPOSTA_INVALIDA", "A API nao retornou JSON valido."); }
    nwValidarResposta(resultado, regra, parametros);
    if (!resultado.sucesso)
        nwFalhar(/^[A-Z0-9_]{1,100}$/.test(resultado.codigoErro || "") ? resultado.codigoErro : "RECUSA_API",
            nwMensagem(resultado.mensagem));
    return resultado;
}

function nwReconciliarConsulta(client, consulta, regra, parametros, resultado, usuario, empresa, permitidosConsulta) {
    var candidatos = nwCandidatosReserva(resultado, permitidosConsulta);
    if (!candidatos.length || !nwEscritaHabilitada("reconciliarReservaWt")) return resultado;
    var permitidosComando;
    try { permitidosComando = nwAutorizar(usuario, empresa, "reconciliarReservaWt", true); }
    catch (erroPermissao) {
        if (erroPermissao.nwCodigo === "SEM_PERMISSAO") return resultado;
        throw erroPermissao;
    }
    var permitidos = nwIntersecaoEstabelecimentos(permitidosConsulta, permitidosComando);
    var autorizados = [];
    for (var a = 0; a < candidatos.length; a++)
        if (nwPermiteEstabelecimento(permitidos, candidatos[a].codEstabel)) autorizados.push(candidatos[a]);
    candidatos = autorizados;
    var executadas = {}, total = 0;
    while (candidatos.length) {
        for (var i = 0; i < candidatos.length; i++) {
            var reserva = candidatos[i];
            if (!nwPermiteEstabelecimento(permitidos, reserva.codEstabel)) continue;
            var chave = "op:" + reserva.codEstabel + ":" + reserva.idOperacao;
            if (nwTem(executadas, chave))
                nwFalhar("ATUALIZACAO_RESERVA_PENDENTE", "A consulta ainda informa a reserva depois da tentativa de liberacao.");
            if (++total > NW_CONFIG.maxReconciliacoesConsulta)
                nwFalhar("ATUALIZACAO_RESERVA_PENDENTE", "Quantidade de operacoes acima do limite desta atualizacao.");
            executadas[chave] = true;
            var corpo = { codEstabel: reserva.codEstabel, idOperacao: reserva.idOperacao,
                versao: reserva.versao,
                justificativa: "Liberacao automatica de reserva apos exclusao comprovada do WT.",
                chaveIdempotente: "AUTO-WT-" + reserva.codEstabel + "-" + reserva.idOperacao + "-V" + reserva.versao,
                usuario: usuario, estabelecimentosPermitidos: permitidos };
            var pedido = { companyId: empresa, serviceCode: NW_CONFIG.serviceCode,
                endpoint: NW_CONFIG.base + "/operacoes/reservas/reconciliacao", method: "post",
                timeoutService: NW_CONFIG.timeoutSegundos,
                headers: { Accept: "application/json", "Content-Type": "application/json" },
                params: corpo, options: { encoding: "UTF-8", mediaType: "application/json" } };
            try {
                var liberacao = nwInvocarReserva(client, pedido, NW_ACOES.reconciliarReservaWt, corpo);
                if (liberacao.idOperacao !== reserva.idOperacao || liberacao.wt !== reserva.wt ||
                    liberacao.situacao !== "CANCELADA" || liberacao.versao !== reserva.versao + 1 ||
                    !nwIdPositivo(liberacao.idEvento) || !nwIdPositivo(liberacao.idRegistro) ||
                    !nwVersaoBag(liberacao.reservasLiberadas) || typeof liberacao.repeticao !== "boolean")
                    nwFalhar("RESPOSTA_INVALIDA", "A API nao confirmou a liberacao da reserva solicitada.");
            } catch (erroComando) {
                // Nova leitura nao repete o POST nem altera disponibilidade em memoria.
                try { nwInvocarReserva(client, consulta, regra, parametros); } catch (erroLeitura) { /* continua incerto */ }
                nwFalhar("ATUALIZACAO_RESERVA_PENDENTE", "Nao foi possivel confirmar a liberacao. Atualize a consulta antes de tentar novamente.");
            }
        }
        // A pagina e o cursor sao sempre os da API, inclusive quando o filtro muda apos liberar.
        resultado = nwInvocarReserva(client, consulta, regra, parametros);
        candidatos = nwCandidatosReserva(resultado, permitidosConsulta);
        autorizados = [];
        for (a = 0; a < candidatos.length; a++)
            if (nwPermiteEstabelecimento(permitidos, candidatos[a].codEstabel)) autorizados.push(candidatos[a]);
        candidatos = autorizados;
    }
    return resultado;
}

function nwLinha(ds, acao, status, r, cursor) {
    ds.addRow([acao, String(r.sucesso), nwTexto(r.codigoErro), nwTexto(r.mensagem), status,
        nwTem(r, "total") ? nwTexto(r.total) : "", nwTem(r, "temMais") ? String(r.temMais) : "",
        cursor, cursor ? nwTexto(r[cursor]) : "", nwTem(r, "repeticao") ? String(r.repeticao) : "", JSON.stringify(r)]);
}
function nwSessao(nome) { try { return nwTexto(getValue(nome)).replace(/^\s+|\s+$/g, ""); } catch (e) { return ""; } }
function nwMensagem(v) {
    if (typeof v !== "string" || /(?:cookie|authorization|bearer|acTk|rfTk|password|senha|stack|SOAPFaultException)/i.test(v)) return "A API recusou a operacao.";
    return v.substring(0, 300) || "A API recusou a operacao.";
}
function nwFalhar(codigo, mensagem) { var e = new Error(codigo); e.nwCodigo = codigo; e.nwMensagem = mensagem; throw e; }
function nwTexto(v) { return v === null || typeof v === "undefined" ? "" : String(v); }
function nwTem(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
function nwIndice(lista, v) { for (var i = 0; i < lista.length; i++) if (lista[i] === v) return i; return -1; }
function nwArray(v) { return Object.prototype.toString.call(v) === "[object Array]"; }
function nwObjeto(v) { return v !== null && Object.prototype.toString.call(v) === "[object Object]"; }
function nwIdPositivo(v) { return typeof v === "string" && /^[1-9][0-9]{0,9}$/.test(v) && Number(v) <= 2147483647; }
