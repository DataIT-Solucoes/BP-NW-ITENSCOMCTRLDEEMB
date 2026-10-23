// chamarEmbalagens/extrairEnvelope (privados do widget), vistos pela carga da tabela: formato do pedido, envelope quebrado,
// HTTP, recusa do Dataset, cursor inválido, cancelamento de carga velha e o carregamento do Tabulator pelo CDN.
const assert = require("node:assert/strict");
const { ambiente, pausa, igual, criarSuite, executarSuite } = require("./ambiente.cjs");

// widget iniciado sem respostas automáticas: a 1ª página da carga fica pendente
async function semServidor(opcoes = {}) {
  const amb = ambiente(Object.assign({ servidor: false }, opcoes));
  amb.widget.init();
  await amb.esperar(() => amb.pendentes("consultarParametros").length === 1, "1ª página da carga");
  return amb;
}
const botoesTravados = (amb) => amb.$raiz.find("[data-buscar]").prop("disabled") && amb.$raiz.find("[data-novo]").prop("disabled");

async function erroDaCarga(amb, mensagem) {
  await amb.esperar(() => amb.textoAlerta().indexOf(mensagem) >= 0, "mensagem na tabela: " + mensagem + " (veio: " + amb.textoAlerta() + ")");
  assert.equal(amb.textoAlerta(), mensagem + " Clique em Buscar para tentar de novo.");
  assert.ok(!botoesTravados(amb), "Buscar/Novo continuam travados depois do erro");
  assert.ok(amb.mensagensConsole.some((m) => m.nivel === "error" && m.texto === "[itensControlados] " + mensagem), "sem console.error da falha");
  assert.equal(amb.widget.cargaFalhou, true);
}

executarSuite(async () => {
  const { teste, concluir } = criarSuite("transporte-dataset");

  await teste("pedido: POST JSON no dataset search com acao e parametros nos filterFields", async () => {
    const amb = await semServidor();
    const r = amb.pendentes()[0];
    assert.equal(r.opcoes.url, "/api/public/ecm/dataset/search");
    assert.equal(r.opcoes.type, "POST");
    assert.equal(r.opcoes.contentType, "application/json");
    assert.equal(r.opcoes.dataType, "json");
    igual(r.corpo, { datasetId: "dsNwEmbalagens", filterFields: ["acao", "consultarParametros", "parametros", '{"limite":100}'], resultFields: [], limit: "1", orderBy: "" });
    assert.ok(botoesTravados(amb), "Buscar e Novo deveriam ficar desabilitados durante a carga");
    assert.ok(amb.$raiz.find("[data-tabela] .tabulator-alert .nwi-loader").length, "sem spinner durante a carga");
    amb.conferirContrato();
  });

  const quebrados = [
    ["sem linha", { content: [] }, "Dataset fora do contrato de uma linha de envelope."],
    ["duas linhas", { content: [{}, {}] }, "Dataset fora do contrato de uma linha de envelope."],
    ["sem content", {}, "Dataset fora do contrato de uma linha de envelope."],
    ["ação divergente", { content: [{ acao: "consultarTipos", resultadoJson: '{"sucesso":true}' }] }, "Ação da resposta divergente."],
    ["resultadoJson inválido", { content: [{ acao: "consultarParametros", resultadoJson: "{quebrado" }] }, "Envelope JSON do Dataset inválido."],
    ["sucesso em texto", { content: [{ acao: "consultarParametros", resultadoJson: '{"sucesso":"true"}' }] }, "Resultado funcional do Dataset inválido."],
  ];
  for (const [nome, corpo, mensagem] of quebrados)
    await teste("envelope quebrado (" + nome + ") vira erro na tabela", async () => {
      const amb = await semServidor();
      amb.pendentes()[0].responderBruto(corpo);
      await erroDaCarga(amb, mensagem);
    });

  await teste("falha HTTP vira erro na tabela com o status", async () => {
    const amb = await semServidor();
    amb.pendentes()[0].falhar(500);
    await erroDaCarga(amb, "Falha HTTP 500 no transporte Fluig.");
  });

  await teste("recusa do Dataset: texto próprio (SEM_PERMISSAO), mensagem do backend ou texto padrão", async () => {
    let amb = await semServidor();
    amb.atender("consultarParametros", { sucesso: false, codigoErro: "SEM_PERMISSAO", mensagem: "Estabelecimento nao autorizado." });
    await erroDaCarga(amb, "Você não tem permissão para esta ação.");
    amb = await semServidor();
    amb.atender("consultarParametros", { sucesso: false, codigoErro: "HTTP_502", mensagem: "A API respondeu HTTP 502." });
    await erroDaCarga(amb, "A API respondeu HTTP 502.");
    amb = await semServidor();
    amb.atender("consultarParametros", { sucesso: false, codigoErro: "FALHA_CHAMADA" });
    await erroDaCarga(amb, "Não foi possível consultar os itens controlados.");
  });

  await teste("cursor repetido ou vazio interrompe a carga (não fica em laço)", async () => {
    let amb = await semServidor();
    const linha = (id) => ({ idParam: id, codEstabel: "10904", item: "IT-0001", unidade: "KG", codTipo: "CX01", capacidade: 1, ativo: true, versao: 1 });
    amb.atender("consultarParametros", { sucesso: true, dados: [linha(1)], total: 1, temMais: true, proximoId: "1" });
    await amb.esperar(() => amb.pendentes("consultarParametros").length === 1, "2ª página");
    assert.equal(amb.pendentes()[0].parametros.aposId, "1");
    amb.atender("consultarParametros", { sucesso: true, dados: [linha(2)], total: 1, temMais: true, proximoId: "1" });
    await erroDaCarga(amb, "A consulta devolveu um cursor inválido.");
    assert.equal(amb.tabela().getDataCount(), 0, "linhas parciais não podem ficar na tabela");

    amb = await semServidor();
    amb.atender("consultarParametros", { sucesso: true, dados: [linha(1)], total: 1, temMais: true });
    await erroDaCarga(amb, "A consulta devolveu um cursor inválido.");
  });

  await teste("só mostra a tabela depois da última página", async () => {
    const amb = await semServidor();
    const linha = (id) => ({ idParam: id, codEstabel: "10904", item: "IT-000" + id, unidade: "KG", codTipo: "CX01", capacidade: id, ativo: true, versao: 1 });
    amb.atender("consultarParametros", { sucesso: true, dados: [linha(1), linha(2)], total: 2, temMais: true, proximoId: "2" });
    await amb.esperar(() => amb.pendentes("consultarParametros").length === 1, "2ª página");
    assert.equal(amb.tabela().getDataCount(), 0, "1ª página apareceu antes do fim da carga");
    amb.atender("consultarParametros", { sucesso: true, dados: [linha(3)], total: 1, temMais: false });
    await amb.esperar(() => !botoesTravados(amb), "fim da carga");
    assert.equal(amb.tabela().getDataCount(), 3);
    assert.equal(amb.contador(), "Mostrando 1–3 de 3");
    assert.equal(amb.$raiz.find("[data-tabela] .tabulator-alert").length, 0, "alerta da carga continua na tabela");
  });

  await teste("Buscar durante a carga cancela a anterior e ignora a resposta velha", async () => {
    const amb = await semServidor();
    const primeira = amb.pendentes()[0];
    // Buscar está travado na tela; a carga nova vem de outra origem (ex.: CONFLITO_VERSAO): chamada direta
    amb.widget.carregarParametros({ parametros: { ativo: true } });
    assert.equal(primeira.abortado, true, "a 1ª carga deveria ser abortada");
    const segunda = amb.pendentes("consultarParametros")[0];
    igual(segunda.parametros, { limite: 100, ativo: true });
    segunda.responder({ sucesso: true, dados: [{ idParam: 9, codEstabel: "10904", item: "IT-0009", unidade: "KG", codTipo: "CX01", capacidade: 2, ativo: true, versao: 1 }], total: 1, temMais: false });
    await amb.esperar(() => amb.tabela().getDataCount() === 1, "carga nova");
    primeira.responder({ sucesso: true, dados: [], total: 0, temMais: false });
    await pausa(20);
    assert.equal(amb.tabela().getDataCount(), 1, "resposta velha substituiu a nova");
    assert.equal(amb.textoAlerta(), "", "a resposta abortada não pode virar erro na tabela");
  });

  await teste("Tabulator pelo CDN: carregado uma vez para duas instâncias; falha mostra aviso e libera os botões", async () => {
    let amb = ambiente({ tabulator: false, servidor: false });
    const outra = amb.montarInstancia(2);
    amb.widget.init();
    outra.widget.init();
    assert.equal(amb.scripts.length, 1, "o script do Tabulator foi pedido mais de uma vez");
    assert.equal(amb.scripts[0].opcoes.url, "https://cdnjs.cloudflare.com/ajax/libs/tabulator/6.4.0/js/tabulator.min.js");
    amb.carregarTabulator();
    amb.scripts[0].carregar();
    await amb.esperar(() => amb.pendentes("consultarParametros").length === 2, "carga das duas instâncias");

    amb = ambiente({ tabulator: false });
    amb.widget.init();
    amb.scripts[0].falhar();
    await amb.esperar(() => amb.$raiz.find(".nwi-tabela-erro").length === 1, "aviso de falha do CDN");
    assert.equal(amb.$raiz.find(".nwi-tabela-erro").text(), "Não foi possível carregar a tabela. Verifique a conexão com a internet e recarregue a página.");
    assert.ok(!botoesTravados(amb), "Buscar/Novo travados depois da falha do CDN");
  });

  concluir();
});
