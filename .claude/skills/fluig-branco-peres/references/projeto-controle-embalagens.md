# Projeto Controle e Rastreabilidade de Embalagens (contexto de negócio e dados)

Resumo do que o lado Fluig precisa saber. Fonte: `wcm/widget/widget_nw_embalagens/fluig-rest/docs/`
(`01_ESCOPO_TECNICO`, `02_DECISOES_TECNICAS` DT-001…DT-109, `03_PENDENCIAS`, `05_MODELO_DADOS`, `06_CATALOGO_PROCEDURES`,
`07_CICLO_VIDA_EMBALAGEM`, `entregas/*`). Esses arquivos são enormes e em boa parte tratam do **backend Progress**:
leia por trecho (`grep -n "^## DT-"` para achar a decisão). **Decisões posteriores prevalecem sobre o histórico;
pendência não é regra vigente.** Estado consolidado até 05–07/10/2026.

Cliente: Branco Peres. Responsável técnico Data IT (backend): Wallison Cheli. Dev Fluig (widgets): Humberto.
Ambiente: Datasul 12.1.2511.15, OpenEdge 12.2, Oracle; Fluig Silver Mist 1.8.1-230530 build 137 (a interface acusa
versão desatualizada; **upgrade fora do escopo**). Ambiente de implementação: TESTE.

## O que o projeto faz
- O recebimento fiscal é centralizado no **ANFE**; a atualização do documento no **RE1001** gera as etiquetas
  (identidades individuais de embalagem). O Fluig **não** cria o documento fiscal de entrada.
- Datasul continua dono do **saldo consolidado** (`saldo-estoq`); a rastreabilidade individual fica em tabelas
  `contr_emb_*` (10 tabelas, modelo v1.7 + incremento v1.8 candidata): `contr_emb_bag` (tipos de embalagem),
  `contr_emb_param` (parametrização), `contr_emb_evento`, `contr_emb_evento_item`, `contr_emb_etiqueta`,
  `contr_emb_movto`, `contr_emb_bag_lacre`, `contr_emb_oper`, `contr_emb_oper_item`, `contr_emb_audit`.
- Controle por **lote** (item + estabelecimento + lote + validade). Nada de referência (`cod-refer`) no modelo novo.
- Participação do item = só pela **parametrização própria** (estabelecimento + item + tipo + capacidade).
  Ativar um parâmetro converte o item para controle por lote no backend; o Fluig **não** tem tela de conversão.
- Saídas (transferência, devolução, empréstimo, armazenagem em terceiros) só são **iniciadas** pelo Fluig, na
  manutenção de etiquetas; a seleção de etiquetas existe só para notas criadas pelo Fluig (DT-084). Atualização,
  desatualização e cancelamento fiscal seguem no padrão Datasul (FT2100, RE0402, FT2200) e são refletidos por hooks.
- Compra que gera etiquetas: natureza `1101IS` (DT-027), primeiro recorte.

## Telas Fluig do projeto (MAPA_TELAS_FLUIG, 21/09/2026)
Mockup de referência: `docs/entregas/mockups/index.html`. Quatro áreas:
1. **Embalagens** (nova): abas **Tipos de Embalagem** (→ `widget_nw_embalagens`) e **Itens Controlados**
   (→ `widget_nw_itensComCtrllDeEmb`). Substitui a função legada "Item por Etiqueta".
2. **Bags**: ajustar a existente (`Controle-Bags`): abas Manutenção de Bags e Consulta de Bags. Backend de Bags
   **ainda não liberado** (só consultas `GET /bags` e `GET /conteudo-bag`); transições/lacre/descarte pendentes.
3. **Manutenção de etiquetas** (→ `widget_nw_manutEtiq`): preservar ao máximo a `manutencao-etiquetas-v2`; consulta,
   impressão/reimpressão sem criar identidade, detalhe/histórico, e operações de saída em modal único.
4. **Monitor de Documentos de Recebimento**: informativo; espera validação do AED padrão do ANFE. Não implementar.

Padrão visual aprovado: filtros no topo, Buscar/Limpar, **Novo** à direita, ações por linha, toggle Ativo/Inativo na
linha, cadastro/edição em modal, ações em lote com checkbox e comando logo acima da grade.
**Um único campo por entidade** (Estabelecimento, Item, Tipo): digita código ou descrição; o servidor faz o match
código **OU** descrição; a tela mostra código + descrição e envia o **código** selecionado.
Telas que **não** entram: formulário Fluig de recebimento; Monitor XML funcional; "Etiquetas Item — Centro de
Distribuição" (consolidar na manutenção só após paridade); conversão do item (interna ao salvar).

### Itens Controlados
Filtros: Estabelecimento, Item, Tipo de Embalagem, Situação. Modal: estabelecimento + item (imutáveis na edição),
unidade **somente leitura** (vem do item), tipo (só ativo para nova seleção), capacidade positiva até 4 casas.
Salvar usa POST/PATCH `/parametros`; toggle Ativo/Inativo = PATCH; excluir = PATCH `acao=EXCLUIR` (confirmação).
Pendente: se lote/validade de migração (Serial→Lote) serão pedidos ao usuário (`loteMigracao`, `validadeMigracao`
ISO `YYYY-MM-DD`) — **não fixar no layout** antes da prova ET-01H.

### Tipos de Embalagem
Código manual 2–3 caracteres `^[A-Z0-9]{2,3}$` (API normaliza para maiúsculas), imutável; descrição até 100;
sem exclusão (só inativar/reativar). `versao` protege concorrência. Decisão de tela atual: sigla até 2 no cadastro.

### Manutenção de etiquetas (base para `widget_nw_manutEtiq`)
- **`GET /etiquetas` só aceita filtros exatos**: `codEstabel`, `codEtiqueta`, `item`, `lote` (igualdade), `codTipo`,
  `tipoControle` (`EMBALAGEM`|`PRE_SALDO`), `tipoLocal` (`ESTAB`|`CAMPO`|`TERCEIRO`|`TRANSITO`), `situacao`
  (`ATIVA`|`ENCERRADA`|`CANCELADA`|`DESCARTADA`), `idBag`. Paginação por cursor `aposId`/`proximoId` (texto), limite
  padrão 20, máximo 100. **Não enviar parâmetros extras supondo que o servidor os aplica**; se um filtro ampliado
  estiver preenchido, impedir a chamada até existir contrato.
- **Filtros ainda sem contrato** (matriz): Depósito (E04), Localização (E05), Lote com autocomplete (E06), faixa de
  validade (E07/E08), Grupo (E10), Nota inicial/final e Notas específicas (E14–E16), `Cód Barras`. Apoios que existem:
  Estabelecimento, Item, Tipo, Família, Bag (`/bags`).
- **Modelo de situação do backend ≠ legenda da tela antiga.** O backend separa quatro dimensões: situação do ciclo
  (`ATIVA/ENCERRADA/CANCELADA/DESCARTADA`), posição física (`tipoLocal`, estabelecimento/depósito/localização/posse),
  vínculo com Bag (`idBag`) e quantidade (`qtidadeAtu`, `qtidadeIni`, capacidade). `TRANSITO` é posição, não situação;
  "em Bag" é vínculo. Os status do mockup `nwm` (Não Impresso, Impressa, Em estoque, Zerada, Armazenada em Bag,
  Descartado) vêm da tela legada e **não existem como campo único no backend novo** — ao integrar, o mapeamento é
  uma **decisão a perguntar ao usuário**; não inventar. "Impresso" não é persistido nos campos descritos (a
  reimpressão não altera identidade nem movimento).
- Projeção da etiqueta (`contr_emb_etiqueta`): `id-etiqueta`, `cod-etiqueta` (código público único, 24), `tipo-controle`,
  `it-codigo`, `cod-tipo`, `lote`, `dt-vali-lote`, `un`, `capacidade-emb`, `qtidade-ini`, `qtidade-atu`, `cod-estabel`,
  `cod-depos`, `cod-localiz`, `tipo-local`, `cod-emitente-posse`, `id-bag`, `situacao`, `id-movto-ult`, datas/usuários,
  `versao`. IDs vão como **texto** no JSON. Os nomes exatos das colunas do JSON de resposta devem ser conferidos no
  retorno real do dataset (`resultadoJson`) antes de mapear a grade.
- `PRE_SALDO` = saldo agregado anterior ao controle; **sem ações individuais**, não imprime, não entra em Bag.
- Impressão: `GET /dados-impressao` (um `idEtiqueta` por chamada); recusa `PRE_SALDO` (`ETIQUETA_NAO_IMPRIMIVEL`) e
  geração não confirmada (`GERACAO_NAO_CONFIRMADA`); não imprime papel nem define layout/cópias/serviço
  (lote de IDs, cópias e impressão de Bag **não contratados**). Reimpressão não cria identidade nem movimenta saldo.
- Histórico de movimentos (E22): proposta, sem rota.
- Operações de saída: **um modal** que se adapta pela **natureza** (DT-093/094). Ações aprovadas: **Transferência** e
  **Devolução** (compra e empréstimo no mesmo modal). Natureza escolhida no início; o backend classifica o ramo
  (`GET /operacoes/natureza`) e **revalida no comando**; sem lista fixa de códigos de natureza no Widget/Dataset.
  Devolução exige documento de origem + contraparte, itens/quantidades elegíveis (`GET /operacoes/embalagens-origem`),
  seleção de subconjunto; incompatibilidades são informadas, nunca excluídas em silêncio; agrupar por
  item/lote/validade/depósito/localização/unidade. Fracionar conteúdo de embalagem **não está aprovado**.
  Comandos no Dataset: `criarTransferencia`, `criarRemessa`, `criarDevolucao` (fonte; sem rota homologada).
  Limite informado: ~3.000 embalagens por operação e **200 s** na criação do WT pela BODI317 → resultado incerto
  exige consulta (`consultarResultadoOperacao`) antes de repetir.
- Natureza amigável (opções que o usuário vê) vem de cadastro; atalhos podem pré-filtrar mas a natureza validada é a autoridade.

## Dataset `dsNwEmbalagens` — ações fechadas (24, em `datasets/dsNwEmbalagens.js`)
**A lista abaixo é um resumo de 07/10/2026; o arquivo é a fonte da verdade (espelha o Fluig). Releia-o.**
Consulta: `consultarTipos`, `consultarParametros`, `consultarEtiquetas`, `apoiarEstabelecimentos`, `apoiarItens`,
`apoiarTipos` (= `consultarTiposApoio`), `apoiarFamilias`, `consultarBags`, `consultarConteudoBag`, `obterDadosImpressao`,
`consultarGeracao`, `classificarNatureza`, `consultarEmbalagensOrigem`, `consultarOperacoes`, `consultarResultadoOperacao`,
`consultarItensOperacao`, `consultarEventosOperacao`.
Escrita: `incluirTipo`, `alterarTipo`, `incluirParametro`, `alterarParametro`, `criarTransferencia`, `criarRemessa`,
`criarDevolucao`.
- Cada ação declara método/rota/campos aceitos/obrigatórios/cursor/teto; o Dataset rejeita campo fora da lista.
  Consultas com `estabel=true` recebem `estabelecimentoPermitido` (repetido) injetado; comandos recebem `usuario` e
  `estabelecimentosPermitidos`. Teto: 100 (tipos, parâmetros, etiquetas, geração, operações) e 20 (apoios, bags).
- Colunas de saída: `acao, sucesso, codigoErro, mensagem, httpStatus, total, temMais, campoCursor, proximoCursor,
  repeticao, resultadoJson`. Uma linha por chamada. `escritasHabilitadas` libera comandos um a um.
- Uma única invocação ao serviço, **sem retry automático**.
Modelo recebido: `fluig-rest/MODELO_DATASET_UNICO_HUMBERTO_20261006/` (README, `ACOES_DATASET.json`, `PROMPT_PARA_WORK.md`).

## Matriz de controles (IDs estáveis)
`docs/entregas/MATRIZ_TELAS_CAMPOS_ACOES.md` (110 controles; fonte `cobertura-telas.json`): P* = Embalagens
(Itens Controlados/Tipos), B* = Bags, E* = Manutenção de Etiquetas, M* = Monitor. Use o ID em dúvidas, tarefas e testes.
Regra do projeto: ao identificar um novo autocomplete/procedure, registrar na matriz e em `cobertura-telas.json` no
mesmo checkpoint, **mesmo pendente**.

## Estados de prontidão (não confunda)
Proposta → Contratada → Implementada (fonte) → Verificada em TESTE → Homologada (Widget→Dataset→serviço→API + aceite).
"Compilado", "ABL passou 30/0", "REST comprovado" e "homologado" são coisas diferentes. Mockup/layout aceito **não** é
integração aceita. Dados de demonstração só no protótipo, nunca como prova funcional.

## Segurança entre camadas (resumo)
Widget → apresentação e dados funcionais. Dataset → identidade da sessão, grupos, lista explícita de estabelecimentos,
chamada ao serviço. Progress → aplica o recorte e as regras; **não** interpreta nome de grupo nem aceita usuário do
navegador. Grupos reais por tela/ação e correspondência grupo→estabelecimento: **pendentes (DT-054)**; TESTE usa
`DefaultGroup-1`.

## Calendário oficial do projeto
Interface nova 21–25/09; APIs/telas 07–19/10; realização 22/10; testes 23–29/10; usuários 30/10–06/11. Planner Teams:
Fase 2 50% (o 51% local é histórico não sincronizado).

## Convenções de entrega do backend (para entender o que chega do Wallison)
- Pasta de entrega: `docs/entregas/pacotes/ET-01_TESTE`; copia-se a pasta completa sobrepondo, nunca espelhar/apagar.
- Fontes Progress compilados com SAVE no servidor TESTE; os `.r` voltam para a pasta (DT-105). **Nunca ler `.r`.**
- Hashes em `MANIFESTO_SHA256.csv`. Não enviar credenciais a ferramentas de IA.
- Caminho lógico SOAP/hook: `_bp/api/ET-01_TESTE/...` (DT-108/109) — assunto de backend, não do Widget.
