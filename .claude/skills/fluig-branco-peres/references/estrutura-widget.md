# Estrutura de um widget e SuperWidget (extras)

Árvore de pastas, regra do `<nome>`, índices do `application.info` e o padrão SuperWidget (`bindings`, `data-params`,
`this.rest`) estão no `CLAUDE.md` da raiz (já carregado). Aqui fica só o que ele não traz.

## Pastas
- `WEB-INF/jboss-web.xml`: `<context-root>/<nome></context-root>`, `disable-cross-context=false`.
  `WEB-INF/web.xml`: `session-timeout` 30.
- `<nome>` também é o `locale.file.base.name`.
- Pastas extras que existem em `widget_nw_embalagens` (não entram no `.war`): `datasets/` (fonte dos datasets),
  `testes/` + `package.json` (testes Node), `fluig-rest/` (docs e fontes Progress do projeto Controle de Embalagens).

## `application.info` gerado
```
application.type=widget
application.code=<nome>
application.title=<nome>
application.description=<nome>
application.category=SYSTEM
application.icon=icon.png
application.renderer=freemarker
developer.code=FLUIG-VSCODE-EXTENSION
developer.name=FLUIG-VSCODE-EXTENSION
developer.url=https://github.com/fluiggers/fluig-vscode-extension
application.uiwidget=true
application.mobileapp=false
application.version=0.1.0
view.file=view.ftl
edit.file=edit.ftl
locale.file.base.name=<nome>
application.resource.js.1=/resources/js/<nome>.js
application.resource.css.2=/resources/css/<nome>.css
```
- Exemplo de novo recurso: `application.resource.js.3=/resources/js/chamar-embalagens.js`.
- `application.title` fica com o valor gerado; o **título exibido** na tela é outro (ex.: "Manutenção Embalagens").
- Versão do widget: `0.1.0` nos três atuais.

## SuperWidget (extras)
- Container nos widgets `nw`: `class="super-widget wcm-widget-class fluig-style-guide <prefixo>"`.
- `this.DOM` = jQuery da div do widget (confirmado no servidor de teste).
- Os widgets atuais usam `data-*` como ganchos (`data-novo`, `data-buscar`, `data-tabela`, `data-modal-...`) e
  ligam eventos por jQuery dentro de `init` (`$('[data-x]', this.DOM)`).
- REST: os widgets atuais usam `$.ajax` explícito em `/api/public/ecm/dataset/search`.
- Ids internos sempre com `-${instanceId}` (ex.: `id="nwm-est-de-${instanceId}"`); templates com
  `<script type="text/template" class="...-${instanceId}">`.

## `edit.ftl` gerado
Um card com título, subtítulo e versão; usa `class="super-widget wcm-widget-class fluig-style-guide"` e
`data-params="<nome>.instance()"`. Nenhum dos widgets atuais tem parâmetros de configuração.

## Checklist de widget novo
- [ ] `application.code`, var JS, `id`, `data-params`, `jboss-web.xml`, `locale.file.base.name` iguais.
- [ ] Container com `super-widget wcm-widget-class fluig-style-guide <prefixo>`.
- [ ] CSS: todo seletor começa com `.fluig-style-guide.<prefixo>`; variáveis de cor no topo.
- [ ] Recursos no `application.info` com índices contínuos.
- [ ] `AGENTS.md` do widget criado a partir de `assets/AGENTS.widget.template.md`.
- [ ] Encoding/CRLF medido e mantido.
- [ ] Sem credencial em arquivo; sem dataset/campo inventado.
- [ ] Cadeia de dados conforme `references/integracao-dataset-datasul.md` (ou mock declarado como mock).
- [ ] Empacotar/publicar o `.war` só quando o usuário pedir (`target/` é saída de build).
