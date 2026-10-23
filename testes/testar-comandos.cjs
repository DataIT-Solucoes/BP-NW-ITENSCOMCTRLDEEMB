// Comandos pela tela: Novo (validações, unidade do item, incluirParametro), Editar (estabelecimento/item imutáveis, ALTERAR),
// interruptor de Situação (INATIVAR/ALTERAR), Excluir (EXCLUIR), CONFLITO_VERSAO, resultado incerto (mesma chave na nova
// tentativa, repetição confirmada pelo servidor), recusas e trava dos modais durante a gravação.
const assert = require("node:assert/strict");
const { ambiente, pausa, igual, criarSuite, executarSuite } = require("./ambiente.cjs");

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function telaDeComandos(amb) {
  const $modal = amb.$raiz.find("[data-modal-cadastro]");
  const $excluir = amb.$raiz.find("[data-modal-excluir]");
  const campo = (nome) => amb.campo('[name="' + nome + '"]');
  const erro = (nome) => $modal.find('[data-erro="' + nome + '"]').text();
  const salvar = () => $modal.find('[type="submit"]')[0].click();
  const comandos = () => amb.requisicoes.filter((r) => r.acao === "incluirParametro" || r.acao === "alterarParametro");
  // linha na página atual (para clicar nos botões)
  const linhaVisivel = (filtro) => {
    const linha = amb.tabela().getRows("display").find((l) => !filtro || filtro(l.getData()));
    if (!linha) throw new Error("nenhuma linha visível para o filtro");
    return linha.getData();
  };
  async function abrirNovo() {
    amb.$raiz.find("[data-novo]").trigger("click");
    assert.equal($modal.prop("open"), true, "modal de cadastro não abriu");
  }
  async function preencherNovo({ est = "10904", item = "IT-9000", tipo = "CX01", capacidade = "1.2345" } = {}) {
    await abrirNovo();
    await amb.escolher('[name="estabelecimento"]', est);
    await amb.escolher('[name="item"]', item);
    await amb.escolher('[name="tipo"]', tipo.slice(0, 2), tipo);
    campo("capacidade").val(capacidade).trigger("input");
  }
  async function terminar() {
    await amb.ocioso();
    await pausa(10);
  }
  return { $modal, $excluir, campo, erro, salvar, comandos, linhaVisivel, abrirNovo, preencherNovo, terminar };
}

executarSuite(async () => {
  const { teste, concluir } = criarSuite("comandos");

  await teste("Novo: validações por campo, sem chamar o servidor", async () => {
    const amb = await ambiente({ quantidade: 3 }).iniciar();
    const t = telaDeComandos(amb);
    await t.abrirNovo();
    assert.equal(t.$modal.find("[data-modal-titulo]").text(), "Novo item controlado");
    assert.equal(t.$modal.find("[data-modal-salvar]").text(), "Criar parametrização");
    assert.ok(!t.campo("estabelecimento").prop("readonly") && !t.campo("item").prop("readonly"));
    t.salvar();
    igual([t.erro("estabelecimento"), t.erro("item"), t.erro("tipo"), t.erro("capacidade")],
      ["Selecione um estabelecimento da lista.", "Selecione um item da lista.", "Selecione um tipo de embalagem da lista.", "Informe uma capacidade válida."]);
    assert.equal(t.campo("estabelecimento").attr("aria-invalid"), "true");
    assert.equal(amb.window.document.activeElement, t.campo("estabelecimento")[0], "foco no 1º campo inválido");

    // texto digitado sem escolher na lista não vale
    t.campo("estabelecimento").val("10904").trigger("input");
    assert.equal(t.erro("estabelecimento"), "", "o erro some ao digitar");
    for (const [valor, mensagem] of [["0", "A capacidade deve ser maior que zero."], ["-1", "A capacidade deve ser maior que zero."], ["1.23456", "A capacidade deve ter até quatro casas decimais."], ["abc", "Informe uma capacidade válida."]]) {
      t.campo("capacidade").val(valor);
      t.salvar();
      assert.equal(t.erro("capacidade"), mensagem, "capacidade " + valor);
    }
    assert.equal(t.erro("estabelecimento"), "Selecione um estabelecimento da lista.");
    assert.equal(t.comandos().length, 0, "chamou o servidor com formulário inválido");
  });

  await teste("Novo: unidade vem do item (readonly) e some ao trocar o item; tipo do cadastro só ativos", async () => {
    const amb = await ambiente({ quantidade: 3 }).iniciar();
    const t = telaDeComandos(amb);
    await t.abrirNovo();
    assert.ok(t.campo("unidade").prop("readonly"));
    await amb.escolher('[name="estabelecimento"]', "10904");
    await amb.escolher('[name="item"]', "IT-0003");
    igual(amb.ultimaRequisicao("apoiarItens").parametros, { filtro: "IT-0003", limite: 20, codEstabel: "10904" });
    assert.equal(t.campo("unidade").val(), "L");
    t.campo("item").val("IT-00").trigger("input");
    assert.equal(t.campo("unidade").val(), "", "unidade ficou do item anterior");
    const tipos = await amb.digitar('[name="tipo"]', "te");
    igual(amb.ultimaRequisicao("consultarTiposApoio").parametros, { filtro: "te", ativo: true, limite: 20 });
    igual(tipos.map((s) => s.codigo), ["CX01", "SC02"], "tipo inativo apareceu no cadastro");
    // escolher no modal não vira badge (só nos filtros)
    await amb.escolher('[name="estabelecimento"]', "11301");
    assert.equal(t.$modal.find(".nwi-selecionado").length, 0);
  });

  await teste("Novo: incluirParametro com os parâmetros certos, trava durante a gravação, linha nova na tela", async () => {
    const amb = await ambiente({ quantidade: 25 }).iniciar();
    const t = telaDeComandos(amb);
    await t.preencherNovo();
    amb.servidor.interceptar = (acao) => (acao === "incluirParametro" ? false : undefined);
    t.salvar();
    const pedido = amb.pendentes("incluirParametro")[0];
    assert.match(pedido.parametros.chaveIdempotente, UUID_V4);
    igual(Object.assign({}, pedido.parametros, { chaveIdempotente: "" }),
      { idParam: 0, codEstabel: "10904", item: "IT-9000", codTipo: "CX01", capacidade: 1.2345, unidade: "KG", ativo: true, versao: 0, chaveIdempotente: "" });
    // trava
    assert.equal(t.$modal.find("[data-modal-salvar]").text(), "Criando...");
    assert.ok(t.campo("capacidade").prop("disabled") && t.$modal.find('[type="submit"]').prop("disabled") && t.$modal.find("[data-fechar-modal]").first().prop("disabled"));
    assert.equal(t.$modal.attr("aria-busy"), "true");
    const esc = new amb.window.Event("cancel", { cancelable: true });
    t.$modal[0].dispatchEvent(esc);
    assert.equal(esc.defaultPrevented, true, "Esc fechou o modal durante a gravação");
    t.$modal.trigger(amb.$.Event("click", { target: t.$modal[0] }));
    assert.equal(t.$modal.prop("open"), true, "clique no fundo fechou o modal durante a gravação");

    pedido.responder(amb.servidor.responder("incluirParametro", pedido.parametros));
    await t.terminar();
    assert.equal(t.$modal.prop("open"), false);
    igual(amb.ultimoToast(), { title: "", message: "Parâmetro criado.", type: "success" });
    const nova = amb.linhaDoId(26);
    assert.ok(nova, "linha criada não entrou na tabela");
    igual(nova.getData(), { id: 26, estCodigo: "10904", estDescricao: "Estabelecimento Teste A", itemCodigo: "IT-9000", itemDescricao: "Item novo sem parametro", unidade: "KG",
      tipoCodigo: "CX01", tipoDescricao: "Caixa teste", capacidade: 1.2345, ativo: true, versao: 1 });
    assert.ok(amb.tabela().getRows("display").indexOf(nova) >= 0, "a tela não foi para a página da linha criada");
    assert.equal(amb.tabela().getDataCount(), 26);
    // reabrir limpa o formulário
    await t.abrirNovo();
    igual([t.campo("estabelecimento").val(), t.campo("item").val(), t.campo("unidade").val(), t.campo("tipo").val(), t.campo("capacidade").val()], ["", "", "", "", ""]);
    assert.equal(t.$modal.find("[data-modal-salvar]").text(), "Criar parametrização");
    amb.conferirContrato();
  });

  await teste("Editar: estabelecimento e item travados e sem autocomplete; ALTERAR só com tipo e capacidade", async () => {
    const amb = await ambiente({ quantidade: 12 }).iniciar();
    const t = telaDeComandos(amb);
    const alvo = t.linhaVisivel((d) => d.ativo && d.estDescricao);
    amb.clicarAcao(alvo.id, "editar");
    assert.equal(t.$modal.prop("open"), true);
    assert.equal(t.$modal.find("[data-modal-titulo]").text(), "Editar item controlado");
    assert.equal(t.$modal.find("[data-modal-salvar]").text(), "Salvar alterações");
    assert.ok(t.campo("estabelecimento").prop("readonly") && t.campo("item").prop("readonly"));
    assert.ok(!amb.autocompletes.has(t.campo("estabelecimento")[0]) && !amb.autocompletes.has(t.campo("item")[0]), "campo imutável com autocomplete");
    igual([t.campo("estabelecimento").val(), t.campo("item").val(), t.campo("unidade").val(), t.campo("tipo").val(), Number(t.campo("capacidade").val())],
      [alvo.estCodigo + " — " + alvo.estDescricao, alvo.itemCodigo + " — " + alvo.itemDescricao, alvo.unidade, alvo.tipoCodigo + " — " + alvo.tipoDescricao, alvo.capacidade]);
    // digitar no campo travado não apaga a escolha
    t.campo("estabelecimento").trigger("input");
    assert.equal(t.campo("estabelecimento").data("codigo"), alvo.estCodigo);

    const novoTipo = alvo.tipoCodigo === "SC02" ? "CX01" : "SC02";
    await amb.escolher('[name="tipo"]', novoTipo.slice(0, 2), novoTipo);
    t.campo("capacidade").val("9.5");
    t.salvar();
    await t.terminar();
    const pedido = amb.ultimaRequisicao("alterarParametro").parametros;
    igual(Object.assign({}, pedido, { chaveIdempotente: "" }), {
      idParam: alvo.id, codEstabel: alvo.estCodigo, item: alvo.itemCodigo, codTipo: novoTipo, capacidade: 9.5, unidade: alvo.unidade,
      ativo: true, versao: 1, acao: "ALTERAR", chaveIdempotente: "" });
    assert.equal(t.$modal.prop("open"), false);
    assert.equal(amb.ultimoToast().message, "Parâmetro alterado.");
    const atualizado = amb.linhaDoId(alvo.id).getData();
    igual([atualizado.tipoCodigo, atualizado.tipoDescricao, atualizado.capacidade, atualizado.versao, atualizado.estDescricao],
      [novoTipo, novoTipo === "SC02" ? "Saco teste" : "Caixa teste", 9.5, 2, alvo.estDescricao], "linha não refletiu a fotografia (descrições mantidas)");
    assert.equal(amb.$(amb.linhaDoId(alvo.id).getElement()).find('[tabulator-field="capacidade"]').text(), "9,5000");

    // Novo depois de Editar: campos destravados e vazios
    await t.abrirNovo();
    assert.ok(!t.campo("estabelecimento").prop("readonly") && !t.campo("item").prop("readonly"));
    assert.equal(t.campo("estabelecimento").val(), "");
    amb.conferirContrato();
  });

  await teste("Situação: INATIVAR e ALTERAR(ativo) pelo interruptor, sem duplo clique", async () => {
    const amb = await ambiente({ quantidade: 12 }).iniciar();
    const t = telaDeComandos(amb);
    const alvo = t.linhaVisivel((d) => d.ativo);
    amb.servidor.interceptar = (acao) => (acao === "alterarParametro" ? false : undefined);
    amb.clicarAcao(alvo.id, "situacao");
    const $interruptor = () => amb.$(amb.linhaDoId(alvo.id).getElement()).find('[data-acao="situacao"]');
    assert.ok($interruptor().prop("disabled"), "interruptor livre durante a gravação");
    assert.equal($interruptor().attr("aria-busy"), "true");
    amb.widget.alterarSituacao(amb.linhaDoId(alvo.id), $interruptor());
    assert.equal(amb.pendentes("alterarParametro").length, 1, "duplo clique mandou dois comandos");
    const pedido = amb.pendentes("alterarParametro")[0];
    igual([pedido.parametros.acao, pedido.parametros.ativo, pedido.parametros.versao], ["INATIVAR", false, 1]);
    pedido.responder(amb.servidor.responder("alterarParametro", pedido.parametros));
    await t.terminar();
    assert.equal(amb.ultimoToast().message, "Parâmetro desativado.");
    assert.equal(amb.$(amb.linhaDoId(alvo.id).getElement()).find('[tabulator-field="ativo"]').text(), "Inativo");
    assert.equal($interruptor().attr("aria-checked"), "false");
    assert.ok(!$interruptor().prop("disabled"));

    amb.servidor.interceptar = null;
    amb.clicarAcao(alvo.id, "situacao");
    await t.terminar();
    const religar = amb.ultimaRequisicao("alterarParametro").parametros;
    igual([religar.acao, religar.ativo, religar.versao], ["ALTERAR", true, 2]);
    assert.equal(amb.ultimoToast().message, "Parâmetro ativado.");
    assert.equal(amb.linhaDoId(alvo.id).getData().ativo, true);
    amb.conferirContrato();
  });

  await teste("Excluir: confirmação com os dados da linha, EXCLUIR, linha some", async () => {
    const amb = await ambiente({ quantidade: 12 }).iniciar();
    const t = telaDeComandos(amb);
    const alvo = t.linhaVisivel((d) => d.estDescricao);
    amb.clicarAcao(alvo.id, "excluir");
    assert.equal(t.$excluir.prop("open"), true);
    igual(["estabelecimento", "item", "unidade", "tipo", "capacidade", "situacao"].map((c) => t.$excluir.find("[data-excluir-" + c + "]").text()),
      [alvo.estCodigo + " — " + alvo.estDescricao, alvo.itemCodigo + " — " + alvo.itemDescricao, alvo.unidade, alvo.tipoCodigo + " — " + alvo.tipoDescricao,
        alvo.capacidade.toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 }), alvo.ativo ? "Ativo" : "Inativo"]);
    amb.servidor.interceptar = (acao) => (acao === "alterarParametro" ? false : undefined);
    t.$excluir.find("[data-confirmar-excluir]").trigger("click");
    assert.equal(t.$excluir.find("[data-excluir-botao-texto]").text(), "Excluindo...");
    assert.ok(t.$excluir.find("[data-fechar-excluir]").prop("disabled"));
    const pedido = amb.pendentes("alterarParametro")[0];
    igual([pedido.parametros.acao, pedido.parametros.idParam, pedido.parametros.versao], ["EXCLUIR", alvo.id, 1]);
    pedido.responder(amb.servidor.responder("alterarParametro", pedido.parametros));
    await t.terminar();
    assert.equal(t.$excluir.prop("open"), false);
    assert.equal(amb.ultimoToast().message, "Parâmetro excluído.");
    assert.equal(amb.linhaDoId(alvo.id), false, "linha excluída continua na tabela");
    assert.equal(amb.tabela().getDataCount(), 11);
    assert.equal(t.$excluir.find("[data-excluir-botao-texto]").text(), "Excluir");

    // Cancelar fecha sem comando
    const outra = t.linhaVisivel();
    amb.clicarAcao(outra.id, "excluir");
    t.$excluir.find("[data-fechar-excluir]").trigger("click");
    assert.equal(t.$excluir.prop("open"), false);
    assert.equal(amb.widget.linhaExcluindo, null);
    assert.equal(amb.requisicoes.filter((r) => r.acao === "alterarParametro").length, 1);
    amb.conferirContrato();
  });

  await teste("CONFLITO_VERSAO: mensagem própria, modal fecha e a lista recarrega com os mesmos filtros", async () => {
    const amb = await ambiente({ quantidade: 12 }).iniciar();
    const t = telaDeComandos(amb);
    await amb.escolher("[data-filtro-est]", "10904");
    amb.$raiz.find("[data-buscar]").trigger("click");
    await t.terminar();
    const alvo = t.linhaVisivel();
    amb.servidor.buscar(alvo.id).versao = 5; // outra pessoa alterou
    amb.clicarAcao(alvo.id, "editar");
    t.campo("capacidade").val("3");
    const cargasAntes = amb.requisicoes.filter((r) => r.acao === "consultarParametros").length;
    t.salvar();
    await t.terminar();
    await amb.esperar(() => !amb.$raiz.find("[data-buscar]").prop("disabled"), "recarga");
    igual(amb.toasts.find((x) => x.type === "danger"), { title: "", message: "Este parâmetro foi alterado por outra pessoa. A lista será recarregada; confira o registro antes de tentar novamente.", type: "danger" });
    assert.equal(t.$modal.prop("open"), false, "modal continua aberto no conflito");
    const recarga = amb.requisicoes.filter((r) => r.acao === "consultarParametros").slice(cargasAntes);
    assert.equal(recarga.length, 1, "não recarregou");
    igual(recarga[0].parametros, { limite: 100, estabelDe: "10904", estabelAte: "10904" }, "recarga perdeu os filtros");
    assert.equal(amb.linhaDoId(alvo.id).getData().versao, 5);
    amb.conferirContrato();
  });

  await teste("incerto: falha na resposta mantém o modal, avisa e a nova tentativa usa a MESMA chave; servidor confirma repetição", async () => {
    const amb = await ambiente({ quantidade: 5 }).iniciar();
    const t = telaDeComandos(amb);
    await t.preencherNovo();
    // a gravação acontece no servidor, mas a resposta se perde (HTTP 504)
    amb.servidor.interceptar = (acao, parametros, requisicao) => {
      if (acao !== "incluirParametro") return undefined;
      amb.servidor.responder(acao, parametros);
      setImmediate(() => requisicao.falhar(504));
      return false;
    };
    t.salvar();
    await t.terminar();
    const incerto = "Não foi possível confirmar a gravação. Clique em Buscar para conferir o registro antes de tentar novamente. Uma nova tentativa com os mesmos dados usará a mesma identificação do comando.";
    igual(amb.ultimoToast(), { title: "", message: incerto, type: "warning" });
    assert.equal(t.$modal.prop("open"), true, "modal fechou no resultado incerto");
    assert.equal(t.$modal.find("[data-cadastro-mensagem]").text(), incerto);
    assert.equal(amb.tabela().getDataCount(), 5, "linha entrou sem confirmação");
    assert.ok(!t.campo("capacidade").prop("disabled"), "formulário ficou travado");

    amb.servidor.interceptar = null;
    t.salvar();
    await t.terminar();
    const [primeira, segunda] = amb.requisicoes.filter((r) => r.acao === "incluirParametro");
    assert.equal(segunda.parametros.chaveIdempotente, primeira.parametros.chaveIdempotente, "nova tentativa gerou chave nova");
    assert.equal(amb.ultimoToast().message, "Inclusão já confirmada anteriormente.");
    assert.equal(amb.tabela().getDataCount(), 6);
    assert.equal(amb.servidor.parametros.length, 6, "servidor gravou duas vezes");

    // depois de confirmado, os mesmos dados de novo = intenção nova (chave nova)
    await t.preencherNovo();
    t.salvar();
    await t.terminar();
    const terceira = amb.requisicoes.filter((r) => r.acao === "incluirParametro")[2];
    assert.notEqual(terceira.parametros.chaveIdempotente, primeira.parametros.chaveIdempotente);
    amb.conferirContrato();
  });

  await teste("incerto: FALHA_CHAMADA/HTTP_* e fotografia fora do esperado; dados diferentes = chave nova", async () => {
    const amb = await ambiente({ quantidade: 12 }).iniciar();
    const t = telaDeComandos(amb);
    const alvo = t.linhaVisivel((d) => d.ativo);
    const respostas = [
      { sucesso: false, codigoErro: "FALHA_CHAMADA", mensagem: "Nao foi possivel concluir a chamada autorizada." },
      { sucesso: false, codigoErro: "HTTP_500", mensagem: "A API respondeu HTTP 500." },
      { sucesso: true, idParam: alvo.id, codEstabel: alvo.estCodigo, item: alvo.itemCodigo, codTipo: alvo.tipoCodigo, unidade: alvo.unidade, capacidade: 4, ativo: true, excluido: false }, // sem versão
      { sucesso: true, idParam: alvo.id + 1, codEstabel: alvo.estCodigo, item: alvo.itemCodigo, codTipo: alvo.tipoCodigo, unidade: alvo.unidade, capacidade: 4, ativo: true, versao: 2, excluido: false }, // outro id
    ];
    amb.servidor.interceptar = (acao) => (acao === "alterarParametro" ? respostas.shift() : undefined);
    amb.clicarAcao(alvo.id, "editar");
    t.campo("capacidade").val("4");
    for (let i = 0; i < 4; i++) {
      t.salvar();
      await t.terminar();
      assert.equal(amb.ultimoToast().type, "warning", "tentativa " + (i + 1) + " não foi tratada como incerta");
      assert.ok(amb.ultimoToast().message.startsWith("Não foi possível confirmar a gravação."));
    }
    const chaves = amb.requisicoes.filter((r) => r.acao === "alterarParametro").map((r) => r.parametros.chaveIdempotente);
    assert.equal(new Set(chaves).size, 1, "mesma intenção com chaves diferentes");
    assert.equal(amb.linhaDoId(alvo.id).getData().capacidade, alvo.capacidade, "linha mudou sem confirmação");
    t.campo("capacidade").val("4.5");
    amb.servidor.interceptar = null;
    t.salvar();
    await t.terminar();
    assert.notEqual(amb.ultimaRequisicao("alterarParametro").parametros.chaveIdempotente, chaves[0], "dados novos reaproveitaram a chave");
    assert.equal(amb.ultimoToast().message, "Parâmetro alterado.");
    amb.conferirContrato();
  });

  await teste("recusas: ESCRITA_DESABILITADA e SEM_PERMISSAO em vermelho, no modal; versão inválida nem chama o servidor", async () => {
    const amb = await ambiente({ quantidade: 12 }).iniciar();
    const t = telaDeComandos(amb);
    const alvo = t.linhaVisivel();
    amb.servidor.interceptar = (acao) => (acao === "alterarParametro" ? { sucesso: false, codigoErro: "ESCRITA_DESABILITADA", mensagem: "Comandos ainda nao habilitados." } : undefined);
    amb.clicarAcao(alvo.id, "excluir");
    t.$excluir.find("[data-confirmar-excluir]").trigger("click");
    await t.terminar();
    igual(amb.ultimoToast(), { title: "", message: "A gravação de parâmetros ainda não está habilitada no dataset.", type: "danger" });
    assert.equal(t.$excluir.find("[data-excluir-mensagem]").text(), "A gravação de parâmetros ainda não está habilitada no dataset.");
    assert.equal(t.$excluir.prop("open"), true);
    t.$excluir.find("[data-fechar-excluir]").trigger("click");

    amb.servidor.interceptar = (acao) => (acao === "alterarParametro" ? { sucesso: false, codigoErro: "SEM_PERMISSAO", mensagem: "x" } : undefined);
    amb.clicarAcao(alvo.id, "situacao");
    await t.terminar();
    igual(amb.ultimoToast(), { title: "", message: "Você não tem permissão para esta ação.", type: "danger" });
    assert.equal(amb.linhaDoId(alvo.id).getData().ativo, alvo.ativo);

    amb.servidor.interceptar = (acao) => (acao === "alterarParametro" ? { sucesso: false, codigoErro: "REGRA_X", mensagem: "Recusa do backend." } : undefined);
    amb.clicarAcao(alvo.id, "situacao");
    await t.terminar();
    assert.equal(amb.ultimoToast().message, "Recusa do backend.");

    const antes = amb.requisicoes.length;
    amb.tabela().updateData([{ id: alvo.id, versao: 0 }]);
    await pausa(5);
    amb.clicarAcao(alvo.id, "situacao");
    await pausa(5);
    assert.equal(amb.requisicoes.length, antes, "chamou o servidor com versão inválida");
    igual(amb.ultimoToast(), { title: "", message: "Registro sem identificação ou versão válida. Clique em Buscar para carregar o parâmetro salvo no servidor.", type: "danger" });
    amb.conferirContrato();
  });

  await teste("modal: Cancelar, × e clique no fundo fecham e limpam; Esc limpa pelo evento close", async () => {
    const amb = await ambiente({ quantidade: 3 }).iniciar();
    const t = telaDeComandos(amb);
    for (const fechar of [() => t.$modal.find("[data-fechar-modal]").last().trigger("click"), () => t.$modal.find(".nwi-modal-fechar").trigger("click"), () => t.$modal.trigger(amb.$.Event("click", { target: t.$modal[0] }))]) {
      await t.preencherNovo();
      fechar();
      assert.equal(t.$modal.prop("open"), false);
      assert.equal(t.campo("estabelecimento").val(), "");
      assert.equal(t.campo("estabelecimento").data("codigo"), undefined);
    }
    await t.preencherNovo();
    t.$modal[0].close(); // Esc do navegador
    await pausa(5);
    assert.equal(t.campo("item").data("codigo"), undefined, "Esc não limpou");
    assert.equal(t.$modal.find(".tt-hint").length, 0, "autocomplete do modal não foi destruído");
  });

  concluir();
});
