# AI_TODO — widget_nw_itensComCtrllDeEmb

Pendências não autorizam execução. A lista histórica de mocks foi corrigida: o código atual já contém apoios e gravações no dataset; falta confirmação no ambiente.

## Esperando decisão do usuário
- Especificar regra de conversão de unidade no salvamento.
- Informar página/comunidade de uso no Fluig.
- Decidir eventual normalização de quebras de linha do widget inteiro; fontes não normalizados nesta tarefa.
- Confirmar política de gravação do switch: o contexto anterior deixava a decisão em aberto; o código atual grava imediatamente, o que não comprova aprovação de negócio.

## Confirmar no Fluig
- Consulta inicial, filtros, descrições retornadas e paginação por cursor.
- Autocompletes do modal e filtros; badge e botão × limpando texto, código e seleção.
- Inclusão, edição, exclusão e troca de situação implementadas no cliente.
- Controle de versão, repetição idempotente, erros de permissão/escrita desabilitada e resultado de gravação incerto.
- Conversão de unidade efetiva no backend: não confirmada.

## Dependências externas
- Conferir contrato e liberação no dataset atual antes de alterar integração: `../widget_nw_embalagens/datasets/dsNwEmbalagens.js` a partir da raiz do widget. Grupos/estabelecimentos e escrita habilitada não verificados nesta migração; responsável a definir.
- Disponibilidade das descrições no ambiente: cliente lê os campos opcionais; retorno real não validado.
- Confirmar procedimento de publicação no Fluig e responsável quando essa atividade for solicitada; empacotamento local do WAR documentado no README.
