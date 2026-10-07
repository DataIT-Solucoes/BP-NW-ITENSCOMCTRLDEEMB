<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Mulish:wght@400;600;700;800&display=swap">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/tabulator/6.4.0/css/tabulator_simple.min.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.13/css/select2.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.13/js/select2.min.js" integrity="sha384-JnbsSLBmv2/R0fUmF2XYIcAEMPHEAO51Gitn9IjL4l89uFTIgtLF1+jqIqqd9FSk" crossorigin="anonymous"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.13/js/i18n/pt-BR.js" integrity="sha384-ukGBtXgWlWvAnvqBKFZnHi6C8eJqbLdnBc5ry6vVybVVjK4ExBTxUwn9tjJO8boy" crossorigin="anonymous"></script>

<div id="widget_nw_itensComCtrllDeEmb_${instanceId}" class="super-widget wcm-widget-class fluig-style-guide nwi" data-params="widget_nw_itensComCtrllDeEmb.instance()">
    <div class="nwi-cabecalho">
        <span class="nwi-selo" aria-hidden="true"><span class="nwi-selo-miolo"><i class="bi bi-sliders"></i></span></span>
        <div class="nwi-cabecalho-texto">
            <h2 class="nwi-cabecalho-titulo">Itens Controlados</h2>
            <p class="nwi-cabecalho-subtitulo">Cadastre, edite, exclua e consulte os itens com controle de embalagem.</p>
        </div>
        <div class="nwi-cabecalho-acoes">
            <button type="button" class="nwi-btn nwi-btn-destaque" data-novo><i class="bi bi-plus-lg" aria-hidden="true"></i>Novo</button>
        </div>
    </div>
    <div class="nwi-tabs" role="tablist" aria-label="Seções">
        <button type="button" class="nwi-tab is-active" role="tab" aria-selected="true" tabindex="0" data-aba="itens-controlados" data-tab><i class="bi bi-list-check" aria-hidden="true"></i>Itens Controlados</button>
        <span class="nwi-tabs-indicador" aria-hidden="true"></span>
    </div>
    <div class="nwi-filtros" role="search" aria-label="Filtros">
        <div class="nwi-campo">
            <label class="nwi-campo-rotulo" for="nwi-filtro-est-${instanceId}">Estabelecimento</label>
            <div class="nwi-campo-caixa">
                <i class="bi bi-search" aria-hidden="true"></i>
                <input type="text" id="nwi-filtro-est-${instanceId}" class="nwi-campo-input" placeholder="Digite código ou descrição" maxlength="100" autocomplete="off" data-filtro-est>
            </div>
        </div>
        <div class="nwi-campo">
            <label class="nwi-campo-rotulo" for="nwi-filtro-item-${instanceId}">Item</label>
            <div class="nwi-campo-caixa">
                <i class="bi bi-search" aria-hidden="true"></i>
                <input type="text" id="nwi-filtro-item-${instanceId}" class="nwi-campo-input" placeholder="Digite código ou descrição" maxlength="100" autocomplete="off" data-filtro-item>
            </div>
        </div>
        <div class="nwi-campo">
            <label class="nwi-campo-rotulo" for="nwi-filtro-tipo-${instanceId}">Tipo de Embalagem</label>
            <div class="nwi-campo-caixa">
                <i class="bi bi-search" aria-hidden="true"></i>
                <input type="text" id="nwi-filtro-tipo-${instanceId}" class="nwi-campo-input" placeholder="Digite código ou descrição" maxlength="100" autocomplete="off" data-filtro-tipo>
            </div>
        </div>
        <div class="nwi-campo">
            <label class="nwi-campo-rotulo" for="nwi-filtro-situacao-${instanceId}">Situação</label>
            <div class="nwi-campo-caixa nwi-campo-caixa-select">
                <select id="nwi-filtro-situacao-${instanceId}" class="nwi-campo-input nwi-campo-select" data-filtro-situacao>
                    <option value="todos">Todos</option>
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                </select>
            </div>
        </div>
        <div class="nwi-filtros-acoes">
            <button type="button" class="nwi-btn nwi-btn-destaque" data-buscar><i class="bi bi-search" aria-hidden="true"></i>Buscar</button>
        </div>
    </div>
    <div class="nwi-tabela" data-tabela></div>
    <script type="text/template" class="nwi-apoio-sugestao-${instanceId}"><span>{{rotulo}}</span></script>

    <dialog class="nwi-modal" aria-labelledby="nwi-modal-titulo-${instanceId}" data-modal-cadastro>
        <form class="nwi-modal-form" novalidate>
            <div class="nwi-modal-cabecalho">
                <div>
                    <h3 class="nwi-modal-titulo" id="nwi-modal-titulo-${instanceId}" data-modal-titulo>Novo item controlado</h3>
                    <p class="nwi-modal-subtitulo" data-modal-subtitulo>Preencha os dados para criar a parametrização.</p>
                </div>
                <button type="button" class="nwi-modal-fechar" aria-label="Fechar" data-fechar-modal><i class="bi bi-x-lg" aria-hidden="true"></i></button>
            </div>

            <div class="nwi-modal-corpo">
                <div class="nwi-modal-grid">
                    <div class="nwi-campo">
                        <label class="nwi-campo-rotulo" for="nwi-form-est-${instanceId}">Estabelecimento</label>
                        <div class="nwi-campo-caixa" data-auto="estabelecimentos">
                            <input type="text" id="nwi-form-est-${instanceId}" name="estabelecimento" class="nwi-campo-input nwi-campo-input-simples" placeholder="Digite código ou descrição" autocomplete="off" role="combobox" aria-expanded="false" aria-autocomplete="list" aria-controls="nwi-form-est-lista-${instanceId}" aria-describedby="nwi-form-est-erro-${instanceId}" required autofocus>
                            <ul class="nwi-sugestoes" id="nwi-form-est-lista-${instanceId}" role="listbox" aria-label="Estabelecimentos encontrados" hidden></ul>
                        </div>
                        <p class="nwi-campo-erro" id="nwi-form-est-erro-${instanceId}" data-erro="estabelecimento"></p>
                    </div>
                    <div class="nwi-campo">
                        <label class="nwi-campo-rotulo" for="nwi-form-item-${instanceId}">Item</label>
                        <div class="nwi-campo-caixa" data-auto="itens">
                            <input type="text" id="nwi-form-item-${instanceId}" name="item" class="nwi-campo-input nwi-campo-input-simples" placeholder="Digite código ou descrição" autocomplete="off" role="combobox" aria-expanded="false" aria-autocomplete="list" aria-controls="nwi-form-item-lista-${instanceId}" aria-describedby="nwi-form-item-erro-${instanceId}" required>
                            <ul class="nwi-sugestoes" id="nwi-form-item-lista-${instanceId}" role="listbox" aria-label="Itens encontrados" hidden></ul>
                        </div>
                        <p class="nwi-campo-erro" id="nwi-form-item-erro-${instanceId}" data-erro="item"></p>
                    </div>
                    <div class="nwi-campo">
                        <label class="nwi-campo-rotulo" for="nwi-form-unidade-${instanceId}">Unidade</label>
                        <input type="text" id="nwi-form-unidade-${instanceId}" name="unidade" class="nwi-campo-input nwi-campo-input-simples" readonly tabindex="-1">
                    </div>
                    <div class="nwi-campo">
                        <label class="nwi-campo-rotulo" for="nwi-form-tipo-${instanceId}">Tipo de Embalagem</label>
                        <div class="nwi-campo-caixa">
                            <input type="text" id="nwi-form-tipo-${instanceId}" name="tipo" class="nwi-campo-input nwi-campo-input-simples" placeholder="Digite código ou descrição" maxlength="100" autocomplete="off" aria-describedby="nwi-form-tipo-erro-${instanceId}" required>
                        </div>
                        <p class="nwi-campo-erro" id="nwi-form-tipo-erro-${instanceId}" data-erro="tipo"></p>
                    </div>
                    <div class="nwi-campo">
                        <label class="nwi-campo-rotulo" for="nwi-form-capacidade-${instanceId}">Capacidade</label>
                        <input type="number" id="nwi-form-capacidade-${instanceId}" name="capacidade" class="nwi-campo-input nwi-campo-input-simples" min="0.0001" step="0.0001" placeholder="0,0000" autocomplete="off" required aria-describedby="nwi-form-capacidade-erro-${instanceId}">
                        <p class="nwi-campo-erro" id="nwi-form-capacidade-erro-${instanceId}" data-erro="capacidade"></p>
                    </div>
                </div>
            </div>

            <div class="nwi-modal-rodape">
                <button type="button" class="nwi-btn nwi-btn-contorno" data-fechar-modal>Cancelar</button>
                <button type="submit" class="nwi-btn nwi-btn-destaque"><i class="bi bi-check-lg" aria-hidden="true"></i><span data-modal-salvar>Criar parametrização</span></button>
            </div>
        </form>
    </dialog>

    <dialog class="nwi-modal nwi-modal-pequeno" role="alertdialog" aria-labelledby="nwi-excluir-titulo-${instanceId}" aria-describedby="nwi-excluir-texto-${instanceId}" data-modal-excluir>
        <div class="nwi-modal-confirmacao">
            <span class="nwi-confirmacao-icone" aria-hidden="true"><i class="bi bi-trash3"></i></span>
            <h3 class="nwi-modal-titulo" id="nwi-excluir-titulo-${instanceId}">Excluir item controlado?</h3>
            <p class="nwi-modal-subtitulo" id="nwi-excluir-texto-${instanceId}">O item <strong data-excluir-item></strong> será removido da lista. Essa ação não pode ser desfeita.</p>
        </div>
        <div class="nwi-modal-rodape">
            <button type="button" class="nwi-btn nwi-btn-contorno" autofocus data-fechar-excluir>Cancelar</button>
            <button type="button" class="nwi-btn nwi-btn-perigo" data-confirmar-excluir><i class="bi bi-trash3" aria-hidden="true"></i>Excluir</button>
        </div>
    </dialog>
</div>
