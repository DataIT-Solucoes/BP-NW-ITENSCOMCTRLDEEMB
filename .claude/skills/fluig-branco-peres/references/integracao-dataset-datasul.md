# Integração: Widget → Dataset → serviço → REST Datasul

Fonte: `widget_nw_embalagens/README.md`, `fluig-rest/docs/entregas/ORIENTACAO_DEV_FLUIG_INTEGRACAO_20261005.md`,
`GUIA_DEV_FLUIG.md`. Projeto "Controle de Embalagens" (Datasul 12.1.2511.15 / OE 12.2 / Oracle; Fluig Silver Mist
1.8.1; ambiente de implementação TESTE). Documentação longa do projeto: `wcm/widget/widget_nw_embalagens/fluig-rest/docs/`
(`01_ESCOPO_TECNICO`, `02_DECISOES_TECNICAS`, `03_PENDENCIAS`, `06_CATALOGO_PROCEDURES`, `entregas/MATRIZ_APIS_REST.md`,
`ET-01G_API_REST_CADASTROS.md`, `ET-02A_CONSULTA_ETIQUETAS.md`, `ET-01I_APOIOS_AUTOCOMPLETE.md`,
`MATRIZ_TELAS_CAMPOS_ACOES.md`, `MAPA_TELAS_FLUIG.md`). São arquivos grandes: leia só o trecho necessário
(decisões posteriores prevalecem sobre o histórico; pendência **não** é regra vigente).

## Cadeia aprovada
```
Widget ── chamarEmbalagens(acao, parametros)
        └► POST /api/public/ecm/dataset/search { datasetId, filterFields:["acao",acao,"parametros",JSON], limit:"1" }
           └► Dataset customizado (WKUser/WKCompany, grupos do colleagueGroup, regras por ação)
              └► serviço autorizado (ex.: DATASUL_REST_HOMOLOG / DATASUL_REST_BP; Basic mantido no cadastro do Fluig)
                 └► /dts/datasul-rest/resources/prg/esp/v1/controle-embalagens/... ─► adaptador ABL (PASOE)
```
- Base REST validada em TESTE: `/dts/datasul-rest/resources/prg/esp/v1/controle-embalagens`.
- O Widget **nunca** envia usuário, empresa, grupo, endpoint, método nem estabelecimentos: o Dataset injeta/recusa.
  Lista explícita de ações e filtros aceitos; o navegador não escolhe URL/método/programa.
- Corpo HTTP usa **`filterFields`** (lista alternada nome/valor), não `constraints`. O Dataset recebe constraints
  dentro do `createDataset`.
- `limit:"1"` externo é do transporte (uma linha de envelope); o limite de negócio é `parametros.limite` (20 nas telas).
- `PROGRAM = "_bp/api/cd-ressuprimento.p"` do exemplo antigo **não** é URL deste projeto: não montar URL com nome de
  arquivo `.p` nem caminho `D:/...` no navegador.
- Credenciais só no cadastro do serviço Fluig; nunca ao Widget, a arquivos do projeto ou a ferramentas de IA.

## Dataset central do Controle de Embalagens
> **Leia sempre `widget_nw_embalagens/datasets/dsNwEmbalagens.js`**: por definição do usuário ele é idêntico ao que
> está no Fluig e vale mais que o resumo abaixo (que pode ficar defasado).
- `dsNwEmbalagens` (fonte em `widget_nw_embalagens/datasets/dsNwEmbalagens.js`): customizado, sem sincronização,
  24 ações fechadas, entrada `filterFields: acao + parametros(JSON)`, saída **uma linha** com `resultadoJson` =
  envelope da API.
- Modelo recebido (referência, **mantido como veio**): `fluig-rest/MODELO_DATASET_UNICO_HUMBERTO_20261006/`.
- `dsNwEmbalagensTipos` (antigo, uma linha por tipo): foi **removido da pasta `datasets/`** (git `D`, 07/10/2026);
  não usar.
- Config TESTE: `escritasHabilitadas` (aceita `true`/`false`/lista de ações) e `regras` por grupo → ações
  (TESTE usa `DefaultGroup-1`; grupos definitivos por ação **ainda a definir** — DT-054).
- Histórico (07/10/2026, README do widget): na época o Dataset não estava publicado no TESTE e toda chamada voltava
  `AUTORIZACAO_NAO_CONFIGURADA` enquanto os grupos não fossem configurados. O usuário informou depois que a pasta
  `datasets/` espelha o Fluig: confirme o estado em `NW_CONFIG.regras` e com o usuário antes de afirmar que funciona.
- Transporte reutilizável: `chamar-embalagens.js` (função global `chamarEmbalagens`, registrada no `application.info`
  como recurso js 3) e `autocomplete-limitado.js` (autocomplete com transporte injetado).

## Contrato de resposta (conferir sempre)
- Verificar **HTTP e** `sucesso`, `codigoErro`, `mensagem`: HTTP 200 pode conter recusa de negócio.
- `sucesso=false` **nunca** vira lista vazia. Parse JSON protegido (erro SOAP/HTML/texto não pode virar silêncio).
- Conservar o envelope: dados, cursor/paginação (`temMais`, `proximoCodigo`, `aposCodigo`), `versao`, `repeticao`.
- Distinguir: carregando · vazio válido · erro de negócio · erro técnico · falta de permissão.
- IDs INTEGER atravessam o JSON como **texto**: não converter códigos em número. Exceção documentada: `versao`
  vai como **número** no corpo de tipos.
- Não logar cookies, tokens, senha, headers de autenticação nem `oInput` completo.

## Escrita: idempotência, versão, falha incerta
- Todo comando leva `chaveIdempotente` (UUID v4 por `crypto.getRandomValues`, pois o Fluig de teste é HTTP e não
  tem `crypto.randomUUID`). Mesma intenção + mesmo conteúdo → **mesma chave** em retry; conteúdo diferente → chave
  nova; descartar a chave quando o comando é confirmado. Não gerar chave nova a cada tentativa de rede.
- Alterações enviam `versao` esperada; em `CONFLITO_VERSAO` reler e mostrar o estado atual, sem sobrepor.
- Falha de rede/HTTP/resposta ilegível = **resultado incerto**: não repetir sozinho; orientar a conferir
  (Buscar) antes de tentar de novo. `repeticao: true` na resposta gera aviso.
- Desabilitar o botão até a resposta (sem duplo envio); modal não fecha enquanto grava; sucesso aplica na tabela a
  fotografia devolvida e destaca a linha.
- Busca nova cancela a anterior (`jqXHR.abort()`); resposta antiga é ignorada. `chamarEmbalagens` devolve promise
  jQuery com `.abort()`.

## Rotas existentes no fonte (07/10/2026; existência ≠ homologação, ver `MATRIZ_APIS_REST.md`)
GET/POST/PATCH `/tipos` · GET/POST/PATCH `/parametros` · GET `/etiquetas` · GET `/apoios/{estabelecimentos,itens,tipos,familias}`
· GET `/bags` · GET `/conteudo-bag` · GET `/dados-impressao` · GET `/geracoes` · GET `/operacoes/natureza` ·
GET `/operacoes/embalagens-origem`. **Não** existem rotas POST de WT (transferência, devolução, empréstimo,
armazenagem): não inventar. Recebimento é criado pelo ANFe/Datasul; o Fluig não recria a entrada.
Natureza fiscal é classificada pelo backend, sem códigos fiscais fixos na tela.

## Autorização
- `WKUser`/empresa vêm do contexto confiável do Fluig; grupos e estabelecimentos autorizados são reconstruídos no
  servidor (`colleagueGroup`: filtro `colleagueGroupPK.colleagueId` funciona via API REST; nomes de coluna
  `companyId/groupId/colleagueId`; dentro de Dataset publicado **não confirmado**).
- Tipos de embalagem são globais e exigem permissão funcional, sem dimensão de estabelecimento.

## Testes locais (`widget_nw_embalagens`)
`npm test` roda `testes/*.cjs` (Dataset, transporte, tela) com jQuery falso e serviço simulado — sem Fluig/Datasul reais;
**não substituem** a homologação no servidor. Último resultado registrado: Dataset 25/0, transporte 7/0, tela 9/0.
Ao mexer na tela/transporte, rode e relate o resultado real.

## Calendário do projeto (informado em 16/09/2026)
Interface 21–25/09; APIs/telas 07–19/10; realização 22/10; testes 23–29/10; usuários 30/10–06/11.
"Layout aceito" não é "integração aceita".
