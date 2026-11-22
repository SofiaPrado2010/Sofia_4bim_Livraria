const URL_API = 'http://127.0.0.1:3001';

async function inicializar() {
    await listar();
}

// Formatar valores em reais
function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

// Formatar datas
function formatarData(data) {
    if (!data) return '-';

    return new Date(data).toLocaleString('pt-BR');
}

// Listar todos os pedidos
async function listar() {
    const saida = document.getElementById('outputSaida');

    try {
        const resposta = await fetch(`${URL_API}/pedido/admin`, {
            credentials: 'include'
        });

        const data = await resposta.json();

        if (!resposta.ok || !data.sucesso) {
            saida.innerHTML = data.mensagem || 'Não foi possível carregar os pedidos.';
            return;
        }

        if (data.pedidos.length === 0) {
            saida.innerHTML = 'Nenhum pedido cadastrado.';
            return;
        }

        let texto = `
            <table class="tabela-pedidos">
                <thead>
                    <tr>
                        <th>Número</th>
                        <th>Cliente</th>
                        <th>Data</th>
                        <th>Status</th>
                        <th>Valor Total</th>
                        <th>Detalhes</th>
                    </tr>
                </thead>
                <tbody>
        `;

        for (let linha of data.pedidos) {
            texto += `
                <tr>
                    <td>${linha.id_pedido}</td>
                    <td>${linha.nome_pessoa}</td>
                    <td>${formatarData(linha.data_pedido)}</td>
                    <td>${linha.status_pedido}</td>
                    <td>${formatarMoeda(linha.valor_total)}</td>
                    <td>
                        <button
                            class="btnDetalhes"
                            onclick="mostrarDetalhes(${linha.id_pedido})">
                            Visualizar
                        </button>
                    </td>
                </tr>
            `;
        }

        texto += `
                </tbody>
            </table>
        `;

        saida.innerHTML = texto;

    } catch (erro) {
        console.error('Erro ao listar pedidos:', erro);
        saida.innerHTML = 'Servidor offline.';
    }
}

// Consultar detalhes de um pedido
async function mostrarDetalhes(id) {
    const saida = document.getElementById('outputDetalhes');

    saida.innerHTML = 'Carregando detalhes...';

    try {
        const resposta = await fetch(`${URL_API}/pedido/admin/${id}`, {
            credentials: 'include'
        });

        const data = await resposta.json();

        if (!resposta.ok || !data.sucesso) {
            saida.innerHTML = data.mensagem || 'Não foi possível consultar o pedido.';
            return;
        }

        const pedido = data.pedido;

        let texto = `
            <div class="dados-pedido">

                <p><strong>Número do pedido:</strong> ${pedido.id_pedido}</p>

                <p><strong>Cliente:</strong> ${pedido.nome_pessoa}</p>

                <p><strong>CPF:</strong> ${pedido.cpf_pessoa}</p>

                <p><strong>E-mail:</strong> ${pedido.email_pessoa}</p>

                <p><strong>Data do pedido:</strong> ${formatarData(pedido.data_pedido)}</p>

                <p><strong>Status:</strong> ${pedido.status_pedido}</p>

                <p><strong>Endereço de entrega:</strong> ${pedido.endereco_entrega || '-'}</p>

                <p><strong>Cidade:</strong> ${pedido.cidade_entrega || '-'}</p>

                <p><strong>Estado:</strong> ${pedido.estado_entrega || '-'}</p>

                <p><strong>Prazo para pagamento:</strong> ${formatarData(pedido.prazo_pagamento)}</p>

                <p><strong>Data do pagamento:</strong> ${formatarData(pedido.data_pagamento)}</p>

            </div>

            <h3>Livros do Pedido</h3>
        `;

        if (data.itens.length > 0) {
            texto += `
                <table class="tabela-itens">
                    <thead>
                        <tr>
                            <th>Livro</th>
                            <th>Quantidade</th>
                            <th>Preço Unitário</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            for (let item of data.itens) {
                texto += `
                    <tr>
                        <td>${item.nome_livro}</td>
                        <td>${item.quantidade}</td>
                        <td>${formatarMoeda(item.preco_unitario)}</td>
                        <td>${formatarMoeda(item.subtotal)}</td>
                    </tr>
                `;
            }

            texto += `
                    </tbody>
                </table>
            `;
        } else {
            texto += '<p>Nenhum livro encontrado neste pedido.</p>';
        }

        texto += `
            <h3>Formas de Pagamento</h3>
        `;

        if (data.formasPagamento.length > 0) {
            texto += `
                <table class="tabela-itens">
                    <thead>
                        <tr>
                            <th>Forma de pagamento</th>
                            <th>Valor pago</th>
                            <th>Parcelas</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            for (let forma of data.formasPagamento) {
                texto += `
                    <tr>
                        <td>${forma.nome_forma_pagamento}</td>
                        <td>${formatarMoeda(forma.valor_pago)}</td>
                        <td>${forma.quantidade_parcelas}</td>
                    </tr>
                `;
            }

            texto += `
                    </tbody>
                </table>
            `;
        } else {
            texto += '<p>Este pedido ainda não possui pagamento registrado.</p>';
        }

        texto += `
            <p class="valor-total">
                Valor total: ${formatarMoeda(pedido.valor_total)}
            </p>
        `;

        saida.innerHTML = texto;
        saida.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });

    } catch (erro) {
        console.error('Erro ao consultar detalhes:', erro);
        saida.innerHTML = 'Erro ao consultar os detalhes do pedido.';
    }
}