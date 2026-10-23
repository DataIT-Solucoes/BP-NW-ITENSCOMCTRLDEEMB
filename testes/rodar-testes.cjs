// Roda todas as suítes testar-*.cjs em sequência e resume. Uso: node testes/rodar-testes.cjs (ou npm test dentro de testes/).
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const suites = fs.readdirSync(__dirname).filter((nome) => /^testar-.*\.cjs$/.test(nome)).sort();
let falharam = 0;
for (const suite of suites) {
  const execucao = spawnSync(process.execPath, [path.join(__dirname, suite)], { encoding: "utf8" });
  const resumo = (execucao.stdout.match(/^.*\|CENARIOS=\d+\|FALHAS=\d+.*$/m) || [""])[0];
  const passou = execucao.status === 0 && /FALHAS=0/.test(resumo);
  if (!passou) falharam++;
  console.log((passou ? "OK    " : "FALHOU") + " " + suite + (resumo ? "  " + resumo : ""));
  if (!passou) console.log((execucao.stderr || execucao.stdout).split("\n").slice(0, 20).map((linha) => "       " + linha).join("\n"));
}
console.log("SUITES=" + suites.length + "|FALHARAM=" + falharam);
process.exitCode = falharam ? 1 : 0;
