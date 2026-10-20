# widget_nw_itensComCtrllDeEmb

## Leitura inicial
- Ler este arquivo e os quatro arquivos `contexto-ia/AI_*.md` no início da sessão.
- Visão geral para desenvolvedores: [README.md](README.md).
- Ao concluir uma tarefa, atualizar o contexto afetado e manter o README coerente; não modificar documentos sem informação nova.
- Regras gerais existentes: `../../../CLAUDE.md`. O AGENTS da raiz citado anteriormente não foi encontrado nesta migração.
- Não há CLAUDE local duplicado. Se a ferramenta não carregar AGENTS automaticamente, orientar a leitura explícita dele e dos arquivos de contexto.

## Objetivo
Tela de **Itens Controlados**: cadastro, edição, exclusão e consulta da parametrização estabelecimento + item + tipo de embalagem + capacidade, com situação Ativo/Inativo.
Base visual: paleta e layout do `widget_nw_embalagens`, prefixo `nwi`. Base funcional histórica: aba Itens Controlados do protótipo `https://humcode.com.br/mockup-fluig.html`, sem botão Limpar por decisão do usuário. Protótipo não consultado nesta migração.

## Identificação
- `application.code` e `application.title`: `widget_nw_itensComCtrllDeEmb`.
- Versão: `0.1.0`; categoria `SYSTEM`; `application.uiwidget=true`; `application.mobileapp=false`.
- Context-root: `/widget_nw_itensComCtrllDeEmb`.
- Repositório local: esta pasta em `brancoperes2026/wcm/widget/`.
- Página/comunidade de uso: a definir.

## Arquitetura e integrações
- `src/main/resources/view.ftl`: cabeçalho, aba Única, filtros, tabela e dois diálogos nativos.
- `src/main/webapp/resources/js/widget_nw_itensComCtrllDeEmb.js`: SuperWidget, Tabulator, FLUIGC.autocomplete e chamadas ao dataset `dsNwEmbalagens` por `/api/public/ecm/dataset/search`.
- Ações chamadas no código: `consultarParametros`, `apoiarEstabelecimentos`, `apoiarItens`, `consultarTiposApoio`, `incluirParametro`, `alterarParametro`. Presença no fonte não comprova execução ou liberação no Fluig.
- Fonte da verdade do contrato e permissões: `../widget_nw_embalagens/datasets/dsNwEmbalagens.js`. Conferir o arquivo atual antes de alterar integrações; não editar o dataset sem pedido.
- Estrutura, recursos e configuração: README. Descobertas e limites: AI_REFERENCES.

## Regras de trabalho
- Português do Brasil, direto. O usuário define o escopo. Pendência registrada não autoriza execução; não abrir levantamentos, refatorações ou documentação adicional sem pedido.
- Respeitar as instruções gerais do projeto e as instruções atuais do usuário. Usar a skill `fluig-branco-peres` para este widget.
- Sempre realizar commit, push e compilação ao concluir uma entrega, por autorização permanente do usuário em 2026-10-20. Mostrar antes o conteúdo do commit. Esta regra substitui a exigência anterior de pedido a cada entrega. Nunca incluir pastas de referência, como `srv/` e `em_homologacao/`, nem alterações preexistentes fora do escopo.
- Compilação desta widget: gerar o WAR em `target/`, com `src/main/webapp/` na raiz e `src/main/resources/` em `WEB-INF/classes/`. Conferir entradas e conteúdo contra os fontes. Publicação no Fluig depende de pedido. Distinguir verificação local de validação no Fluig; marcar como “não confirmado” o que não foi visto. Preferir hash, contagem e diff a afirmações sem evidência.
- Cópias do servidor/homologação são somente leitura. Nunca ler `.r`. Não fazer varreduras amplas fora do projeto sem perguntar; se faltar arquivo, pedir ao usuário.
- Progress/Datasul (`.w/.p/.i/.cls`): usar a skill `progress-datasul` e ler `references/manutencao-e-contexto.md` antes de editar. Fontes CP850 + CRLF: nunca usar Write/Edit neles.
- Não inventar dataset, campo, serviço ou regra de negócio. O desconhecido fica “a definir”. Nunca armazenar credenciais.
- Medir e preservar encoding e quebras de linha dos arquivos editados. Não normalizar o widget inteiro sem decisão do usuário.
- Ambiente registrado: jQuery 3.6.3, Bootstrap 3.4.1 e Style Guide 2.5.0, fornecidos pelo Fluig; não carregar outra cópia. JavaScript novo/alterado deve usar jQuery; escopar por `this.DOM`/`instanceId` e CSS por `.fluig-style-guide.nwi`.

## Regras de negócio preservadas
- Sem botão Limpar nos filtros.
- Estabelecimento e item não mudam na edição.
- Unidade vem do item, sem digitação manual.
- Capacidade maior que zero, com até quatro casas decimais.
- Conversão de unidade pertence ao salvamento; regra a definir.

## Continuidade
- Estado e retomada: [AI_HANDOFF.md](contexto-ia/AI_HANDOFF.md).
- Decisões aprovadas: [AI_DECISIONS.md](contexto-ia/AI_DECISIONS.md).
- Pendências: [AI_TODO.md](contexto-ia/AI_TODO.md).
- Referências: [AI_REFERENCES.md](contexto-ia/AI_REFERENCES.md).
