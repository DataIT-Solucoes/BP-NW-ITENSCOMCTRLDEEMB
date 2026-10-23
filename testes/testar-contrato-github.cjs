// A cópia testes/dataset/dsNwEmbalagens.js (que valida todo pedido do widget nos testes locais) tem de ser igual ao
// dsNwEmbalagens.js publicado no GitHub DataIT-Solucoes/BP-NW-DATASET (main). Baixa o arquivo com o gh (login do GitHub da máquina).
// Também confere que toda ação chamada pelo widget existe no Dataset, está liberada para o DefaultGroup-1 e, se grava,
// está em escritasHabilitadas; e que os parâmetros que o widget monta passam pelas regras do próprio Dataset.
const { spawnSync } = require("node:child_process");
const assert = require("node:assert/strict");
const { dataset, fonteDataset, fonteWidget, conferirPedido, estabelecimentosDaAcao, criarSuite, executarSuite } = require("./ambiente.cjs");

// constantes ACAO_* do widget → nome da ação
function acoesDoWidget() {
  const acoes = {};
  for (const m of fonteWidget.matchAll(/var (ACAO_\w+) = '(\w+)';/g)) acoes[m[1]] = m[2];
  return acoes;
}

executarSuite(async () => {
  const { teste, concluir } = criarSuite("contrato-github");
  const gh = spawnSync("gh", ["api", "-H", "Accept: application/vnd.github.raw", "repos/DataIT-Solucoes/BP-NW-DATASET/contents/dsNwEmbalagens.js"], { encoding: "utf8" });
  if (gh.status !== 0) throw new Error("não foi possível baixar o dsNwEmbalagens.js do GitHub com o gh: " + (gh.stderr || gh.error));
  const commit = spawnSync("gh", ["api", "repos/DataIT-Solucoes/BP-NW-DATASET/commits/main", "--jq", ".sha[0:7]"], { encoding: "utf8" }).stdout.trim();

  await teste("testes/dataset/dsNwEmbalagens.js = GitHub (main " + commit + ")", async () => {
    // quebra de linha fora da comparação (o git desta máquina pode trazer a cópia em CRLF)
    const lf = (texto) => texto.replace(/\r\n/g, "\n");
    assert.ok(lf(gh.stdout) === lf(fonteDataset), "o Dataset mudou no GitHub: copie o novo para testes/dataset/ e rode os testes");
  });

  const acoes = acoesDoWidget();
  const usadas = Object.values(acoes).sort();
  await teste("ações do widget (" + usadas.join(", ") + ") existem e estão liberadas para o DefaultGroup-1", async () => {
    assert.deepEqual(usadas, ["alterarParametro", "apoiarEstabelecimentos", "apoiarItens", "consultarParametros", "consultarTiposApoio", "incluirParametro"],
      "as ações do widget mudaram: atualize este teste");
    for (const acao of usadas) {
      assert.ok(dataset.NW_ACOES[acao], acao + " (usada pelo widget) não existe no Dataset");
      assert.ok(dataset.NW_CONFIG.regras.some((r) => r.grupo === "DefaultGroup-1" && r.acoes.indexOf(acao) >= 0), acao + " não está liberada para o DefaultGroup-1");
    }
  });

  await teste("incluirParametro e alterarParametro habilitados para escrita", async () => {
    for (const acao of ["incluirParametro", "alterarParametro"])
      assert.ok(dataset.NW_CONFIG.escritasHabilitadas.indexOf(acao) >= 0, acao + " fora de escritasHabilitadas");
  });

  await teste("limites do widget dentro do teto do Dataset", async () => {
    const numero = (nome) => Number((fonteWidget.match(new RegExp("var " + nome + " = (\\d+);")) || [])[1]);
    assert.ok(numero("LIMITE_PAGINA_PARAMETROS") <= dataset.NW_ACOES.consultarParametros.teto, "LIMITE_PAGINA_PARAMETROS acima do teto");
    for (const acao of ["apoiarEstabelecimentos", "apoiarItens", "consultarTiposApoio"])
      assert.ok(numero("LIMITE_SUGESTOES") <= dataset.NW_ACOES[acao].teto, "LIMITE_SUGESTOES acima do teto de " + acao);
    assert.equal(dataset.NW_ACOES.consultarParametros.cursor, "proximoId", "cursor de consultarParametros mudou (o widget lê proximoId)");
    assert.equal(dataset.NW_ACOES.consultarParametros.entradaCursor, "aposId", "entrada do cursor mudou (o widget manda aposId)");
  });

  // os mesmos formatos que o widget monta (tipos JSON inclusive), conferidos pelas funções do Dataset
  await teste("formatos de pedido do widget aceitos pelo Dataset", async () => {
    const [est] = estabelecimentosDaAcao("consultarParametros");
    const chave = "6f1c0d52-7a3e-4b8f-9d21-0c5e8a7b3f10";
    const pedidos = [
      ["consultarParametros", { limite: 100 }],
      ["consultarParametros", { limite: 100, aposId: "100", estabelDe: est, estabelAte: est, itemDe: "IT-1", itemAte: "IT-1", codTipo: "CX01", ativo: false }],
      ["apoiarEstabelecimentos", { filtro: "10", limite: 20 }],
      ["apoiarItens", { filtro: "IT", limite: 20, codEstabel: est }],
      ["apoiarItens", { filtro: "IT", limite: 20 }],
      ["consultarTiposApoio", { filtro: "CX", ativo: "todos", limite: 20 }],
      ["consultarTiposApoio", { filtro: "CX", ativo: true, limite: 20 }],
      ["incluirParametro", { idParam: 0, codEstabel: est, item: "IT-1", codTipo: "CX01", capacidade: 1.5, unidade: "KG", ativo: true, versao: 0, chaveIdempotente: chave }],
    ];
    for (const acao of ["ALTERAR", "INATIVAR", "EXCLUIR"])
      pedidos.push(["alterarParametro", { idParam: 7, codEstabel: est, item: "IT-1", codTipo: "CX01", capacidade: 1.5, unidade: "KG", ativo: acao !== "INATIVAR", versao: 3, acao, chaveIdempotente: chave }]);
    for (const [acao, parametros] of pedidos) assert.equal(conferirPedido(acao, parametros).recusa, "", acao + " " + JSON.stringify(parametros));
  });

  await teste("Dataset recusa o que o widget evita (estabelecimento fora da regra, filtro curto, unidade vazia)", async () => {
    const chave = "6f1c0d52-7a3e-4b8f-9d21-0c5e8a7b3f10";
    assert.match(conferirPedido("apoiarItens", { filtro: "IT", limite: 20, codEstabel: "99999" }).recusa, /^SEM_PERMISSAO/);
    assert.match(conferirPedido("apoiarEstabelecimentos", { filtro: "1", limite: 20 }).recusa, /^FILTRO_INVALIDO/);
    assert.match(conferirPedido("incluirParametro", { idParam: 0, codEstabel: "10904", item: "IT-1", codTipo: "CX01", capacidade: 1, unidade: "", ativo: true, versao: 0, chaveIdempotente: chave }).recusa, /^PARAMETRO_OBRIGATORIO/);
  });

  concluir();
});
