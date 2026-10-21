# Widgets existentes (estado em 07/10/2026)

Confirme o estado no `AGENTS.md`/`CLAUDE.md` do próprio widget antes de afirmar algo: eles são a fonte atual.

| Widget | Prefixo | Tela | Estado |
|---|---|---|---|
| `widget_nw_embalagens` | `nwe` (classes `embalagens-*`, container `cadastro-embalagens`, var JS `cadastroEmbalagens`) | **Tipos de Embalagens**: consultar, cadastrar, alterar descrição, inativar/reativar | Integrado ao Dataset `dsNwEmbalagens` (ainda não publicado no TESTE); testes locais `npm test`. Página: `/portal/p/1/cadastro_de_embalagens` (TESTE) |
| `widget_nw_itensComCtrllDeEmb` | `nwi` | **Itens Controlados**: parametrização estabelecimento + item + tipo de embalagem + capacidade, situação Ativo/Inativo | Mockup com dados mockados (`NWI_DADOS_MOCK`/`NWI_FONTES`); sem dataset/REST. Arquivos em **LF** |
| `widget_nw_manutEtiq` | `nwm` | **Manutenção Embalagens**: consulta, recebimento, impressão e movimentação de etiquetas (refaz a tela legada Manutenção Itens/Etiquetas, `v2_widget_manutencao_etiquetas`) | Mockup completo, visão ADM, aba única; sem dataset/REST; `AGENTS.md` já existe |

## Detalhes úteis por widget

### widget_nw_embalagens
- Colunas: Descrição · Sigla (código, como etiqueta) · Situação · Ações. Uma consulta = 20 tipos; "Carregar mais" por cursor.
- Sigla: até 2 caracteres no cadastro pela tela (decisão de tela; a API aceita até 3), imutável na edição.
- A API de tipos **não exclui**: lixeira virou **Inativar/Reativar** (Reativar = `ALTERAR` com `ativo:true`).
- Busca: descrição contém o texto e, com até 3 caracteres, também o código exato (2ª consulta `codigoDe=codigoAte`).
- Recursos `application.info`: 1 js, 2 css, 3 js (`chamar-embalagens.js`); próximo livre: 4.
- Modais são `<dialog>`, avisos `FLUIGC.toast`.

### widget_nw_itensComCtrllDeEmb
- Tabela: Estabelecimento | Item | Unidade | Tipo de Embalagem | Capacidade | Situação | Ações; paginação de 10.
- Regras: estabelecimento e item imutáveis na edição; unidade vem do item; capacidade > 0 com até 4 casas;
  conversão de unidade pertence ao salvamento (regra não especificada).
- Contratos citados (não implementados): `consultarEstabelecimentos` GET /apoios/estabelecimentos, `consultarItens`
  GET /apoios/itens, `consultarParametros` GET /parametros, `salvarParametro` POST/PATCH /parametros.
- Base funcional: protótipo `https://humcode.com.br/mockup-fluig.html`.

### widget_nw_manutEtiq
- Status (chave → rótulo): `nao-impresso` Não Impresso · `impressa` Impressa · `em-estoque` Em estoque · `zerada` Zerada ·
  `armazenada-bag` Armazenada em Bag · `descartado` Descartado. "Em campo" ignorado por decisão do usuário.
- Ações por status (visão ADM): ver tabela no `AGENTS.md` do widget. Só Imprimir→Impressa, Receber→Em estoque e
  Descartar→Descartado têm destino claro; **Estornar** e **Transferir** são "regra a definir".
- Validação herdada: Estabelecimento De **e** Até obrigatórios; Itens **ou** Nota Fiscal obrigatório.
- Pendências: permissão de ADM (grupos legados `adm_abas_etiquetas`, `adm_etiquetas`), visão não-ADM, Nota Fiscal
  "Específicas", "Qtde Sel.".
- O git desse widget está na própria pasta; a decisão de onde fica o repositório está em aberto.

## Projeto de dados (Controle de Embalagens)
Detalhes de negócio, filtros suportados, ações do Dataset e o descompasso entre os status do mockup `nwm` e o modelo
do backend: `references/projeto-controle-embalagens.md`.

## Manter esta lista
Ao criar um widget novo, acrescente a linha aqui (nas duas cópias da skill) quando o usuário pedir para registrar.
