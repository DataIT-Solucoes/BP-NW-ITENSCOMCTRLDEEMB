# widget_nw_itensComCtrllDeEmb

> Regras gerais (versões, SuperWidget, Style Guide, padrão `nw`): `CLAUDE.md` da raiz do repositório. Aqui fica só o que é deste widget.
> Preencher só com o que o usuário informou ou o que está nos fontes. O que não se sabe fica "a definir".
> O `CLAUDE.md` desta pasta só importa este arquivo (`@AGENTS.md`). Skill local: `.claude/skills/fluig-branco-peres/`.

## Onde está cada coisa (ler só o do assunto)
| Arquivo | Conteúdo |
|---|---|
| `docs/decisoes.md` | Decisões e correções do usuário (dados, tela, forma de trabalho). **Ler antes de mudar comportamento ou texto.** |
| `docs/pendencias.md` | Perguntas em aberto, propostas não aprovadas e o que falta confirmar no Fluig de TESTE |
| `docs/referencias-backend.md` | Contrato do Dataset (ações, parâmetros, campos), fontes da verdade, códigos de erro |
| `docs/tela-e-codigo.md` | Tela, modais e colunas; arquitetura e **mapa das funções do JS** (achar pelo mapa + Grep). O fonte manda |
| `BADGE_FILTROS.md` | Receita do badge dentro dos campos de filtro (arquivo do usuário, fora do git) |
| `README.md` | Visão geral para pessoas (GitHub). **Não precisa ler para trabalhar** |

Histórico e estado do trabalho: `git log`.

## Objetivo
Tela de **Itens Controlados**: cadastro, edição, exclusão e consulta da parametrização estabelecimento + item + tipo de embalagem +
capacidade, com situação Ativo/Inativo.

## Identificação
- `application.code` e `application.title`: `widget_nw_itensComCtrllDeEmb`
- Prefixo de classe CSS: `nwi` (container `.fluig-style-guide.nwi`)
- Padrão visual: o mesmo de `widget_nw_embalagens` (paleta, cabeçalho, abas, botões)
- Onde é usado (página/comunidade do Fluig): a definir
- Repositório: `https://github.com/HumbertoAlcantaraArruda/BP-WIDGET-ITENSCOMCTRLDEEMB`, branch **`master`**.

## Recursos declarados no `application.info`
| Índice | Tipo | Valor |
|---|---|---|
| 1 | js | `/resources/js/widget_nw_itensComCtrllDeEmb.js` |
| 2 | css | `/resources/css/widget_nw_itensComCtrllDeEmb.css` |

Próximo índice livre: 3

## Parâmetros de configuração (`edit.ftl`)
Nenhum (só o card de identificação).

## Dados (essencial; detalhes em `docs/referencias-backend.md`)
- Dataset `dsNwEmbalagens`, chamado por `chamarEmbalagens`. O publicado no Fluig é sempre o `dsNwEmbalagens.js` do GitHub
  **`DataIT-Solucoes/BP-NW-DATASET`**: ler esse arquivo antes de usar ação, parâmetro ou campo. Não editar o Dataset sem pedido.
- Ações: `consultarParametros`, `apoiarEstabelecimentos`, `apoiarItens`, `consultarTiposApoio`, `incluirParametro`, `alterarParametro`
  (`ALTERAR`, `INATIVAR`, `EXCLUIR`). Presença no fonte não comprova liberação no Fluig.

## Regras de negócio
- Sem botão Limpar nos filtros.
- Estabelecimento e item não mudam na edição (só tipo de embalagem e capacidade).
- Unidade vem do item, sem digitação manual.
- Capacidade maior que zero, com até quatro casas decimais.
- Conversão de unidade pertence ao salvamento; regra a definir.
- Gravação com versão e chave idempotente: resultado incerto pede conferência (Buscar) antes de nova tentativa; não repetir automaticamente.

## Forma de trabalho (pedidos do usuário)
Depois de **qualquer** ajuste, inclusive só em `.md`, **uma chamada só**:
```
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/entregar.ps1 -Mensagem "FIX: Texto" <arquivos...>
```
- Confere BOM e quebra de linha misturada nos fontes de `src/`; se algum arquivo estiver em `src/`, roda `node --check` e gera
  `target/widget_nw_itensComCtrllDeEmb.war` (`pack-widget.ps1`; Ctrl+F7 no VSCode faz o mesmo). Só `.md`: pula os dois.
- Commit **só dos arquivos informados** (nunca `target/` nem `BADGE_FILTROS.md`; apagado/renomeado: passar o caminho antigo também),
  em português, **sem coautor** e **sempre com prefixo**: `DOCS: Texto` (`.md`, `AGENTS.md`, `docs/`), `FIX: Texto` (código em `src/`),
  `CHORE: Texto` (manutenção, build, renomear sem mudar conteúdo).
- Push no branch atual e conferência do remoto (`git ls-remote`). `-Simular` faz tudo menos commit e push.
- Importar no Fluig (Painel de Controle → Desenvolvimento → Widgets): feito pelo usuário.

Ao fim da tarefa, atualizar **só** o arquivo de `docs/` afetado: decisão nova → `decisoes.md`; pergunta ou proposta → `pendencias.md`
(resolvida: tirar de lá); levantamento no backend → `referencias-backend.md`; mudança de comportamento da tela → `tela-e-codigo.md`.
O `README.md` só muda quando a visão geral mudar.
