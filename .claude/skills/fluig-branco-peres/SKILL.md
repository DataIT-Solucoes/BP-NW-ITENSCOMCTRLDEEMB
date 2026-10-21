---
name: fluig-branco-peres
description: Contexto e padrões dos widgets WCM do TOTVS Fluig da Branco Peres (repositório brancoperes2026, pasta wcm/widget/<nome>/, prefixos nwe/nwi/nwm, widgets widget_nw_*). Use ao criar widget/tela nova ("no padrão das outras"), ao ligar ou mudar dados (dataset dsNwEmbalagens, Controle de Embalagens, etiquetas, cadeia Widget → Dataset → REST Datasul), ao escrever UI nova no padrão visual nw ou ao revisar um widget inteiro. Para ajuste pontual em widget existente (texto, CSS, correção localizada), o CLAUDE.md da raiz e o AGENTS.md do widget bastam e a skill não precisa ser carregada. Traz as versões confirmadas (jQuery 3.6.3, Bootstrap 3.4.1, Style Guide 2.5.0), a estrutura gerada pela extensão fluig-vscode-extension, o padrão visual Branco Peres, a cadeia Widget → Dataset → serviço → REST Datasul e as armadilhas já descobertas, para não refazer o que já foi decidido.
---

# Fluig Branco Peres

Conhecimento acumulado do repositório de widgets Fluig da Branco Peres. Serve para qualquer widget novo ou
existente: o objetivo é **não perder configuração e não redescobrir** o que já foi decidido.

Repositório de referência: `C:\Users\DataIt\Documents\brancoperes2026` (aqui chamado de `<raiz>`).
Um widget por pasta em `<raiz>/wcm/widget/<nome>/`. Todo caminho abaixo é relativo a `<raiz>`, mesmo quando a
sessão foi aberta dentro de um widget.

**O `CLAUDE.md` da raiz já está carregado na sessão e é a fonte do que é comum** (versões e consequências de
Bootstrap 3/jQuery 3, ícones, estrutura e `application.info`, SuperWidget, componentes misc, resumo do padrão `nw`,
tabela das notas do Style Guide, pegadinhas, regras de trabalho). Esta skill **não repete** isso: traz só o que é a mais.

## Como usar esta skill

1. Leia este arquivo inteiro (é curto). Depois leia **só** a referência do assunto:

| Assunto | Arquivo |
|---|---|
| Extras de ambiente: CDN/SRI e fallback, `$.trim`, encoding, atalho Progress | `references/ambiente-e-regras.md` |
| Widget novo: `application.info` completo, ganchos `data-*`, `edit.ftl`, checklist | `references/estrutura-widget.md` |
| Visual: paleta, classes `nwX-*`, cabeçalho, filtros, tabela, modais, CDN | `references/padrao-visual-nw.md` |
| Dados: Dataset, serviço, REST Datasul, idempotência, erros | `references/integracao-dataset-datasul.md` |
| O que cada widget existente faz e em que estado está | `references/widgets-existentes.md` |
| Negócio e dados do Controle de Embalagens: telas, etiquetas, filtros suportados, ações do Dataset, estados de prontidão | `references/projeto-controle-embalagens.md` |
| Modelo de `AGENTS.md` por widget | `assets/AGENTS.widget.template.md` |

2. Antes de mexer em um widget existente, leia o `AGENTS.md` (ou `CLAUDE.md`) da pasta dele: lá ficam
   objetivo, decisões do usuário, campos, pendências. Esta skill traz só o que é comum a todos.
   Se o widget for de dados (consulta/gravação), leia também `references/projeto-controle-embalagens.md` antes
   de propor filtros, colunas, status ou ações: o backend só aceita o que está contratado, e a documentação
   completa do projeto está em `wcm/widget/widget_nw_embalagens/fluig-rest/docs/` (use `grep -n "^## DT-"` em
   `02_DECISOES_TECNICAS.md` e a matriz `entregas/MATRIZ_TELAS_CAMPOS_ACOES.md`, em vez de ler tudo).
3. Para UI, use as notas do Style Guide em `<raiz>/.claude/docs/fluig-style-guide/`, como manda o `CLAUDE.md` da raiz
   (a skill não tem cópia delas).

## Regras de trabalho (além das do `CLAUDE.md` da raiz)

- Prefira evidência (contagem, diff, teste rodado) a dizer que funcionou. Marque "não confirmado" o que não foi visto.
- Commit/push: mostre antes o que vai entrar.
- Fontes Progress (`.p/.i/.w/.cls`) são CP850 + CRLF: nunca Write/Edit neles; nunca ler `.r` (compilado).
  Para isso use a skill `progress-datasul`.

## Dataset: sempre ler o fonte (fonte da verdade)

O Dataset do projeto está em `wcm/widget/widget_nw_embalagens/datasets/` (hoje `dsNwEmbalagens.js`) e, por
definição do usuário, **esse arquivo é sempre igual ao que está no Fluig**. Portanto:

- **Antes de qualquer trabalho que toque dados** (listar/filtrar, gravar, autocomplete, nova tela, nova ação), leia o
  arquivo atual do Dataset: ele manda mais que esta skill e que os documentos. Em especial `NW_CONFIG`
  (serviço, `escritasHabilitadas`, `regras` por grupo), `NW_ACOES` (a lista fechada de ações, com rota, campos aceitos,
  obrigatórios, cursor e teto) e `NW_COLUNAS` (colunas da resposta).
- Só existe o que está em `NW_ACOES`. Ação, parâmetro ou coluna que não esteja lá **não existe no Fluig**: não invente
  nem chame; diga que falta e pergunte ao usuário. Parâmetro fora da lista do Dataset é recusado (`ENTRADA_INVALIDA`).
- Ação existente ≠ ação liberada: confira também `regras` (grupo × ação) e `escritasHabilitadas` do mesmo arquivo.
- Não edite o Dataset sem pedido. Se a tela precisa de uma ação nova ou de um campo novo, proponha a mudança no arquivo
  e lembre que o usuário precisa republicar no Fluig e manter a pasta igual ao servidor.
- Dataset antigo `dsNwEmbalagensTipos.js` foi removido da pasta (git mostra `D` em 07/10/2026); não use `dsNwEmbalagensTipos`
  em widget novo.
- Notas dos docs/CLAUDE.md dizendo "Dataset não publicado" (07/10) são histórico e podem estar defasadas: o que vale é o arquivo.
- Se o arquivo não estiver acessível na sessão, peça ao usuário; não reconstrua de memória a partir desta skill.

## Ambiente (além do `CLAUDE.md` da raiz)

Fluig servidor: Silver Mist 1.8.1 (TESTE roda em HTTP, sem `crypto.randomUUID`).

## Os cinco erros mais caros (leia antes de escrever UI)

1. a 3. Estão no `CLAUDE.md` da raiz: **Bootstrap 3** (sem classes do BS4/5, sem `glyphicon`); tudo dentro de
   `.fluig-style-guide` com seletor `.fluig-style-guide.<prefixo>` (sem isso, `.fluig-style-guide header`, `h2`…
   vencem e desmontam o layout); **escopar por `this.DOM` / `instanceId`**, nada de `id` global fixo.
4. **jQuery, não JS puro — em TODO código novo ou alterado**: `$('<tag>', {...})`, `.attr/.prop/.append/.appendTo`,
   `.on/.off`, `$.ajax`, `$.each`; nada de `fetch`/`async-await`/`document.createElement`/`setAttribute`/`querySelector`/
   `addEventListener`. Mesmo que o trecho vizinho esteja em JS puro, o que você escrever é jQuery (modelo:
   `montarBotoesAcoes` em `widget_nw_embalagens.js`). Releia esta regra antes de escrever JS.
5. **Identidade e permissão nunca vêm do navegador.** O Widget envia filtros/dados de negócio; usuário, empresa,
   grupos e estabelecimentos autorizados são resolvidos no Dataset (servidor).

## Fluxo para widget NOVO (resumo; detalhes em `references/estrutura-widget.md`)

1. Gerar o esqueleto com a extensão VSCode **fluig-vscode-extension** (fluiggers). Se o usuário já gerou, medir
   encoding/quebra de linha dos arquivos antes de editar.
2. Definir o **prefixo de classe** (`nwe`, `nwi`, `nwm`… 3 letras) e o `application.code` (`widget_nw_<nome>`).
3. Copiar `assets/AGENTS.widget.template.md` para `wcm/widget/<nome>/AGENTS.md` e preencher **só** com o que o
   usuário informar ou o que estiver nos fontes.
4. Montar `view.ftl` / JS / CSS no padrão de `references/padrao-visual-nw.md` (começando com dados mockados se o
   dataset ainda não existe) e só depois ligar ao Dataset (`references/integracao-dataset-datasul.md`).
5. Registrar recursos no `application.info` (regra de índice no `CLAUDE.md` da raiz).

## AGENTS.md × CLAUDE.md (Claude Code e Codex)

- **Codex** lê `AGENTS.md`; **Claude Code** lê `CLAUDE.md`. Para manter uma fonte única, escreva as regras do
  widget em `AGENTS.md` e deixe o `CLAUDE.md` da mesma pasta só com a linha `@AGENTS.md` (o Claude Code importa o arquivo).
- Esta skill é **local**: fica em `.claude/skills/fluig-branco-peres/` de **cada** widget (os 4, versionada no git
  de cada um). Não há cópia global em `~/.claude/skills` nem em `~/.agents/skills` (21/10/2026; não procurar).
  As 4 cópias têm de ser iguais: ao mudar um arquivo da skill, copiar a mudança para os outros 3 widgets.
- Cada widget segue a mesma organização: `AGENTS.md` enxuto (regras do widget + tabela "Onde está cada coisa"),
  `docs/decisoes.md`, `docs/pendencias.md`, `docs/referencias-backend.md`, `docs/tela-e-codigo.md` (mapa das
  funções do JS) e `scripts/entregar.ps1` (conferências + `.war` + commit + push). Histórico: `git log`.
- Os 4 widgets têm `AGENTS.md`; a raiz tem só `CLAUDE.md`. Não crie `AGENTS.md` na raiz sem o usuário pedir.

## Quando algo não bate

Se um fato desta skill conflitar com o fonte ou com o que o usuário disser agora, vale o fonte/o usuário:
a skill é resumo de 07/10/2026 e pode estar defasada. Avise a divergência e proponha atualizar a skill.
