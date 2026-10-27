# Decisões do usuário — widget_nw_itensComCtrllDeEmb

> Decisões e correções do usuário. Acrescentar no topo (mais recente primeiro), com data e origem.
> Só registrar o que o usuário decidiu ou pediu. Proposta não aprovada vai para `pendencias.md`.

## Dados e regras
| Data | Decisão | Origem |
|---|---|---|
| 19/10 | O `dsNwEmbalagens` publicado no Fluig é sempre o do GitHub `DataIT-Solucoes/BP-NW-DATASET` | Usuário (registrado no `widget_nw_bags`) |
| Anterior a 20/10 | Estabelecimento e item não mudam na edição; unidade vem do item, sem digitação manual; capacidade maior que zero, com até quatro casas decimais. Conversão de unidade pertence ao salvamento (regra a definir) | Regras do AGENTS/CLAUDE anterior, preservadas |

## Tela e comportamento
| Data | Decisão | Origem |
|---|---|---|
| 27/10 | **Sem carga inicial da tabela**: a tela abre vazia e a consulta só acontece quando o usuário clica em Buscar | Usuário: "Retire esse carregamento inicial da tabela, o usuário vai ter que buscar" |
| 23/10 | **Cabeçalho fixo** na tabela principal ao descer a página, copiado da tela de bags (`widget_nw_bags`, `prepararCabecalhoFixo`) | Usuário: "aplique o thead fixo na tabela principal… copie da tela de bags" |
| Anterior a 20/10 (data exata a definir) | Sem botão Limpar nos filtros | Usuário (AGENTS/CLAUDE anterior) |
| Anterior a 20/10 | Base visual: paleta e layout do `widget_nw_embalagens`, prefixo `nwi`. Base funcional histórica: aba Itens Controlados do protótipo `https://humcode.com.br/mockup-fluig.html` (não consultado na migração de 20/10) | AGENTS anterior |

## Forma de trabalho
| Data | Decisão | Origem |
|---|---|---|
| 23/10 | `BADGE_FILTROS.md` passa a ser versionado no git (deixa de ser "arquivo do usuário, fora do git") | Usuário: "é pra incluir" |
| 21/10 | Skill `fluig-branco-peres` local em `.claude/skills/` (cópia igual nos 4 widgets, sem cópia global); `.claude/` inteira no git | Usuário |
| 21/10 | Mesma organização do `widget_nw_bags`: regras no `AGENTS.md` (enxuto), `CLAUDE.md` só com `@AGENTS.md`; `contexto-ia/` vira `docs/` (decisoes, pendencias, referencias-backend, tela-e-codigo); `AI_HANDOFF` removido (histórico = `git log`); atualizar só o arquivo afetado | Usuário |
| 21/10 | Entrega por `scripts/entregar.ps1` (conferências, `.war`, commit só dos arquivos informados, push). **Mensagem de commit sempre com prefixo:** `DOCS: Texto`, `FIX: Texto`, `CHORE: Texto`; sem coautor | Usuário (padrão do `widget_nw_bags`) |
| 20/10 | **SEMPRE commit + push + compilar** ao concluir entregas (substitui a exigência de pedido a cada vez). Publicação no Fluig depende de pedido | Correção do usuário: "SEMPRE: Commit, push e compilar" |
| 20/10 | Adotado o `PADRAO_CONTEXTO_IA_WIDGETS.md` (AGENTS + README + `contexto-ia/`), substituído em 21/10 pela organização acima | Usuário |
