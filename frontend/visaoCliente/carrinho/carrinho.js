const URL_API = 'http://127.0.0.1:3001';

let itensCarrinho = [];

// Adicionar livro
export function adicionarCarrinho(livro, quantidade) {

    quantidade = Number(quantidade);

    if (quantidade <= 0 || quantidade > livro.quantidade_estoque) {
        alert('Quantidade indisponível em estoque!');
        return;
    }

    const itemExistente = itensCarrinho.find(item =>
        item.id_livro === livro.id_livro
    );

    if (itemExistente) {

        if (itemExistente.quantidade + quantidade > livro.quantidade_estoque) {
            alert('Quantidade indisponível em estoque!');
            return;
        }

        itemExistente.quantidade += quantidade;

    } else {

        itensCarrinho.push({
            ...livro,
            quantidade: quantidade
        });
    }

    atualizarCarrinho();
}

// Exibir os itens
function atualizarCarrinho() {

    const lista = document.getElementById('itensCarrinho');
    const total = document.getElementById('totalCarrinho');

    lista.innerHTML = '';

    let valorTotal = 0;

    if (itensCarrinho.length === 0) {
        lista.innerHTML = '<p>Seu carrinho está vazio.</p>';
    }

    itensCarrinho.forEach(item => {

        const preco = Number(item.preco_unitario);
        const subtotal = preco * item.quantidade;

        valorTotal += subtotal;

        const div = document.createElement('div');
        div.classList.add('item-carrinho');

        div.innerHTML = `
            <img src="${URL_API}/imagens/${item.id_livro}.png">

            <div class="info-item">
                <h3>${item.nome_livro}</h3>
                <p>R$ ${preco.toFixed(2)}</p>
                <p>Quantidade: ${item.quantidade}</p>
                <p>Subtotal: R$ ${subtotal.toFixed(2).replace('.', ',')}</p>
            </div>

            <button class="btRemover">🗑️</button>
        `;

        div.querySelector('.btRemover').onclick = function () {
            removerItem(item.id_livro);
        };

        lista.appendChild(div);
    });

    total.textContent = `R$ ${valorTotal.toFixed(2).replace('.', ',')}`;
}

// Remover livro
function removerItem(id) {

    itensCarrinho = itensCarrinho.filter(item =>
        item.id_livro !== id
    );

    atualizarCarrinho();
}

// Abrir e fechar carrinho
export function iniciarCarrinho() {

    const carrinho = document.getElementById('carrinho');

    document.getElementById('btCarrinho').onclick = function () {
        carrinho.classList.add('aberto');
    };

    document.getElementById('btFecharCarrinho').onclick = function () {
        carrinho.classList.remove('aberto');
    };

    document.getElementById('btCancelar').onclick = function () {
        itensCarrinho = [];
        sessionStorage.removeItem('itensCarrinho');
        sessionStorage.removeItem('compraPendente');

        atualizarCarrinho();
        carrinho.classList.remove('aberto');
    };

    // Comprar
    document.getElementById('btComprar').onclick = async function () {

        if (itensCarrinho.length === 0) {
            alert('Seu carrinho está vazio!');
            return;
        }

        // Salvar os livros no navegador
        sessionStorage.setItem(
            'itensCarrinho',
            JSON.stringify(itensCarrinho)
        );

        try {

            // Verificar se existe uma sessão ativa
            const resposta = await fetch(`${URL_API}/login/sessao`, {
                method: 'GET',
                credentials: 'include'
            });

            // Pessoa não está conectada
            if (resposta.status === 401) {

                sessionStorage.setItem('compraPendente', 'true');

                window.location.href = './login/login.html';
                return;
            }

            const dados = await resposta.json();

            if (!resposta.ok) {
                alert('Não foi possível verificar seu login. Tente novamente.');
                return;
            }

            const perfis = dados.usuario.perfis;

            // Pessoa conectada como cliente
            if (perfis.includes('CLIENTE')) {

                sessionStorage.removeItem('compraPendente');

                window.location.href = './pagamento/pagamento.html';
                return;
            }

            // Pessoa conectada somente como funcionário
            alert('Você está conectado como funcionário. Para comprar, entre com uma conta de cliente.');

        } catch (error) {

            console.error('Erro ao verificar sessão:', error);
            alert('Não foi possível verificar seu login. Tente novamente.');

        }

    };

}