const URL_API = 'http://127.0.0.1:3001';

const itensCarrinho = JSON.parse(sessionStorage.getItem('itensCarrinho')) || [];

const listaLivros = document.getElementById('listaLivros');
const valorTotal = document.getElementById('valorTotal');
const mensagem = document.getElementById('mensagem');
const btFinalizar = document.getElementById('btFinalizar');
const btVoltar = document.getElementById('btVoltar');

let total = 0;

// Carregar resumo dos livros
function carregarResumo() {

    listaLivros.innerHTML = '';
    total = 0;

    if (itensCarrinho.length === 0) {

        listaLivros.textContent = 'Seu carrinho está vazio.';
        valorTotal.textContent = 'R$ 0,00';

        btFinalizar.disabled = true;

        mensagem.textContent =
            'Adicione livros ao carrinho antes de confirmar o pedido.';

        return;
    }

    itensCarrinho.forEach(item => {

        const preco = Number(item.preco_unitario);
        const subtotal = preco * Number(item.quantidade);

        total += subtotal;

        const div = document.createElement('div');
        div.classList.add('item-resumo');

        const nome = document.createElement('p');
        nome.textContent = item.nome_livro;

        const quantidade = document.createElement('p');
        quantidade.textContent = `Quantidade: ${item.quantidade}`;

        const precoUnitario = document.createElement('p');
        precoUnitario.textContent =
            `Preço unitário: R$ ${preco.toFixed(2).replace('.', ',')}`;

        const sub = document.createElement('p');
        sub.textContent =
            `Subtotal: R$ ${subtotal.toFixed(2).replace('.', ',')}`;

        div.append(nome, quantidade, precoUnitario, sub);

        listaLivros.appendChild(div);
    });

    valorTotal.textContent =
        `R$ ${total.toFixed(2).replace('.', ',')}`;
}


// Carregar endereço do cliente
async function carregarEndereco() {

    try {

        const resposta = await fetch(`${URL_API}/pessoa/minhasInformacoes`, {
            credentials: 'include'
        });

        const dados = await resposta.json();

        if (resposta.ok) {

            document.getElementById('endereco').value =
                dados.pessoa.endereco_pessoa || '';

            document.getElementById('cidade').value =
                dados.pessoa.cidade_pessoa || '';

            document.getElementById('estado').value =
                dados.pessoa.estado_pessoa || '';

        } else {

            mensagem.textContent = dados.mensagem;
            mensagem.style.color = 'red';
        }

    } catch (error) {

        console.error('Erro ao carregar endereço:', error);

        mensagem.textContent =
            'Não foi possível carregar seu endereço.';

        mensagem.style.color = 'red';
    }
}


// Voltar para a página inicial
btVoltar.onclick = function () {
    window.location.href = '../index.html';
};


// Obter ou criar a chave de idempotência
function obterChaveIdempotencia() {

    let chave = sessionStorage.getItem('chavePedido');

    if (!chave) {

        chave = crypto.randomUUID();

        sessionStorage.setItem('chavePedido', chave);
    }

    return chave;
}


// Confirmar pedido
async function confirmarPedido() {

    const endereco = document.getElementById('endereco').value.trim();
    const cidade = document.getElementById('cidade').value.trim();
    const estado = document.getElementById('estado').value.trim();

    if (!endereco || !cidade || !estado) {

        mensagem.textContent = 'Preencha todos os dados de entrega.';
        mensagem.style.color = 'red';

        return;
    }

    if (itensCarrinho.length === 0) {

        mensagem.textContent = 'Seu carrinho está vazio.';
        mensagem.style.color = 'red';

        return;
    }

    try {

        btFinalizar.disabled = true;

        mensagem.textContent = 'Registrando seu pedido...';
        mensagem.style.color = '#80665e';

        // Manter a mesma chave quando houver uma tentativa repetida
        const chaveIdempotencia = obterChaveIdempotencia();

        const resposta = await fetch(`${URL_API}/pedido`, {

            method: 'POST',

            headers: {
                'Content-Type': 'application/json'
            },

            credentials: 'include',

            body: JSON.stringify({
                itens: itensCarrinho,
                endereco: endereco,
                cidade: cidade,
                estado: estado,
                chaveIdempotencia: chaveIdempotencia
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok) {

            if (resposta.status === 409) {
                sessionStorage.removeItem('chavePedido');
            }

            throw new Error(
                dados.mensagem || 'Erro ao registrar o pedido.'
            );
        }

        mensagem.style.color = 'green';

        mensagem.textContent =
            `Pedido nº ${dados.idPedido} registrado com sucesso! Você tem 24 horas para realizar o pagamento.`;

        // Limpar os dados do carrinho
        sessionStorage.removeItem('itensCarrinho');
        sessionStorage.removeItem('chavePedido');

        btFinalizar.disabled = true;

        // Ir para a página de pedidos após um breve intervalo
        setTimeout(() => {
            window.location.href = '../pedidos/pedidos.html';
        }, 500);

    } catch (error) {

        console.error('Erro ao confirmar pedido:', error);

        mensagem.textContent = error.message;
        mensagem.style.color = 'red';

        btFinalizar.disabled = false;
    }
}


// Iniciar as funções da página
carregarResumo();
carregarEndereco();

btFinalizar.onclick = confirmarPedido;