// Cabeçalho fixo da tabela (prepararCabecalhoFixo, 23/10): quando aparece e some, posição, conteúdo da cópia, ordenação pela cópia,
// rolagem horizontal, refazer no resize/ordenação, tabela escondida, listeners por instância e o CSS que ele exige.
// O jsdom não calcula layout: a caixa da tabela (getBoundingClientRect) é definida pelo teste; cabeçalho e rodapé medem 30px.
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { ambiente, pausa, igual, criarSuite, executarSuite } = require("./ambiente.cjs");

const TOPO = 100, ALTURA_CABECALHO = 30, ALTURA_RODAPE = 30;
const css = fs.readFileSync(path.join(__dirname, "../src/main/webapp/resources/css/widget_nw_itensComCtrllDeEmb.css"), "utf8");

async function preparar(opcoes) {
  const amb = await ambiente(opcoes).iniciar();
  const $ = amb.$;
  const elementoTabela = amb.tabela().element;
  const $fixo = amb.$raiz.find(".nwi-cabecalho-fixo");
  // posiciona a tabela na janela e rola
  const rolar = (top, bottom, left = 16, width = 1100) => {
    elementoTabela.getBoundingClientRect = () => ({ top, bottom, left, right: left + width, width, height: bottom - top, x: left, y: top });
    $(amb.window).trigger("scroll");
  };
  const visivel = () => !$fixo.prop("hidden");
  const coluna = (campo) => $fixo.find('.tabulator-col[tabulator-field="' + campo + '"]');
  return { amb, $, $fixo, elementoTabela, rolar, visivel, coluna };
}

executarSuite(async () => {
  const { teste, concluir } = criarSuite("cabecalho-fixo");

  await teste("cópia criada dentro do widget, escondida, aria-hidden, top 100px", async () => {
    const { amb, $fixo } = await preparar();
    assert.equal($fixo.length, 1);
    assert.equal($fixo.parent()[0], amb.$raiz[0], "a cópia deveria ficar dentro do container do widget");
    assert.equal($fixo.prop("hidden"), true);
    assert.equal($fixo.attr("aria-hidden"), "true");
    assert.equal($fixo[0].style.top, TOPO + "px");
  });

  await teste("aparece quando o topo passa da barra e ainda sobra corpo; some no fim da tabela e ao subir", async () => {
    const { $fixo, rolar, visivel } = await preparar();
    rolar(250, 900);
    assert.equal(visivel(), false, "tabela ainda abaixo da barra");
    rolar(TOPO, 900);
    assert.equal(visivel(), false, "topo exatamente na linha: ainda não");
    rolar(TOPO - 1, 900);
    assert.equal(visivel(), true, "topo acima da linha");
    rolar(-400, 300, 24, 1050);
    assert.equal(visivel(), true);
    igual([$fixo[0].style.left, $fixo[0].style.width], ["24px", "1050px"], "cópia fora do alinhamento da tabela");
    // limite: corpo restante = bottom - rodapé; precisa ser > TOPO + cabeçalho
    rolar(-600, TOPO + ALTURA_CABECALHO + ALTURA_RODAPE + 1);
    assert.equal(visivel(), true);
    rolar(-600, TOPO + ALTURA_CABECALHO + ALTURA_RODAPE);
    assert.equal(visivel(), false, "fim da tabela: a cópia deveria sumir");
    rolar(300, 1000);
    assert.equal(visivel(), false, "subiu de novo: a cópia deveria sumir");
  });

  await teste("conteúdo: mesmo cabeçalho, classes e layout da tabela, sem id nem tabindex", async () => {
    const { amb, $, $fixo, elementoTabela, rolar } = await preparar();
    // o Tabulator 6.4 não põe id/tabindex no cabeçalho nesta configuração: planta os dois para exercitar a limpeza da cópia
    $(elementoTabela).children(".tabulator-header").attr("tabindex", "0")
      .find('.tabulator-col[tabulator-field="item"], .tabulator-col[tabulator-field="itemCodigo"]').attr({ id: "col-item", tabindex: "0" });
    rolar(0, 900);
    const $envoltorio = $fixo.children();
    assert.equal($envoltorio.length, 1);
    assert.equal($envoltorio.attr("class"), elementoTabela.getAttribute("class"));
    assert.ok($envoltorio.hasClass("nwi-tabela") && $envoltorio.hasClass("tabulator"), "sem as classes da tabela o CSS não pega");
    assert.equal($envoltorio.attr("tabulator-layout"), "fitColumns");
    igual($fixo.find(".tabulator-col-title").map((i, e) => e.textContent.trim()).get(), ["Estabelecimento", "Item", "Unidade", "Tipo de Embalagem", "Capacidade", "Situação", "Ações"]);
    assert.equal($fixo.find("[id]").length, 0, "id duplicado na página");
    assert.equal($(elementoTabela).find("#col-item").length, 1, "id plantado não ficou no original");
    assert.equal($fixo.find("[tabindex]").length + $fixo.find(".tabulator-header[tabindex]").length, 0, "cópia entra na ordem do Tab");
    // larguras inline das colunas vêm junto
    const original = $(elementoTabela).children(".tabulator-header").find('.tabulator-col[tabulator-field="unidade"]')[0].style.width;
    assert.ok(original, "a coluna original deveria ter largura inline");
    assert.equal($fixo.find('.tabulator-col[tabulator-field="unidade"]')[0].style.width, original);
    void amb;
  });

  await teste("clique numa coluna da cópia ordena a tabela; seta da cópia acompanha; Ações não ordena", async () => {
    const { amb, $fixo, rolar, coluna } = await preparar();
    rolar(0, 900);
    coluna("itemCodigo").trigger("click");
    await pausa(5);
    igual(amb.tabela().getSorters().map((s) => s.field + ":" + s.dir), ["itemCodigo:asc"]);
    assert.equal(coluna("itemCodigo").attr("aria-sort"), "ascending", "cópia não foi refeita depois da ordenação");
    assert.equal(coluna("estCodigo").attr("aria-sort"), "none");
    coluna("itemCodigo").trigger("click");
    await pausa(5);
    igual(amb.tabela().getSorters().map((s) => s.field + ":" + s.dir), ["itemCodigo:desc"]);
    assert.equal(coluna("itemCodigo").attr("aria-sort"), "descending");
    const primeira = amb.tabela().getRows("display")[0].getData().itemCodigo;
    assert.equal(primeira, "IT-0003", "tabela não ordenou de verdade");

    // a coluna Ações não tem field: o clique na cópia não faz nada
    $fixo.find(".tabulator-col.nwi-col-acoes").trigger("click");
    await pausa(5);
    igual(amb.tabela().getSorters().map((s) => s.field + ":" + s.dir), ["itemCodigo:desc"]);
  });

  await teste("rolagem horizontal da tabela: a cópia acompanha", async () => {
    const { $, $fixo, elementoTabela, rolar } = await preparar();
    rolar(0, 900);
    const holder = $(elementoTabela).children(".tabulator-tableholder")[0];
    holder.scrollLeft = 137;
    $(holder).trigger("scroll");
    assert.equal($fixo.find(".tabulator-header")[0].scrollLeft, 137);
  });

  await teste("resize e redesenho refazem a cópia; enquanto escondida não copia a cada scroll", async () => {
    const { amb, $, $fixo, elementoTabela, rolar } = await preparar();
    rolar(0, 900);
    const $titulo = () => $(elementoTabela).children(".tabulator-header").find('.tabulator-col[tabulator-field="unidade"] .tabulator-col-title');
    $titulo().text("Unidade X");
    $(amb.window).trigger("scroll");
    assert.equal($fixo.find('[tabulator-field="unidade"] .tabulator-col-title').text(), "Unidade", "copiou de novo num scroll comum");
    $(amb.window).trigger("resize");
    assert.equal($fixo.find('[tabulator-field="unidade"] .tabulator-col-title').text().trim(), "Unidade X", "resize não refez a cópia");

    // escondida → ao reaparecer copia de novo
    rolar(300, 900);
    $titulo().text("Unidade Y");
    rolar(0, 900);
    assert.equal($fixo.find('[tabulator-field="unidade"] .tabulator-col-title').text().trim(), "Unidade Y");

    // troca de página (renderComplete) com a cópia visível
    const copiaAntes = $fixo.children()[0];
    amb.tabela().setPage(2);
    await pausa(5);
    assert.notEqual($fixo.children()[0], copiaAntes, "renderComplete não refez a cópia");
  });

  await teste("tabela escondida (ex.: outra aba): a cópia some", async () => {
    const { $, $fixo, elementoTabela, rolar, visivel } = await preparar();
    rolar(0, 900);
    assert.equal(visivel(), true);
    $(elementoTabela).hide();
    rolar(0, 900);
    assert.equal(visivel(), false);
    $(elementoTabela).show();
    rolar(0, 900);
    assert.equal(visivel(), true);
    void $fixo;
  });

  await teste("listeners da janela por instância: duas instâncias não se desligam e repetir não duplica", async () => {
    const { amb, $, rolar } = await preparar();
    const outra = amb.montarInstancia(2);
    outra.widget.init();
    await amb.esperar(() => outra.widget.tabela && outra.widget.tabela.initialized, "2ª tabela");
    await amb.ocioso();
    const eventos = () => ($._data(amb.window, "events").scroll || []).map((h) => h.namespace).filter((n) => /nwiCabecalhoFixo/.test(n)).sort();
    igual(eventos(), ["nwiCabecalhoFixo1", "nwiCabecalhoFixo2"]);
    amb.widget.prepararCabecalhoFixo();
    igual(eventos(), ["nwiCabecalhoFixo1", "nwiCabecalhoFixo2"], "prepararCabecalhoFixo de novo duplicou o listener");
    // cada instância mede a própria tabela
    const $fixo2 = outra.$raiz.find(".nwi-cabecalho-fixo");
    outra.widget.tabela.element.getBoundingClientRect = () => ({ top: 500, bottom: 1500, left: 0, right: 1000, width: 1000, height: 1000 });
    rolar(0, 900);
    // a chamada repetida criou outra cópia; a que vale é a última
    assert.equal(amb.$raiz.find(".nwi-cabecalho-fixo").last().prop("hidden"), false);
    assert.equal($fixo2.prop("hidden"), true, "a cópia da 2ª instância seguiu a tabela da 1ª");
  });

  await teste("CSS: fixed, z-index abaixo de 50, overflow escondido e nada que impeça o hidden", async () => {
    const regra = (seletor) => {
      const m = css.match(new RegExp(seletor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]*)\\}"));
      return m ? m[1] : "";
    };
    const fixo = regra(".fluig-style-guide.nwi .nwi-cabecalho-fixo");
    assert.match(fixo, /position:\s*fixed/);
    const z = Number((fixo.match(/z-index:\s*(\d+)/) || [])[1]);
    assert.ok(z > 0 && z < 50, "z-index " + z);
    assert.match(fixo, /overflow:\s*hidden/);
    assert.match(regra(".fluig-style-guide.nwi .nwi-cabecalho-fixo .tabulator-header"), /overflow:\s*hidden/);
    // o hidden da cópia só funciona se nenhuma regra der display a ela (ou se houver [hidden] { display: none !important })
    const regraHidden = /\.fluig-style-guide\.nwi \[hidden\]\s*\{[^}]*display:\s*none\s*!important/.test(css);
    const comDisplay = [...css.matchAll(/([^{}]*\.nwi-cabecalho-fixo[^{}]*)\{([^}]*)\}/g)].filter((m) => /(^|[\s,])\.nwi-cabecalho-fixo\s*$/m.test(m[1].trim().split(",").pop()) && /display\s*:/.test(m[2]));
    assert.ok(regraHidden || !comDisplay.length, "regra dá display ao .nwi-cabecalho-fixo e não há [hidden] !important: " + comDisplay.map((m) => m[1].trim()).join(" | "));
    assert.doesNotMatch(regra(".fluig-style-guide.nwi .nwi-cabecalho-fixo"), /display\s*:/);
  });

  concluir();
});
