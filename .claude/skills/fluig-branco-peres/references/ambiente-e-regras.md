# Ambiente e regras (extras)

Versões e suas consequências, ícones, componentes misc no `application.info`, encoding e pegadinhas do Style Guide
estão no `CLAUDE.md` da raiz (já carregado). Aqui fica só o que ele não traz.

## jQuery 3
- Além do que o `CLAUDE.md` lista: `$.isArray` → `Array.isArray`; `$.trim` → `.trim()`.

## Encoding e quebra de linha
- Medido em 21/10/2026 (Python): `application.info` está em **LF nos 4 widgets**; o resto varia por arquivo
  (ex.: `widget_nw_bags.js` LF, `.css`/`view.ftl` dele CRLF; `itensComCtrllDeEmb` tem `view.ftl` e `.css` em LF).
  **Meça antes de editar e mantenha o que o arquivo já tem.**
- No Git Bash desta máquina, `grep -c $'\r'` e `awk` dão resultado errado (o grep conta toda linha). Conferir com
  Python: `python -I -c "b=open('ARQ','rb').read(); print(b.count(b'\r\n'), b.count(b'\n'))"`.
- Fontes Progress: CP850 + CRLF (skill `progress-datasul`).

## Scripts externos (CDN)
- Origens: Bootstrap Icons 1.11.3 (jsDelivr), Mulish (Google Fonts), Tabulator 6.4.0 (cdnjs), Select2 4.0.13 +
  `i18n/pt-BR.js` (cdnjs, no `manutEtiq`).
- No `widget_nw_manutEtiq` os `<script>` ficam declarativos no `view.ftl` (SRI sha384), não injetados pelo JS.
  Preferir esse formato em widget novo.
- Sem internet os ícones/fonte somem e a tabela mostra mensagem de erro (`nwm-tabela-erro` / "Não foi possível
  carregar a tabela..."): manter esse fallback.

## Encerrar
- Atalho do usuário para encerrar programa/sessão Progress em execução: **CTRL + FN + P**.
