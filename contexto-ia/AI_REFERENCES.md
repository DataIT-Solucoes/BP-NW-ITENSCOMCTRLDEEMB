# AI_REFERENCES — widget_nw_itensComCtrllDeEmb

## Fontes da verdade
Caminhos desta tabela são relativos à raiz do widget, salvo caminho absoluto.

| Assunto | Local | Versão / data consultada |
|---|---|---|
| Padrão de contexto | `C:/Users/DataIt/Documents/PADRAO_CONTEXTO_IA_WIDGETS.md` | Lido em 2026-10-20 |
| Regras gerais | `../../../CLAUDE.md` | Lido em 2026-10-20; AGENTS da raiz não encontrado |
| Regras anteriores | AGENTS e antigo CLAUDE local | Lidos antes da migração em 2026-10-20; equivalentes, exceto referência Às regras gerais |
| Widget | `src/main/` | Consultado em 2026-10-20; master, HEAD 9e171f1 |
| Dataset/permissões | `../widget_nw_embalagens/datasets/dsNwEmbalagens.js` | Local registrado nas instruções anteriores; existência/conteúdo não verificados nesta migração documental |
| Receita de badges | `BADGE_FILTROS.md` | Lida em 2026-10-20; preexistente não rastreada e mantida sem alteração |
| Protótipo histórico | `https://humcode.com.br/mockup-fluig.html` | Referência herdada; não consultado nesta tarefa |

Antes de alterar integração, conferir contrato atual no fonte. Não armazenar credenciais.

## Descobertas confirmadas em 2026-10-20
Caminho do JS abaixo: `src/main/webapp/resources/js/widget_nw_itensComCtrllDeEmb.js`. Linhas referem-se à revisão consultada.

- `src/main/resources/application.info`: versão 0.1.0, categoria SYSTEM, JS .1 e CSS .2. O card de edit.ftl menciona v1.0, distinto da versão dos metadados; sem parâmetros configuráveis.
- `src/main/resources/view.ftl:1`: Bootstrap Icons 1.11.3, Mulish, Tabulator 6.4.0 e Select2 4.0.13, com tradução pt-BR. A lista antiga omitia Select2.
- JS:9 — endpoint, dataset e seis ações. `chamarEmbalagens` envia acao/parametros e espera uma linha com resultadoJson e sucesso booleano. É a expectativa do cliente; não valida o contrato do servidor.
- JS:83 — mapeia códigos, unidade, capacidade, ativo, versão e descrições opcionais descricaoEstabelecimento/descricaoItem/descricaoTipo. Sem descrição mostra somente o código.
- JS:309 — apoios do cadastro usam dataset; unidade vem do item. Tipos do cadastro consultados com ativo true.
- JS:419 — badge no campo; remoção limpa typeahead/input, código e registro e restaura foco. Receita complementar em BADGE_FILTROS.md.
- JS:654 — switch chama alterarParametro com INATIVAR para desativar e ALTERAR para ativar, invertendo ativo.
- JS:717 — consulta acumula páginas de até 100 registros com aposId/proximoId e rejeita cursor inválido ou repetido. Tabela tem paginação local de dez registros.
- JS:896 — estabelecimento e item readonly na edição. JS:999 — capacidade positiva e até quatro casas.
- JS:1040 — chave idempotente, validação da resposta e tratamento de resultado incerto. JS:1098 — edição; JS:1116 — inclusão; JS:1202 — exclusão por EXCLUIR. Implementação no fonte não comprova execução no Fluig.

## Verificação e build
- `git status --short`, `git branch --show-current`, `git log -1`: estado inicial, branch e revisão. Único item inicial: `?? BADGE_FILTROS.md`.
- `rg --files` e buscas pontuais no JS: inventário do widget e localização de comportamentos documentados; nenhum .r lido.
- SHA-256 dos 12 arquivos de src antes/depois: sem mudança nos fontes. Temporário de verificação removido após conferência.
- Conferência dos seis documentos, links locais e `git diff --check`: verificação documental local, sem testes funcionais.
- 2026-10-20 — `jar tf target/widget_nw_itensComCtrllDeEmb.war`: WAR preexistente tem 12 entradas, webapp na raiz e resources em WEB-INF/classes. Não há pom.xml ou script de build no widget; não há fontes Java.
- Compilação/empacotamento local com Python `zipfile.ZipFile` e compressão ZIP_DEFLATED, preservando esse mapeamento. Conferência: lista das 12 entradas e bytes de cada arquivo contra os fontes, além de `testzip()`. Artefato: `target/widget_nw_itensComCtrllDeEmb.war`, ignorado pelo Git.
- Commit, push e compilação têm autorização permanente a partir da correção do usuário em 2026-10-20. Importação/publicação e responsável: a definir. Validação no Fluig: não confirmada.
