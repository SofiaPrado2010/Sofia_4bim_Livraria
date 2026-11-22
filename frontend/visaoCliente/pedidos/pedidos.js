const URL_API = 'http://127.0.0.1:3001';

const listaPedidos = document.getElementById('listaPedidos');
const detalhesPedido = document.getElementById('detalhesPedido');
const conteudoDetalhes = document.getElementById('conteudoDetalhes');

const btVoltar = document.getElementById('btVoltar');
const btFecharDetalhes = document.getElementById('btFecharDetalhes');

let intervaloPrazo;
let pedidoAtual = null;


// Formatar valores em reais
function formatarMoeda(valor) {

    return Number(valor || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

// Formatar datas
function formatarData(data) {

    if (!data) {
        return 'Não informado';
    }

    const dataFormatada = new Date(data);

    if (isNaN(dataFormatada.getTime())) {
        return 'Não informado';
    }

    return dataFormatada.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Evitar que textos recebidos sejam interpretados como HTML
function escaparHTML(texto) {

    return String(texto ?? '').replace(/[&<>"']/g, function (caractere) {

        const caracteres = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };

        return caracteres[caractere];
    });
}

// Verificar se o prazo ainda está válido
function prazoValido(prazo) {

    if (!prazo) {
        return false;
    }

    const dataPrazo = new Date(prazo);

    return !isNaN(dataPrazo.getTime()) &&
        dataPrazo.getTime() > Date.now();
}

// Mostrar o tempo restante
function atualizarPrazos() {

    const camposPrazo = document.querySelectorAll('[data-prazo]');

    camposPrazo.forEach(function (campo) {

        const prazo = new Date(campo.dataset.prazo);
        const restante = prazo.getTime() - Date.now();

        if (isNaN(prazo.getTime())) {

            campo.textContent = 'Prazo não informado';
            campo.classList.remove('prazo-valido');
            campo.classList.add('prazo-encerrado');

            return;
        }

        if (restante <= 0) {

            campo.textContent = 'Prazo encerrado';
            campo.classList.remove('prazo-valido');
            campo.classList.add('prazo-encerrado');

            return;
        }

        const horas = Math.floor(restante / (1000 * 60 * 60));
        const minutos = Math.floor((restante % (1000 * 60 * 60)) / (1000 * 60));
        const segundos = Math.floor((restante % (1000 * 60)) / 1000);

        campo.textContent =
            `${horas}h ${minutos}min ${segundos}s`;

        campo.classList.add('prazo-valido');
        campo.classList.remove('prazo-encerrado');
    });
}

// Iniciar atualização dos prazos
function iniciarAtualizacaoPrazos() {

    clearInterval(intervaloPrazo);

    atualizarPrazos();

    intervaloPrazo = setInterval(atualizarPrazos, 1000);
}

// Carregar histórico de pedidos
async function carregarPedidos() {

    try {

        const resposta = await fetch(`${URL_API}/pedido`, {
            method: 'GET',
            credentials: 'include'
        });

        const dados = await resposta.json();

        if (!resposta.ok) {

            listaPedidos.innerHTML = `
                <p class="mensagem">
                    ${escaparHTML(dados.mensagem || 'Não foi possível carregar seus pedidos.')}
                </p>
            `;

            return;
        }

        if (!dados.pedidos || dados.pedidos.length === 0) {

            listaPedidos.innerHTML = `
                <p class="mensagem">
                    Você ainda não realizou nenhum pedido.
                    Que tal encontrar sua próxima leitura?
                </p>
            `;

            return;
        }

        listaPedidos.innerHTML = '';

        dados.pedidos.forEach(function (pedido) {

            const card = document.createElement('div');

            card.className = 'pedido-card';

            let prazoHTML = '';

            if (pedido.status_pedido === 'Pendente') {

                if (pedido.prazo_pagamento) {

                    prazoHTML = `
                        <p class="informacao-prazo">
                            <strong>Prazo para pagamento:</strong>
                            ${escaparHTML(formatarData(pedido.prazo_pagamento))}
                        </p>

                        <p class="informacao-prazo">
                            <strong>Tempo restante:</strong>
                            <span
                                class="tempo-restante"
                                data-prazo="${escaparHTML(pedido.prazo_pagamento)}">
                            </span>
                        </p>
                    `;

                } else {

                    prazoHTML = `
                        <p class="informacao-prazo">
                            Prazo de pagamento não informado.
                        </p>
                    `;
                }
            }

            card.innerHTML = `
                <div class="informacoes-pedido">

                    <div>
                        <h3 class="numero-pedido">
                            Pedido #${escaparHTML(pedido.id_pedido)}
                        </h3>

                        <p>
                            <strong>Data:</strong>
                            ${escaparHTML(formatarData(pedido.data_pedido))}
                        </p>

                        <p>
                            <strong>Status:</strong>
                            <span class="status-pedido">
                                ${escaparHTML(pedido.status_pedido)}
                            </span>
                        </p>

                        ${prazoHTML}
                    </div>

                    <div>
                        <p class="valor-pedido">
                            ${escaparHTML(formatarMoeda(pedido.valor_total))}
                        </p>
                    </div>

                </div>

                <button class="btDetalhes">
                    Ver detalhes
                </button>
            `;

            card.querySelector('.btDetalhes').onclick = function () {
                carregarDetalhes(pedido.id_pedido);
            };

            listaPedidos.appendChild(card);

        });

        iniciarAtualizacaoPrazos();

    } catch (error) {

        console.error('Erro ao carregar pedidos:', error);

        listaPedidos.innerHTML = `
            <p class="mensagem">
                Não foi possível conectar ao servidor.
                Tente novamente.
            </p>
        `;
    }
}

// Carregar detalhes de um pedido
async function carregarDetalhes(idPedido) {

    try {

        pedidoAtual = idPedido;

        conteudoDetalhes.innerHTML = `
            <p class="mensagem">Carregando detalhes do pedido...</p>
        `;

        detalhesPedido.style.display = 'block';

        const resposta = await fetch(`${URL_API}/pedido/${idPedido}`, {
            method: 'GET',
            credentials: 'include'
        });

        const dados = await resposta.json();

        if (!resposta.ok) {

            conteudoDetalhes.innerHTML = `
                <p class="mensagem">
                    ${escaparHTML(dados.mensagem || 'Não foi possível carregar os detalhes.')}
                </p>
            `;

            return;
        }

        const pedido = dados.pedido;
        const itens = dados.itens || [];
        const pagamentos = dados.pagamentos || [];

        // Organizar os livros
        let livrosHTML = '';

        itens.forEach(function (item) {

            livrosHTML += `
                <div class="item-livro">

                    <h4>${escaparHTML(item.nome_livro)}</h4>

                    <p>
                        Quantidade: ${escaparHTML(item.quantidade)}
                    </p>

                    <p>
                        Valor unitário:
                        ${escaparHTML(formatarMoeda(item.preco_unitario))}
                    </p>

                    <p>
                        Subtotal:
                        ${escaparHTML(formatarMoeda(item.subtotal))}
                    </p>

                </div>
            `;
        });

        // Organizar os pagamentos
        let pagamentosHTML = '';

        pagamentos.forEach(function (pagamento) {

            const parcelas = Number(pagamento.quantidade_parcelas || 1);

            pagamentosHTML += `
                <p>
                    <strong>${escaparHTML(pagamento.nome_forma_pagamento)}:</strong>
                    ${escaparHTML(formatarMoeda(pagamento.valor_pago))}
                    ${parcelas > 1 ? `(${parcelas} parcelas)` : ''}
                </p>
            `;
        });

        if (!pagamentosHTML) {

            pagamentosHTML = `
                <p>Este pedido ainda não possui pagamento registrado.</p>
            `;
        }

        // Mostrar prazo de pagamento
        let prazoHTML = '';

        if (pedido.status_pedido === 'Pendente') {

            if (pedido.prazo_pagamento) {

                prazoHTML = `
                    <p>
                        <strong>Prazo para pagamento:</strong>
                        ${escaparHTML(formatarData(pedido.prazo_pagamento))}
                    </p>

                    <p>
                        <strong>Tempo restante:</strong>
                        <span
                            class="tempo-restante"
                            data-prazo="${escaparHTML(pedido.prazo_pagamento)}">
                        </span>
                    </p>
                `;

            } else {

                prazoHTML = `
                    <p>Prazo de pagamento não informado.</p>
                `;
            }
        }


        // Botões de acordo com o status do pedido
        let botoesHTML = '';

        if (pedido.status_pedido === 'Pendente') {

            botoesHTML = `
                <div class="acoes-pedido">

                    ${prazoValido(pedido.prazo_pagamento) ? `
                        <button type="button" id="btPagarPedido">
                            Pagar pedido
                        </button>
                    ` : ''}

                    <button type="button" id="btCancelarPedido">
                        Cancelar pedido
                    </button>

                </div>
            `;
        }


        // Mostrar todos os detalhes
        conteudoDetalhes.innerHTML = `

            <div class="bloco-detalhes">

                <h3>Informações do pedido</h3>

                <p>
                    <strong>Número:</strong>
                    #${escaparHTML(pedido.id_pedido)}
                </p>

                <p>
                    <strong>Data:</strong>
                    ${escaparHTML(formatarData(pedido.data_pedido))}
                </p>

                <p>
                    <strong>Status:</strong>
                    ${escaparHTML(pedido.status_pedido)}
                </p>

                ${prazoHTML}

            </div>

            <div class="bloco-detalhes">

                <h3>Livros do pedido</h3>

                ${livrosHTML || '<p>Nenhum livro encontrado.</p>'}

            </div>

            <div class="bloco-detalhes">

                <h3>Endereço de entrega</h3>

                <p>
                    ${escaparHTML(pedido.endereco_entrega)}
                </p>

                <p>
                    ${escaparHTML(pedido.cidade_entrega)} -
                    ${escaparHTML(pedido.estado_entrega)}
                </p>

            </div>

            <div class="bloco-detalhes">

                <h3>Informações de pagamento</h3>

                ${pagamentosHTML}

            </div>

            <div class="total-detalhes">

                Total: ${escaparHTML(formatarMoeda(pedido.valor_total))}

            </div>

            ${botoesHTML}

        `;


        // Configurar botão de pagamento
        const btPagarPedido = document.getElementById('btPagarPedido');

        if (btPagarPedido) {

            btPagarPedido.onclick = function () {

                window.location.href =
                    `pagamentoPedido.html?id=${encodeURIComponent(pedido.id_pedido)}`;
            };
        }


        // Configurar botão de cancelamento
        const btCancelarPedido = document.getElementById('btCancelarPedido');

        if (btCancelarPedido) {

            btCancelarPedido.onclick = function () {
                cancelarPedido(pedido.id_pedido);
            };
        }

        atualizarPrazos();

        detalhesPedido.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });

    } catch (error) {

        console.error('Erro ao carregar detalhes:', error);

        conteudoDetalhes.innerHTML = `
            <p class="mensagem">
                Não foi possível carregar os detalhes do pedido.
            </p>
        `;
    }
}

// Cancelar pedido
async function cancelarPedido(idPedido) {

    const confirmar = confirm(
        `Deseja realmente cancelar o pedido nº ${idPedido}?`
    );

    if (!confirmar) {
        return;
    }

    const btCancelarPedido = document.getElementById('btCancelarPedido');

    try {

        btCancelarPedido.disabled = true;
        btCancelarPedido.textContent = 'Cancelando...';

        const resposta = await fetch(`${URL_API}/pedido/${idPedido}/cancelar`, {

            method: 'PATCH',

            credentials: 'include'
        });

        const dados = await resposta.json();

        if (!resposta.ok) {

            throw new Error(
                dados.mensagem || 'Não foi possível cancelar o pedido.'
            );
        }

        alert('Pedido cancelado com sucesso!');

        detalhesPedido.style.display = 'none';

        await carregarPedidos();

    } catch (error) {

        console.error('Erro ao cancelar pedido:', error);

        alert(error.message);

        if (btCancelarPedido) {
            btCancelarPedido.disabled = false;
            btCancelarPedido.textContent = 'Cancelar pedido';
        }
    }
}

// Fechar detalhes
btFecharDetalhes.onclick = function () {

    detalhesPedido.style.display = 'none';
    pedidoAtual = null;
};


// Voltar à loja
btVoltar.onclick = function () {
    window.location.href = '../index.html';
};


// Iniciar a página
carregarPedidos();