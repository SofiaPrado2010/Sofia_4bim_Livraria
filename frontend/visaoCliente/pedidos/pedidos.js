const URL_API = 'http://127.0.0.1:3001';

const listaPedidos = document.getElementById('listaPedidos');
const detalhesPedido = document.getElementById('detalhesPedido');
const conteudoDetalhes = document.getElementById('conteudoDetalhes');

const btVoltar = document.getElementById('btVoltar');
const btFecharDetalhes = document.getElementById('btFecharDetalhes');

// Formatar valores em reais
function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

// Formatar datas
function formatarData(data) {

    return new Date(data).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
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

        // Verificar se existem pedidos
        if (!dados.pedidos || dados.pedidos.length === 0) {

            listaPedidos.innerHTML = `
                <p class="mensagem">
                    Você ainda não realizou nenhuma compra. 
                    Que tal encontrar sua próxima leitura?
                </p>
            `;

            return;
        }

        listaPedidos.innerHTML = '';

        // Mostrar cada pedido
        dados.pedidos.forEach(function (pedido) {

            const card = document.createElement('div');

            card.className = 'pedido-card';

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

            const btDetalhes = card.querySelector('.btDetalhes');

            btDetalhes.onclick = function () {
                carregarDetalhes(pedido.id_pedido);
            };

            listaPedidos.appendChild(card);

        });

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

        // Organizar os livros
        let livrosHTML = '';

        dados.itens.forEach(function (item) {

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

        dados.pagamentos.forEach(function (pagamento) {

            pagamentosHTML += `
                <p>
                    <strong>${escaparHTML(pagamento.nome_forma_pagamento)}:</strong>
                    ${escaparHTML(formatarMoeda(pagamento.valor_pago))}
                </p>
            `;
        });

        if (!pagamentosHTML) {
            pagamentosHTML = '<p>Informações de pagamento não disponíveis.</p>';
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

            </div>

            <div class="bloco-detalhes">

                <h3>Livros comprados</h3>

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

                <h3>Formas de pagamento</h3>

                ${pagamentosHTML}

            </div>

            <div class="total-detalhes">

                Total: ${escaparHTML(formatarMoeda(pedido.valor_total))}

            </div>

        `;

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

// Fechar detalhes
btFecharDetalhes.onclick = function () {

    detalhesPedido.style.display = 'none';
};

// Voltar à loja
btVoltar.onclick = function () {
    window.location.href = '../index.html';
};

// Iniciar a página
carregarPedidos();