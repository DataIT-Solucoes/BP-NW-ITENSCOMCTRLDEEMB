# <nome_do_widget>

> Regras gerais (versões, SuperWidget, Style Guide, padrão `nw`): `CLAUDE.md` da raiz do repositório. Aqui fica só o que é deste widget.
> Preencher só com o que o usuário informou ou o que está nos fontes. O que não se sabe fica "a definir".
> O `CLAUDE.md` desta pasta só importa este arquivo (`@AGENTS.md`). Skill local: `.claude/skills/fluig-branco-peres/`
> (cópia igual nos 4 widgets).

## Onde está cada coisa (ler só o do assunto)
| Arquivo | Conteúdo |
|---|---|
| `docs/decisoes.md` | Decisões e correções do usuário (dados, textos, tela, forma de trabalho). **Ler antes de mudar comportamento ou texto.** |
| `docs/pendencias.md` | Perguntas em aberto, propostas não aprovadas e o que falta confirmar no Fluig de TESTE |
| `docs/referencias-backend.md` | Contrato do Dataset (ações, parâmetros, campos), fontes da verdade, rotas REST, códigos de erro |
| `docs/tela-e-codigo.md` | Arquitetura do JS, **mapa das funções do JS** e descrição da tela, modais e colunas. O fonte manda |
| `README.md` | Visão geral para pessoas (GitHub). **Não precisa ler para trabalhar** |

Histórico e estado do trabalho: `git log`.

## Objetivo
a definir

## Identificação
- `application.code`: `<nome_do_widget>`
- Título (`application.title`): a definir
- Prefixo de classe CSS: a definir (3 letras, ex.: `nwx`; container `.fluig-style-guide.nwx`)
- Onde é usado (página/comunidade do Fluig): a definir
- Repositório: a definir. Branch de trabalho: a definir.

## Recursos declarados no `application.info`
| Índice | Tipo | Valor |
|---|---|---|
| 1 | js | `/resources/js/<nome_do_widget>.js` |
| 2 | css | `/resources/css/<nome_do_widget>.css` |

Próximo índice livre: 3

## Parâmetros de configuração (`edit.ftl`)
a definir

## Dados (essencial; detalhes em `docs/referencias-backend.md`)
- Dataset `dsNwEmbalagens`: o publicado no Fluig é sempre o `dsNwEmbalagens.js` do GitHub **`DataIT-Solucoes/BP-NW-DATASET`**:
  ler esse arquivo antes de usar ação, parâmetro ou campo.
- Ações usadas: a definir

## Regras de negócio
a definir

## Forma de trabalho (pedidos do usuário)
Depois de **qualquer** ajuste, inclusive só em `.md`, **uma chamada só**:
```
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/entregar.ps1 -Mensagem "FIX: Texto" <arquivos...>
```
- Confere BOM e quebra de linha misturada nos fontes de `src/`; se algum arquivo estiver em `src/`, roda `node --check` e gera
  `target/<nome_do_widget>.war` (`pack-widget.ps1`; Ctrl+F7 no VSCode faz o mesmo). Só `.md`: pula os dois.
- Commit **só dos arquivos informados** (nunca `target/`; apagado/renomeado: passar o caminho antigo também), em português,
  **sem coautor** e **sempre com prefixo** (`FIX`, `FEAT`, `REFACTOR`, `PERF`, `STYLE`, `DOCS`, `TEST`, `CHORE`, `CI`, `BUILD`,
  `REVERT`, `SECURITY`): `DOCS: Texto` (`.md`, `AGENTS.md`, `docs/`), `FIX: Texto` (correção em `src/`), `FEAT: Texto` (funcionalidade nova),
  `CHORE: Texto` (manutenção, renomear sem mudar conteúdo).
- Push no branch atual e conferência do remoto (`git ls-remote`). `-Simular` faz tudo menos commit e push.
- Importar no Fluig (Painel de Controle → Desenvolvimento → Widgets): feito pelo usuário.

Ao fim da tarefa, atualizar **só** o arquivo de `docs/` afetado: decisão nova → `decisoes.md`; pergunta ou proposta → `pendencias.md`
(resolvida: tirar de lá); levantamento no backend → `referencias-backend.md`; mudança de comportamento da tela → `tela-e-codigo.md`.
O `README.md` só muda quando a visão geral mudar.
