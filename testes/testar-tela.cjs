// Tela: carga inicial (todas as páginas), colunas e valores, paginação local, filtros com autocomplete + badge, Situação (Select2),
// Buscar com os filtros escolhidos e as recusas do autocomplete.
const assert = require("node:assert/strict");
const { ambiente, pausa, igual, criarSuite, executarSuite } = require("./ambiente.cjs");

executarSuite(async () => {
  const { teste, concluir } = criarSuite("tela");

  await teste("carga inicial: 3 páginas de 100 por cursor, contador, ordem por estabelecimento", async () => {
    const amb = await ambiente().iniciar();
    igual(amb.requisicoes.map((r) => r.parametros), [{ limite: 100 }, { limite: 100, aposId: "100" }, { limite: 100, aposId: "200" }]);
    assert.equal(amb.tabela().getDataCount(), 230);
    assert.equal(amb.contador(), "Mostrando 1–10 de 230");
    assert.equal(amb.celulas().length, 10, "paginação de 10");
    igual(amb.tabela().getSorters().map((s) => s.field + ":" + s.dir), ["estCodigo:asc"]);
    assert.ok(amb.celulas().every((c) => c.estCodigo.startsWith("10904")), "1ª página deveria ser do menor estabelecimento");
    assert.equal(amb.widget.cargaFalhou, false);
    amb.conferirContrato();
  });

  await teste("colunas: código — descrição, só código sem descrição, unidade, capacidade com 4 casas, situação e ações", async () => {
    const amb = await ambiente({ quantidade: 7 }).iniciar();
    const titulos = amb.$raiz.find("[data-tabela] > .tabulator-header .tabulator-col-title").map((i, e) => e.textContent.trim()).get();
    igual(titulos, ["Estabelecimento", "Item", "Unidade", "Tipo de Embalagem", "Capacidade", "Situação", "Ações"]);
    const linhas = amb.celulas();
    // id 5: inativo; id 7: sem descrições
    const id5 = linhas.find((c) => c.capacidade === "6,2500");
    igual(
      { est: id5.estCodigo, item: id5.itemCodigo, un: id5.unidade, tipo: id5.tipoCodigo, sit: id5.ativo, botoes: id5.botoes },
      { est: "11301 — Estabelecimento Teste B", item: "IT-0003 — Item teste tres", un: "L", tipo: "TB03 — Tambor inativo", sit: "Inativo", botoes: ["situacao", "editar", "excluir"] });
    const id7 = linhas.find((c) => c.capacidade === "8,7500");
    igual([id7.estCodigo, id7.itemCodigo, id7.tipoCodigo], ["11301", "IT-0002", "SC02"]);
    const $interruptor5 = amb.$(amb.linhaDoId(5).getElement()).find('[data-acao="situacao"]');
    assert.equal($interruptor5.attr("role"), "switch");
    assert.equal($interruptor5.attr("aria-checked"), "false");
    assert.equal($interruptor5.attr("title"), "Ativar");
    assert.equal($interruptor5.attr("aria-label"), "Ativo: IT-0003 em 11301");
    assert.equal(amb.$(amb.linhaDoId(1).getElement()).find('[data-acao="editar"]').attr("aria-label"), "Editar IT-0002 em 11301");
    // XSS: descrição vem como texto
    amb.tabela().updateData([{ id: 1, estDescricao: "<img src=x onerror=alert(1)>" }]);
    await pausa(5);
    assert.equal(amb.$(amb.linhaDoId(1).getElement()).find("img").length, 0, "descrição virou HTML");
  });

  // medido no TESTE (26/10): com a janela em 1280 px a tabela tem 1056 px; mais que isso de largura mínima = rolagem horizontal
  await teste("colunas: larguras mínimas cabem em 1056 px (janela de 1280 px no Fluig)", async () => {
    const amb = await ambiente().iniciar();
    const minimo = amb.tabela().getColumnDefinitions().reduce((soma, d) => soma + (d.width || d.minWidth || 0), 0);
    assert.ok(minimo <= 1056, "soma das larguras mínimas = " + minimo + " px");
  });

  await teste("sem dados: placeholder e contador vazio", async () => {
    const amb = await ambiente({ quantidade: 0 }).iniciar();
    assert.equal(amb.$raiz.find(".tabulator-placeholder").text().trim(), "Nenhum item controlado encontrado.");
    assert.equal(amb.contador(), "");
  });

  await teste("autocomplete dos filtros: mínimo 2 caracteres, parâmetros por campo, item usa o estabelecimento escolhido", async () => {
    const amb = await ambiente().iniciar();
    const antes = amb.requisicoes.length;
    igual(await amb.digitar("[data-filtro-est]", "1"), []);
    assert.equal(amb.requisicoes.length, antes, "consultou com 1 caractere");

    const sugestoes = await amb.digitar("[data-filtro-est]", "teste b");
    igual(sugestoes, [{ codigo: "11301", descricao: "Estabelecimento Teste B", rotulo: "11301 — Estabelecimento Teste B" }]);
    igual(amb.ultimaRequisicao("apoiarEstabelecimentos").parametros, { filtro: "teste b", limite: 20 });

    await amb.digitar("[data-filtro-item]", "IT");
    igual(amb.ultimaRequisicao("apoiarItens").parametros, { filtro: "IT", limite: 20 }, "sem estabelecimento escolhido não manda codEstabel");
    await amb.escolher("[data-filtro-est]", "10904");
    const itens = await amb.digitar("[data-filtro-item]", "IT-0001");
    igual(amb.ultimaRequisicao("apoiarItens").parametros, { filtro: "IT-0001", limite: 20, codEstabel: "10904" });
    igual(itens, [{ codigo: "IT-0001", descricao: "Item teste um", rotulo: "IT-0001 — Item teste um", unidade: "KG" }]);

    await amb.digitar("[data-filtro-tipo]", "ta");
    igual(amb.ultimaRequisicao("consultarTiposApoio").parametros, { filtro: "ta", ativo: "todos", limite: 20 }, "filtro de tipo traz ativos e inativos");
    amb.conferirContrato();
  });

  await teste("autocomplete: resposta velha descartada, sugestão inválida filtrada, falha e recusa viram toast", async () => {
    const amb = await ambiente().iniciar();
    const $campo = amb.campo("[data-filtro-est]");
    const registro = amb.autocompletes.get($campo[0]);
    const respostas = [];
    amb.servidor.interceptar = () => false; // o teste responde
    registro.configuracao.source("10", (s) => respostas.push(["velha", s]));
    amb.disparar(350);
    registro.configuracao.source("11", (s) => respostas.push(["nova", s]));
    amb.disparar(350);
    const [velha, nova] = amb.requisicoes.filter((r) => r.acao === "apoiarEstabelecimentos").slice(-2);
    assert.equal(velha.abortado, true, "a consulta velha deveria ser abortada");
    velha.responder({ sucesso: true, dados: [{ codigo: "10904", descricao: "A" }], total: 1, temMais: false });
    nova.responder({ sucesso: true, dados: [{ codigo: "11301", descricao: "B" }, { codigo: 11, descricao: "número" }, { codigo: "X" }], total: 3, temMais: false });
    await pausa(5);
    igual(respostas, [["nova", [{ codigo: "11301", descricao: "B", rotulo: "11301 — B" }]]], "só a resposta nova e só sugestões com código e descrição em texto");

    registro.configuracao.source("10", (s) => respostas.push(["falha", s]));
    amb.disparar(350);
    amb.pendentes("apoiarEstabelecimentos").at(-1).falhar(500);
    await pausa(5);
    igual(respostas.at(-1), ["falha", []]);
    igual(amb.ultimoToast(), { title: "", message: "Não foi possível consultar os estabelecimentos. Tente novamente.", type: "danger" });

    registro.configuracao.source("10", (s) => respostas.push(["recusa", s]));
    amb.disparar(350);
    amb.atender("apoiarEstabelecimentos", { sucesso: false, codigoErro: "AUTORIZACAO_NAO_CONFIGURADA" });
    await pausa(5);
    igual(respostas.at(-1), ["recusa", []]);
    assert.equal(amb.ultimoToast().message, "O acesso a esta tela ainda não foi configurado no Fluig (grupos e permissões).");
  });

  await teste("badge: escolha vira badge, campo trava; × limpa texto, código e escolha", async () => {
    const amb = await ambiente().iniciar();
    await amb.escolher("[data-filtro-tipo]", "CX", "CX01");
    const $campo = amb.campo("[data-filtro-tipo]");
    const $badge = $campo.closest(".nwi-campo-caixa").find(".nwi-selecionado");
    assert.equal($campo.val(), "CX01 — Caixa teste");
    assert.equal($campo.data("codigo"), "CX01");
    assert.ok($campo.prop("readOnly") && $campo.hasClass("is-selecionado"), "campo deveria travar");
    assert.equal($badge.prop("hidden"), false);
    assert.equal($badge.find(".nwi-selecionado-codigo").text() + $badge.find(".nwi-selecionado-descricao").text(), "CX01 — Caixa teste");
    assert.equal($badge.find(".nwi-selecionado-remover").attr("aria-label"), "Remover CX01 — Caixa teste");
    assert.equal(amb.window.document.activeElement, $badge.find(".nwi-selecionado-remover")[0], "foco vai para o ×");

    // digitar com o campo travado não apaga a escolha
    $campo.trigger("input");
    assert.equal($campo.data("codigo"), "CX01");

    $badge.find(".nwi-selecionado-remover").trigger("click");
    assert.equal($badge.prop("hidden"), true);
    assert.equal($campo.val(), "");
    assert.equal($campo.data("codigo"), undefined);
    assert.equal($campo.data("registro"), undefined);
    assert.ok(!$campo.prop("readOnly") && !$campo.hasClass("is-selecionado"));
    assert.equal(amb.window.document.activeElement, $campo[0], "foco volta ao campo");

    // visto no TESTE (26/10): com o texto no campo, o Buscar recusava ("Escolha … na lista") até apagar à mão
    const toastsAntes = amb.toasts.length;
    amb.$raiz.find("[data-buscar]").trigger("click");
    await amb.ocioso();
    assert.ok(!("codTipo" in amb.ultimaRequisicao("consultarParametros").parametros), "× deveria tirar o tipo da busca");
    assert.equal(amb.toasts.length, toastsAntes, "Buscar depois do × não deveria avisar");
    await amb.esperar(() => !amb.$raiz.find("[data-buscar]").prop("disabled"), "fim da busca");

    // escolher de novo reaproveita a mesma badge
    await amb.escolher("[data-filtro-tipo]", "SC", "SC02");
    assert.equal($campo.closest(".nwi-campo-caixa").find(".nwi-selecionado").length, 1);
    assert.equal($badge.find(".nwi-selecionado-codigo").text(), "SC02");
  });

  await teste("Buscar: texto sem escolha avisa e não consulta; escolhas viram faixa De/Até, codTipo e ativo", async () => {
    const amb = await ambiente().iniciar();
    const cargas = () => amb.requisicoes.filter((r) => r.acao === "consultarParametros").length;
    const antes = cargas();
    amb.campo("[data-filtro-item]").val("IT-00").trigger("input");
    amb.$raiz.find("[data-buscar]").trigger("click");
    assert.equal(cargas(), antes, "buscou com texto sem escolha");
    igual(amb.ultimoToast(), { title: "", message: "Escolha o item na lista para buscar.", type: "info" });

    amb.campo("[data-filtro-item]").val("").trigger("input");
    await amb.escolher("[data-filtro-est]", "10904");
    await amb.escolher("[data-filtro-item]", "IT-0001");
    await amb.escolher("[data-filtro-tipo]", "CX", "CX01");
    amb.$raiz.find("[data-filtro-situacao]").val("false").trigger("change");
    amb.$raiz.find("[data-buscar]").trigger("click");
    await amb.ocioso();
    igual(amb.ultimaRequisicao("consultarParametros").parametros,
      { limite: 100, estabelDe: "10904", estabelAte: "10904", itemDe: "IT-0001", itemAte: "IT-0001", ativo: false, codTipo: "CX01" });
    await amb.esperar(() => !amb.$raiz.find("[data-buscar]").prop("disabled"), "fim da busca");
    const esperado = amb.servidor.parametros.filter((p) => p.codEstabel === "10904" && p.item === "IT-0001" && p.codTipo === "CX01" && !p.ativo);
    assert.ok(esperado.length > 0, "massa de teste sem linha para o filtro");
    assert.equal(amb.tabela().getDataCount(), esperado.length);
    igual(amb.widget.filtrosAplicados, { parametros: { estabelDe: "10904", estabelAte: "10904", itemDe: "IT-0001", itemAte: "IT-0001", ativo: false, codTipo: "CX01" } });

    // Ativo e Todos
    amb.$raiz.find("[data-filtro-situacao]").val("true").trigger("change");
    amb.$raiz.find("[data-buscar]").trigger("click");
    await amb.ocioso();
    assert.equal(amb.ultimaRequisicao("consultarParametros").parametros.ativo, true);
    amb.$raiz.find("[data-filtro-situacao]").val("todos").trigger("change");
    amb.$raiz.find("[data-buscar]").trigger("click");
    await amb.ocioso();
    assert.ok(!("ativo" in amb.ultimaRequisicao("consultarParametros").parametros), "Todos não manda ativo");
    amb.conferirContrato();
  });

  await teste("Situação usa Select2 dentro do widget, sem busca; sem Select2 fica o select nativo", async () => {
    const amb = await ambiente().iniciar();
    const $select = amb.$raiz.find("[data-filtro-situacao]");
    assert.ok($select.hasClass("select2-hidden-accessible"), "Select2 não aplicado");
    assert.ok($select.closest(".nwi-campo-caixa-select").hasClass("is-select2"));
    igual($select.find("option").map((i, o) => o.value + "=" + o.textContent).get(), ["todos=Todos", "true=Ativo", "false=Inativo"]);
    $select.select2("open");
    assert.equal(amb.$raiz.find(".select2-dropdown").length, 1, "lista do Select2 fora do widget");
    assert.equal(amb.$raiz.find(".select2-dropdown .select2-search--hide").length, 1, "campo de busca visível na lista");

    const semSelect2 = ambiente();
    delete semSelect2.$.fn.select2;
    await semSelect2.iniciar();
    assert.ok(!semSelect2.$raiz.find("[data-filtro-situacao]").hasClass("select2-hidden-accessible"));
    assert.equal(semSelect2.tabela().getDataCount(), 230);
  });

  await teste("abas: setas, Home e End mudam a aba ativa com aria", async () => {
    const amb = await ambiente({ quantidade: 1 }).iniciar();
    const $aba = amb.$raiz.find("[data-tab]");
    assert.equal($aba.length, 1);
    const evento = amb.$.Event("keydown", { key: "End" });
    $aba.trigger(evento);
    assert.equal(evento.isDefaultPrevented(), true);
    assert.equal($aba.attr("aria-selected"), "true");
    assert.equal($aba.attr("tabindex"), "0");
    assert.equal(amb.widget.abaAtual, "itens-controlados");
    const outra = amb.$.Event("keydown", { key: "a" });
    $aba.trigger(outra);
    assert.equal(outra.isDefaultPrevented(), false, "tecla comum não pode ser bloqueada");
  });

  concluir();
});
