// Ambiente dos testes locais: jsdom + bibliotecas reais nas versões do Fluig/CDN (jQuery 3.6.3, Tabulator 6.4.0,
// Select2 4.0.13) + markup do view.ftl + JS do widget.
// Contrato: o próprio dsNwEmbalagens.js (testes/dataset, igual ao GitHub; conferido por testar-contrato-github.cjs) roda num vm e
//   - valida todo PEDIDO do widget (nwParametros, regra do DefaultGroup-1, estabelecimentos da regra e escritasHabilitadas);
//   - valida toda RESPOSTA simulada de consulta paginada (nwValidarResposta), para o servidor local não fugir do que o Dataset aceita.
// Respostas: NÃO são gravadas do Fluig (este widget ainda não tem contrato rodado no TESTE). Vêm de um servidor em memória
// (servidorSimulado) com as regras que o widget espera: cursor proximoId, versão, chave idempotente, CONFLITO_VERSAO. Os campos das
// fotografias de comando seguem o que o widget confere (fotografiaParametroValida), não um retorno real visto no TESTE.
// Simulados só o que é do Fluig, da rede ou do layout: $.ajax (Deferred real do jQuery), FLUIGC.toast, FLUIGC.autocomplete
// (guarda o source e cria a cópia tt-hint; digitar/escolher fazem o papel do typeahead), SuperWidget (bindings locais), timers com
// atraso, <dialog> e as medidas dos elementos (jsdom não calcula layout).
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { JSDOM, VirtualConsole } = require("jsdom");

const raiz = path.join(__dirname, "..");
const NOME = "widget_nw_itensComCtrllDeEmb";
// NWI_FONTE_WIDGET: outro arquivo do widget (ex.: cópia com defeito plantado, para conferir que os testes pegam)
const caminhoWidget = process.env.NWI_FONTE_WIDGET || path.join(raiz, "src/main/webapp/resources/js", NOME + ".js");
const fonteWidget = fs.readFileSync(caminhoWidget, "utf8");
const fonteJquery = fs.readFileSync(require.resolve("jquery/dist/jquery.js"), "utf8");
const fonteTabulator = fs.readFileSync(require.resolve("tabulator-tables/dist/js/tabulator.js"), "utf8");
const fonteSelect2 = fs.readFileSync(require.resolve("select2/dist/js/select2.full.js"), "utf8");
const fonteSelect2PtBr = fs.readFileSync(require.resolve("select2/dist/js/i18n/pt-BR.js"), "utf8");
const markupView = fs
  .readFileSync(path.join(raiz, "src/main/resources/view.ftl"), "utf8")
  .replace(/<link\b[^>]*>/g, "")
  .replace(/<script\b(?![^>]*text\/template)[\s\S]*?<\/script>/g, "");

// ---------- Dataset real (dsNwEmbalagens.js) num vm ----------
const caminhoDataset = path.join(__dirname, "dataset/dsNwEmbalagens.js");
const fonteDataset = fs.readFileSync(caminhoDataset, "utf8");
const dataset = vm.createContext({});
vm.runInContext(fonteDataset, dataset);

// estabelecimentos liberados ao DefaultGroup-1 para a ação (união das regras que a citam)
function estabelecimentosDaAcao(acao) {
  const lista = [];
  for (const r of dataset.NW_CONFIG.regras) if (r.grupo === "DefaultGroup-1" && r.acoes.indexOf(acao) >= 0) for (const e of r.estabelecimentos) if (lista.indexOf(e) < 0) lista.push(e);
  return lista;
}

// { recusa: "" | código (mensagem), parametros: como o Dataset os repassa }
function conferirPedido(acao, parametros) {
  const { NW_ACOES, NW_CONFIG } = dataset;
  if (!Object.prototype.hasOwnProperty.call(NW_ACOES, acao)) return { recusa: "ACAO_INVALIDA" };
  const regra = NW_ACOES[acao];
  if (!NW_CONFIG.regras.some((r) => r.grupo === "DefaultGroup-1" && r.acoes.indexOf(acao) >= 0)) return { recusa: "SEM_PERMISSAO (DefaultGroup-1)" };
  try {
    const validados = dataset.nwParametros(JSON.stringify(parametros), regra);
    if (regra.estabel) dataset.nwConferirEstabelecimentos(validados, estabelecimentosDaAcao(acao));
    if (regra.metodo !== "get" && NW_CONFIG.escritasHabilitadas.indexOf(acao) < 0) return { recusa: "ESCRITA_DESABILITADA" };
    return { recusa: "", parametros: JSON.parse(JSON.stringify(validados)) };
  } catch (erro) {
    if (erro && erro.nwCodigo) return { recusa: erro.nwCodigo + " (" + erro.nwMensagem + ")" };
    throw erro;
  }
}
const recusaDoDataset = (acao, parametros) => conferirPedido(acao, parametros).recusa;

// "" se o Dataset aceitaria a resposta da API; senão o código com que ele a trocaria
function recusaDaResposta(acao, resultado, parametrosValidados) {
  try {
    dataset.nwValidarResposta(JSON.parse(JSON.stringify(resultado)), dataset.NW_ACOES[acao], parametrosValidados);
    return "";
  } catch (erro) {
    if (erro && erro.nwCodigo) return erro.nwCodigo + " (" + erro.nwMensagem + ")";
    throw erro;
  }
}

const copia = (v) => JSON.parse(JSON.stringify(v));
// deepEqual que aceita valores do jsdom (outro realm: Array/Object da janela têm outro protótipo)
const igual = (atual, esperado, mensagem) => require("node:assert/strict").deepEqual(atual === undefined ? atual : copia(atual), esperado, mensagem);

// ---------- Dados de teste (fictícios; estabelecimentos = os liberados ao DefaultGroup-1 no Dataset) ----------
const ESTABELECIMENTOS = [
  { codigo: "10904", descricao: "Estabelecimento Teste A" },
  { codigo: "11301", descricao: "Estabelecimento Teste B" },
];
const ITENS = [
  { codigo: "IT-0001", descricao: "Item teste um", un: "KG" },
  { codigo: "IT-0002", descricao: "Item teste dois", un: "UN" },
  { codigo: "IT-0003", descricao: "Item teste tres", un: "L" },
  { codigo: "IT-9000", descricao: "Item novo sem parametro", un: "KG" },
];
const TIPOS = [
  { codigo: "CX01", descricao: "Caixa teste", ativo: true },
  { codigo: "SC02", descricao: "Saco teste", ativo: true },
  { codigo: "TB03", descricao: "Tambor inativo", ativo: false },
];

// parâmetros: estabelecimento alternado, item em rodízio, tipo em rodízio; ids crescentes a partir de 1
function parametrosIniciais(quantidade) {
  const lista = [];
  for (let i = 1; i <= quantidade; i++) {
    const est = ESTABELECIMENTOS[i % 2], item = ITENS[i % 3], tipo = TIPOS[i % 3];
    lista.push({
      idParam: i, codEstabel: est.codigo, item: item.codigo, unidade: item.un, codTipo: tipo.codigo,
      capacidade: Number((i * 1.25).toFixed(4)), ativo: i % 5 !== 0, versao: 1,
      // a cada 7 sem descrições: a tela mostra só o código
      descricoes: i % 7 !== 0,
    });
  }
  return lista;
}

// "Datasul" em memória com as regras que o widget espera
function servidorSimulado(opcoes = {}) {
  const servidor = {
    parametros: parametrosIniciais(opcoes.quantidade === undefined ? 230 : opcoes.quantidade),
    proximoIdParam: 0,
    comandos: new Map(), // chaveIdempotente → resposta
    respostasForaDoContrato: [],
  };
  servidor.proximoIdParam = servidor.parametros.length + 1;

  const descricao = (lista, codigo) => (lista.find((x) => x.codigo === codigo) || {}).descricao || "";
  const linha = (p) => {
    const r = { idParam: p.idParam, codEstabel: p.codEstabel, item: p.item, unidade: p.unidade, codTipo: p.codTipo, capacidade: p.capacidade, ativo: p.ativo, versao: p.versao };
    if (p.descricoes) Object.assign(r, { descricaoEstabelecimento: descricao(ESTABELECIMENTOS, p.codEstabel), descricaoItem: descricao(ITENS, p.item), descricaoTipo: descricao(TIPOS, p.codTipo) });
    return r;
  };
  const fotografia = (p, excluido) => Object.assign(linha(p), { excluido: !!excluido });
  const pagina = (todos, limite, cursor, chave) => {
    const dados = todos.slice(0, limite);
    const r = { sucesso: true, dados, total: dados.length, temMais: todos.length > limite };
    if (r.temMais) r[chave] = cursor(dados[dados.length - 1]);
    return r;
  };
  const contem = (texto, termo) => String(texto).toUpperCase().indexOf(String(termo).toUpperCase()) >= 0;
  const apoio = (lista, p) => pagina(lista.filter((x) => contem(x.codigo, p.filtro) || contem(x.descricao, p.filtro)).map((x) => {
    const r = { codigo: x.codigo, descricao: x.descricao };
    if (x.un) r.un = x.un;
    return r;
  }), Number(p.limite), (x) => x.codigo, "proximoCodigo");

  const acoes = {
    consultarParametros(p) {
      const filtrados = servidor.parametros
        .filter((x) => !p.estabelDe || x.codEstabel >= p.estabelDe)
        .filter((x) => !p.estabelAte || x.codEstabel <= p.estabelAte)
        .filter((x) => !p.itemDe || x.item >= p.itemDe)
        .filter((x) => !p.itemAte || x.item <= p.itemAte)
        .filter((x) => !p.codTipo || x.codTipo === p.codTipo)
        .filter((x) => p.ativo === undefined || x.ativo === (p.ativo === true || p.ativo === "true"))
        .filter((x) => !p.aposId || x.idParam > Number(p.aposId))
        .sort((a, b) => a.idParam - b.idParam)
        .map(linha);
      return pagina(filtrados, Number(p.limite), (x) => String(x.idParam), "proximoId");
    },
    apoiarEstabelecimentos: (p) => apoio(ESTABELECIMENTOS, p),
    apoiarItens: (p) => apoio(ITENS, p),
    consultarTiposApoio: (p) => apoio(TIPOS.filter((t) => p.ativo === "todos" || t.ativo === (p.ativo === true || p.ativo === "true")), p),
    incluirParametro(p) {
      const novo = { idParam: servidor.proximoIdParam++, codEstabel: p.codEstabel, item: p.item, unidade: p.unidade, codTipo: p.codTipo, capacidade: p.capacidade, ativo: p.ativo, versao: 1, descricoes: false };
      servidor.parametros.push(novo);
      return Object.assign({ sucesso: true, repeticao: false }, fotografia(novo));
    },
    alterarParametro(p) {
      const atual = servidor.parametros.find((x) => x.idParam === p.idParam);
      if (!atual) return { sucesso: false, codigoErro: "PARAMETRO_NAO_ENCONTRADO", mensagem: "Parametro nao encontrado." };
      if (atual.versao !== p.versao) return { sucesso: false, codigoErro: "CONFLITO_VERSAO", mensagem: "Versao divergente." };
      if (p.acao === "EXCLUIR") {
        servidor.parametros.splice(servidor.parametros.indexOf(atual), 1);
        return Object.assign({ sucesso: true, repeticao: false }, fotografia(Object.assign({}, atual, { versao: atual.versao + 1 }), true));
      }
      if (p.acao === "INATIVAR") atual.ativo = false;
      else Object.assign(atual, { codTipo: p.codTipo, capacidade: p.capacidade, ativo: p.ativo });
      atual.versao++;
      atual.descricoes = false;
      return Object.assign({ sucesso: true, repeticao: false }, fotografia(atual));
    },
  };

  // validados = parâmetros como o Dataset os repassa (limite padrão etc.)
  servidor.responder = (acao, validados) => {
    if (!acoes[acao]) return null;
    const ehEscrita = dataset.NW_ACOES[acao].metodo !== "get";
    if (ehEscrita && servidor.comandos.has(validados.chaveIdempotente)) return Object.assign(copia(servidor.comandos.get(validados.chaveIdempotente)), { repeticao: true });
    const resposta = acoes[acao](copia(validados));
    if (ehEscrita && resposta.sucesso) servidor.comandos.set(validados.chaveIdempotente, resposta);
    const recusa = recusaDaResposta(acao, resposta, validados);
    if (recusa) servidor.respostasForaDoContrato.push({ acao, validados, recusa });
    return copia(resposta);
  };
  servidor.buscar = (idParam) => servidor.parametros.find((x) => x.idParam === idParam);
  return servidor;
}

async function pausa(vezes = 10) {
  for (let i = 0; i < vezes; i++) await new Promise((resolve) => setTimeout(resolve, 0));
}

function prepararDialog(window) {
  const prototipo = (window.HTMLDialogElement || window.HTMLElement).prototype;
  // o close do navegador chega em outra tarefa (o widget conta com isso)
  prototipo.showModal = function () { this.setAttribute("open", ""); };
  prototipo.close = function () {
    if (!this.hasAttribute("open")) return;
    this.removeAttribute("open");
    window.setTimeout(() => this.dispatchEvent(new window.Event("close")), 0);
  };
  Object.defineProperty(prototipo, "open", {
    configurable: true,
    get() { return this.hasAttribute("open"); },
    set(valor) { if (valor) this.setAttribute("open", ""); else this.removeAttribute("open"); },
  });
}

// jsdom não calcula layout: alturas e larguras fixas para o Tabulator montar as linhas.
// Elemento dentro de [hidden] ou de display:none inline mede 0 (o :visible do jQuery depende disso).
function prepararMedidas(window) {
  const prototipo = window.HTMLElement.prototype;
  const escondido = (el) => !el.isConnected || !!el.closest("[hidden]") || !!el.closest('[style*="display: none"]');
  const altura = function () { return escondido(this) ? 0 : this.classList.contains("tabulator-tableholder") ? 560 : 30; };
  for (const nome of ["clientHeight", "offsetHeight", "scrollHeight"]) Object.defineProperty(prototipo, nome, { configurable: true, get: altura });
  for (const nome of ["clientWidth", "offsetWidth", "scrollWidth"]) Object.defineProperty(prototipo, nome, { configurable: true, get() { return escondido(this) ? 0 : 1200; } });
  Object.defineProperty(prototipo, "offsetParent", {
    configurable: true,
    get() { return escondido(this) ? null : this.parentElement || null; },
  });
  window.Element.prototype.getClientRects = function () {
    return escondido(this) ? [] : [{ top: 0, left: 0, width: 1200, height: 30 }];
  };
  // o jsdom ignora a escrita em scrollLeft: guarda o valor (rolagem horizontal do cabeçalho fixo)
  const rolagem = new WeakMap();
  Object.defineProperty(window.Element.prototype, "scrollLeft", {
    configurable: true,
    get() { return rolagem.get(this) || 0; },
    set(valor) { rolagem.set(this, Number(valor) || 0); },
  });
}

// timers com atraso ficam guardados e só rodam em disparar(); atraso 0 roda normal
function prepararTimers(window, temporizadores) {
  const definirReal = window.setTimeout.bind(window);
  const limparReal = window.clearTimeout.bind(window);
  let sequencia = 0;
  window.setTimeout = (funcao, atraso, ...argumentos) => {
    if (!atraso) return definirReal(funcao, 0, ...argumentos);
    const id = "temporizador-" + ++sequencia;
    temporizadores.set(id, { funcao, atraso, argumentos });
    return id;
  };
  window.clearTimeout = (id) => { if (!temporizadores.delete(id)) limparReal(id); };
}

function prepararAjax($, requisicoes, violacoes, servidor, scripts) {
  $.ajax = (opcoes) => {
    const adiado = $.Deferred();
    // carregamento do Tabulator pelo CDN (só quando o teste não pôs o Tabulator antes)
    if (opcoes.dataType === "script") {
      const requisicao = adiado.promise({ opcoes, falhar() { adiado.reject(requisicao, "error", ""); }, carregar() { adiado.resolve("", "success", requisicao); } });
      scripts.push(requisicao);
      return requisicao;
    }
    const corpo = JSON.parse(opcoes.data);
    const acao = corpo.filterFields[1];
    const parametros = JSON.parse(corpo.filterFields[3]);
    const pedido = conferirPedido(acao, parametros);
    if (pedido.recusa) violacoes.push({ acao, parametros, recusa: pedido.recusa });
    const requisicao = adiado.promise({
      opcoes, corpo, acao, parametros, recusa: pedido.recusa, abortado: false, respondida: false,
      abort() { if (!requisicao.respondida) { requisicao.abortado = true; adiado.reject(requisicao, "abort", "abort"); } return requisicao; },
      // resultado = o JSON da API (o que vai em resultadoJson); a linha do Dataset é montada aqui, igual ao nwLinha
      responder(resultado) {
        if (requisicao.respondida || requisicao.abortado) return;
        requisicao.respondida = true;
        const cursor = (dataset.NW_ACOES[acao] || {}).cursor || "";
        adiado.resolve({ content: [{
          acao, sucesso: String(resultado.sucesso), codigoErro: resultado.codigoErro || "", mensagem: resultado.mensagem || "", httpStatus: "200",
          total: "total" in resultado ? String(resultado.total) : "", temMais: "temMais" in resultado ? String(resultado.temMais) : "",
          campoCursor: cursor, proximoCursor: cursor ? String(resultado[cursor] || "") : "", repeticao: "repeticao" in resultado ? String(resultado.repeticao) : "",
          resultadoJson: JSON.stringify(resultado),
        }] }, "success", requisicao);
      },
      // corpo HTTP inteiro (para testar envelope quebrado)
      responderBruto(corpoHttp) { requisicao.respondida = true; adiado.resolve(corpoHttp, "success", requisicao); },
      falhar(status = 500, textStatus = "error") { requisicao.respondida = true; requisicao.status = status; adiado.reject(requisicao, textStatus, ""); },
    });
    requisicoes.push(requisicao);
    // resposta automática, em outra tarefa como na rede. Pedido que o Dataset recusaria volta como o Dataset devolveria.
    if (servidor.ativo) {
      const interceptada = servidor.interceptar && servidor.interceptar(acao, parametros, requisicao);
      if (interceptada === false) return requisicao; // o teste responde depois
      const codigo = pedido.recusa ? pedido.recusa.split(" ")[0] : "";
      const resposta = interceptada || (pedido.recusa ? { sucesso: false, codigoErro: codigo, mensagem: pedido.recusa } : servidor.responder(acao, pedido.parametros));
      if (resposta) setImmediate(() => requisicao.responder(resposta));
    }
    return requisicao;
  };
}

// opcoes: { servidor: false } desliga as respostas automáticas (o teste responde com atender);
// { tabulator: false } deixa o Tabulator para o "CDN" (amb.scripts); { quantidade: n } parâmetros iniciais; { instanceId }
function ambiente(opcoes = {}) {
  const mensagensConsole = [];
  const consoleVirtual = new VirtualConsole();
  for (const nivel of ["warn", "error"]) consoleVirtual.on(nivel, (...partes) => mensagensConsole.push({ nivel, texto: partes.map(String).join(" ") }));
  consoleVirtual.on("jsdomError", (erro) => mensagensConsole.push({ nivel: "jsdomError", texto: String(erro && erro.message) }));
  const dom = new JSDOM('<!doctype html><html><head></head><body><div id="toaster"></div></body></html>', {
    url: "http://fluig-web-teste.brancoperes.com.br:8190/portal/p/1/itens_controlados",
    runScripts: "outside-only",
    pretendToBeVisual: true,
    virtualConsole: consoleVirtual,
  });
  const { window } = dom;
  const requisicoes = [], violacoes = [], temporizadores = new Map(), toasts = [], scripts = [];
  const servidor = Object.assign(servidorSimulado(opcoes), { ativo: opcoes.servidor !== false });
  prepararDialog(window);
  prepararMedidas(window);
  prepararTimers(window, temporizadores);
  window.eval(fonteJquery);
  const $ = window.jQuery;
  $.fx.off = true;
  prepararAjax($, requisicoes, violacoes, servidor, scripts);
  const carregarTabulator = () => window.eval(fonteTabulator);
  if (opcoes.tabulator !== false) carregarTabulator();
  window.eval(fonteSelect2);
  window.eval(fonteSelect2PtBr);

  const autocompletes = new Map();
  window.FLUIGC = {
    toast(parametros) {
      toasts.push(parametros);
      $("<div>", { class: "alert alert-" + parametros.type, text: parametros.message }).appendTo("#toaster");
    },
    // como o typeahead do Fluig: o campo vira tt-input e ganha, ANTES dele, uma cópia tt-hint (readonly, sem id/name, com os
    // mesmos data-*). destroy() desfaz (o widget recria os autocompletes do modal a cada abertura)
    autocomplete($campo, configuracao) {
      const $hint = $("<input>", { type: "text", readonly: true, tabindex: -1, class: ($campo.attr("class") || "") + " tt-hint" })
        .attr(Object.fromEntries([...$campo[0].attributes].filter((a) => /^data-/.test(a.name)).map((a) => [a.name, a.value])))
        .insertBefore($campo);
      $campo.addClass("tt-input");
      const registro = { configuracao, sugestoes: null, destruido: false, fechado: 0 };
      autocompletes.set($campo[0], registro);
      return {
        // como o do Fluig 1.8.1: valor vazio (falsy) só lê; para limpar é preciso typeahead("val", "")
        val(v) { if (v) { $campo.val(v); return this; } return $campo.val(); },
        close() { registro.fechado++; },
        destroy() { registro.destruido = true; $hint.remove(); $campo.removeClass("tt-input"); autocompletes.delete($campo[0]); },
      };
    },
  };
  // plugin do typeahead que o Fluig registra no jQuery da página: aqui só o "val"
  $.fn.typeahead = function (metodo, valor) {
    if (metodo !== "val") throw new Error("typeahead simulado só tem val");
    if (arguments.length < 2) return this.val();
    return this.val(valor);
  };
  window.SuperWidget = { extend: (definicao) => definicao };
  window.eval(fonteWidget);

  // monta uma instância como o Fluig: markup do view.ftl com o instanceId + bindings locais do SuperWidget
  function montarInstancia(instanceId) {
    const $raiz = $(markupView.replace(/\$\{instanceId\}/g, instanceId)).filter(".nwi").appendTo(window.document.body);
    const widget = Object.assign({}, window[NOME], { instanceId, DOM: $raiz });
    for (const [chave, lista] of Object.entries(widget.bindings.local))
      for (const item of lista) {
        const [evento, metodo] = item.split("_");
        $raiz.on(evento, "[data-" + chave + "]", function (ev) { return widget[metodo](this, ev); });
      }
    return { $raiz, widget };
  }
  const { $raiz, widget } = montarInstancia(opcoes.instanceId || 1);

  function pendentes(acao) {
    return requisicoes.filter((r) => !r.respondida && !r.abortado && (!acao || r.acao === acao));
  }
  // responde a requisição pendente (a mais antiga) da ação; sem pendente da ação, o teste falha
  function atender(acao, resultado) {
    const requisicao = pendentes(acao)[0];
    if (!requisicao) throw new Error("nenhuma requisição pendente de " + acao + " (pendentes: " + pendentes().map((r) => r.acao).join(", ") + ")");
    requisicao.responder(resultado);
    return requisicao;
  }
  function disparar(atraso) {
    const agendados = [...temporizadores.entries()].filter(([, t]) => atraso === undefined || t.atraso === atraso);
    for (const [id] of agendados) temporizadores.delete(id);
    for (const [, t] of agendados) t.funcao(...t.argumentos);
    return agendados.length;
  }
  async function esperar(condicao, descricao = "condição", voltas = 3000) {
    for (let i = 0; i < voltas; i++) {
      if (condicao()) return;
      await pausa(1);
    }
    throw new Error("esperou demais por: " + descricao + (pendentes().length ? "\n  pendentes: " + pendentes().map((r) => r.acao).join(", ") : ""));
  }
  // nada pendente e nada mais chegando
  async function ocioso(descricao = "fim das consultas") {
    await esperar(() => !pendentes().length, descricao);
    await pausa(30);
    await esperar(() => !pendentes().length, descricao);
  }

  // autocomplete: digita (o source consulta o apoio depois do atraso) e escolhe a sugestão
  const campo = (seletor) => $raiz.find(seletor).not(".tt-hint");
  async function digitar(seletor, termo) {
    const $campo = campo(seletor);
    const registro = autocompletes.get($campo[0]);
    if (!registro) throw new Error("sem autocomplete em " + seletor);
    registro.sugestoes = null;
    $campo.val(termo).trigger("input");
    registro.configuracao.source(termo, (sugestoes) => { registro.sugestoes = sugestoes; });
    disparar(250);
    disparar(350);
    await esperar(() => registro.sugestoes !== null, "sugestões de " + seletor);
    return registro.sugestoes;
  }
  async function escolher(seletor, termo, codigo) {
    const sugestoes = await digitar(seletor, termo);
    const item = sugestoes.find((s) => s.codigo === (codigo || termo));
    if (!item) throw new Error(seletor + ": " + (codigo || termo) + " não veio nas sugestões: " + sugestoes.map((s) => s.codigo).join(", "));
    campo(seletor).trigger($.Event("fluig.autocomplete.selected", { item }));
    return item;
  }

  const tabela = () => widget.tabela;
  // linhas desenhadas da tabela principal: campo → texto
  const celulas = () =>
    [...$raiz.find("[data-tabela] > .tabulator-tableholder .tabulator-row")].map((linha) => {
      const resultado = {};
      $(linha).children(".tabulator-cell").each(function () { resultado[$(this).attr("tabulator-field") || "acoes"] = $(this).text().trim(); });
      resultado.botoes = [...$(linha).find("[data-acao]").map((i, b) => b.getAttribute("data-acao")).get()];
      return resultado;
    });
  const linhaDoId = (idParam) => tabela().getRow(idParam);
  // clica num botão de ação da linha (a linha precisa estar na página atual)
  function clicarAcao(idParam, acao) {
    const linha = linhaDoId(idParam);
    if (!linha) throw new Error("parâmetro " + idParam + " fora da tabela");
    const $botao = $(linha.getElement()).find('[data-acao="' + acao + '"]').first();
    if (!$botao.length) throw new Error("parâmetro " + idParam + " sem o botão " + acao + " (linha fora da página?)");
    $botao[0].dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  }
  const ultimoToast = () => toasts.at(-1);
  const contador = () => $raiz.find(".tabulator-page-counter").text().trim();
  const textoAlerta = () => $raiz.find("[data-tabela] .tabulator-alert").text().trim();
  const ultimaRequisicao = (acao) => requisicoes.filter((r) => r.acao === acao).at(-1);

  const amb = {
    dom, window, $, $raiz, widget, requisicoes, violacoes, temporizadores, toasts, scripts, mensagensConsole, servidor, autocompletes,
    pendentes, atender, disparar, esperar, ocioso, digitar, escolher, campo, tabela, celulas, linhaDoId, clicarAcao, ultimoToast,
    contador, textoAlerta, ultimaRequisicao, montarInstancia, carregarTabulator,
    // dispara o init como o Fluig (a carga sai sozinha no tableBuilt)
    async iniciar() {
      widget.init();
      if (servidor.ativo && opcoes.tabulator !== false) {
        await esperar(() => widget.tabela && widget.tabela.initialized, "tabela construída");
        await ocioso("carga inicial");
        await esperar(() => !$raiz.find("[data-buscar]").prop("disabled"), "fim da carga inicial");
      }
      return amb;
    },
    // fim do teste: nenhum pedido que o Dataset recusaria, nenhuma resposta simulada fora do contrato, nenhum erro do jsdom
    conferirContrato() {
      if (violacoes.length) throw new Error("pedidos que o Dataset recusaria:\n  " + violacoes.map((v) => v.acao + " " + JSON.stringify(v.parametros) + " → " + v.recusa).join("\n  "));
      if (servidor.respostasForaDoContrato.length) throw new Error("respostas simuladas fora do contrato do Dataset: " + JSON.stringify(servidor.respostasForaDoContrato));
      const erros = mensagensConsole.filter((m) => m.nivel === "jsdomError");
      if (erros.length) throw new Error("erros no jsdom: " + erros.map((m) => m.texto).join(" | "));
    },
  };
  return amb;
}

function criarSuite(nome) {
  let cenarios = 0;
  async function teste(descricao, funcao) {
    try { await funcao(); cenarios++; }
    catch (erro) { erro.message = descricao + ": " + erro.message; throw erro; }
  }
  function concluir() {
    console.log(nome + "|CENARIOS=" + cenarios + "|FALHAS=0|RESPOSTAS=simuladas");
  }
  return { teste, concluir };
}
function executarSuite(principal) {
  principal().then(() => process.exit(process.exitCode || 0), (erro) => { console.error(erro); process.exit(1); });
}

module.exports = {
  ambiente, pausa, copia, igual, conferirPedido, recusaDoDataset, recusaDaResposta, dataset, fonteDataset, caminhoDataset, fonteWidget,
  estabelecimentosDaAcao, ESTABELECIMENTOS, ITENS, TIPOS, criarSuite, executarSuite,
};
