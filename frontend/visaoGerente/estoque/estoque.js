
const URL_API = 'http://127.0.0.1:3001';

// Elementos da página
const totalProdutos = document.getElementById('total-produtos');
const produtosEstoqueBaixo = document.getElementById('produtos-estoque-baixo');
const produtosSemEstoque = document.getElementById('produtos-sem-estoque');

const listaProdutos = document.getElementById('lista-produtos');
const listaMovimentacoes = document.getElementById('lista-movimentacoes');

const pesquisaProduto = document.getElementById('pesquisa-produto');
const filtroEstoque = document.getElementById('filtro-estoque');

const formEntrada = document.getElementById('form-entrada');
const formSaida = document.getElementById('form-saida');

// Lista de livros
let livros = [];

// INICIALIZAR A PÁGINA
async function inicializar() {

    await listarProdutos();
    await listarMovimentacoes();

    // Eventos dos formulários
    formEntrada.addEventListener('submit', function (event) {
        event.preventDefault();
        registrarMovimentacao('entrada');
    });

    formSaida.addEventListener('submit', function (event) {
        event.preventDefault();
        registrarMovimentacao('saida');
    });

    // Eventos da pesquisa e do filtro
    pesquisaProduto.addEventListener('input', listarProdutosNaTela);
    filtroEstoque.addEventListener('change', listarProdutosNaTela);
}

// LISTAR LIVROS DO BANCO DE DADOS
async function listarProdutos() {

    try {

        const resposta = await fetch(`${URL_API}/livro/listar`, {
            credentials: 'include'
        });

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            alert(dados.mensagem || 'Erro ao carregar os livros.');
            return;
        }

        livros = dados.livros;

        atualizarResumo();
        carregarSelects();
        listarProdutosNaTela();

    } catch (erro) {
        console.error('Erro ao listar livros:', erro);
        alert('Não foi possível carregar os livros.');
    }
}

// ATUALIZAR OS CARTÕES DE RESUMO
function atualizarResumo() {

    totalProdutos.textContent = livros.length;

    let quantidadeBaixa = 0;
    let quantidadeZerada = 0;

    livros.forEach(function (livro) {

        if (livro.quantidade_estoque === 0) {
            quantidadeZerada++;
        } else if (livro.quantidade_estoque <= 5) {
            quantidadeBaixa++;
        }

    });

    produtosEstoqueBaixo.textContent = quantidadeBaixa;
    produtosSemEstoque.textContent = quantidadeZerada;
}

// CARREGAR OS SELECTS DOS FORMULÁRIOS
function carregarSelects() {

    const selectEntrada = document.getElementById('produto-entrada');
    const selectSaida = document.getElementById('produto-saida');

    selectEntrada.innerHTML = '<option value="">Selecione um livro</option>';
    selectSaida.innerHTML = '<option value="">Selecione um livro</option>';

    livros.forEach(function (livro) {

        const opcaoEntrada = document.createElement('option');
        opcaoEntrada.value = livro.id_livro;
        opcaoEntrada.textContent = livro.nome_livro;

        const opcaoSaida = document.createElement('option');
        opcaoSaida.value = livro.id_livro;
        opcaoSaida.textContent = livro.nome_livro;

        selectEntrada.appendChild(opcaoEntrada);
        selectSaida.appendChild(opcaoSaida);

    });
}

// LISTAR LIVROS NA TELA
function listarProdutosNaTela() {

    const pesquisa = pesquisaProduto.value.toLowerCase();
    const filtro = filtroEstoque.value;

    listaProdutos.innerHTML = '';

    let livrosFiltrados = livros.filter(function (livro) {

        const nomeLivro = livro.nome_livro.toLowerCase();

        const correspondePesquisa = nomeLivro.includes(pesquisa);

        let correspondeFiltro = true;

        if (filtro === 'baixo') {
            correspondeFiltro =
                livro.quantidade_estoque > 0 &&
                livro.quantidade_estoque <= 5;
        }

        if (filtro === 'zerado') {
            correspondeFiltro = livro.quantidade_estoque === 0;
        }

        return correspondePesquisa && correspondeFiltro;

    });

    if (livrosFiltrados.length === 0) {
        listaProdutos.innerHTML =
            '<p class="mensagem-vazia">Nenhum livro encontrado.</p>';
        return;
    }

    livrosFiltrados.forEach(function (livro) {

        const produto = document.createElement('div');
        produto.className = 'produto-estoque';

        let situacao = 'Disponível';

        if (livro.quantidade_estoque === 0) {
            situacao = 'Sem estoque';
        } else if (livro.quantidade_estoque <= 5) {
            situacao = 'Estoque baixo';
        }

        produto.innerHTML = `
            <div>
                <h3>${livro.nome_livro}</h3>
                <p>${situacao}</p>
            </div>

            <p class="quantidade-estoque">
                ${livro.quantidade_estoque} unidade(s)
            </p>
        `;

        listaProdutos.appendChild(produto);

    });
}

// REGISTRAR ENTRADA OU SAÍDA
async function registrarMovimentacao(tipo) {

    let idLivro;
    let quantidade;
    let observacao;

    if (tipo === 'entrada') {

        idLivro = document.getElementById('produto-entrada').value;
        quantidade = document.getElementById('quantidade-entrada').value;
        observacao = document.getElementById('observacao-entrada').value;

    } else {

        idLivro = document.getElementById('produto-saida').value;
        quantidade = document.getElementById('quantidade-saida').value;
        observacao = document.getElementById('observacao-saida').value;

    }

    if (!idLivro || !quantidade || Number(quantidade) <= 0 ||
        !Number.isInteger(Number(quantidade))) {

        alert('Selecione um livro e informe uma quantidade inteira maior que zero.');
        return;
    }

    try {

        const resposta = await fetch(`${URL_API}/estoque/${tipo}`, {

            method: 'POST',

            headers: {
                'Content-Type': 'application/json'
            },

            credentials: 'include',

            body: JSON.stringify({
                livro_id: Number(idLivro),
                quantidade: Number(quantidade),
                observacao: observacao
            })

        });

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            alert(dados.mensagem || 'Não foi possível registrar a movimentação.');
            return;
        }

        alert(dados.mensagem || 'Movimentação registrada com sucesso!');

        // Limpar o formulário utilizado
        if (tipo === 'entrada') {
            formEntrada.reset();
        } else {
            formSaida.reset();
        }

        // Atualizar as informações da página
        await listarProdutos();
        await listarMovimentacoes();

    } catch (erro) {
        console.error('Erro ao registrar movimentação:', erro);
        alert('Não foi possível registrar a movimentação.');
    }
}

// LISTAR HISTÓRICO DE MOVIMENTAÇÕES
async function listarMovimentacoes() {

    try {

        const resposta = await fetch(`${URL_API}/estoque/movimentacoes`, {
            credentials: 'include'
        });

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            listaMovimentacoes.innerHTML = `
                <tr>
                    <td colspan="6">Não foi possível carregar o histórico.</td>
                </tr>
            `;
            return;
        }

        listaMovimentacoes.innerHTML = '';

        if (dados.movimentacoes.length === 0) {
            listaMovimentacoes.innerHTML = `
                <tr>
                    <td colspan="6">Nenhuma movimentação registrada.</td>
                </tr>
            `;
            return;
        }

        dados.movimentacoes.forEach(function (movimentacao) {

            const linha = document.createElement('tr');

            const data = new Date(movimentacao.data_movimentacao);

            linha.innerHTML = `
                <td>${movimentacao.nome_livro}</td>
                <td>${movimentacao.tipo_movimentacao}</td>
                <td>${movimentacao.quantidade_movimentacao}</td>
                <td>${data.toLocaleString('pt-BR')}</td>
                <td>${movimentacao.nome_funcionario || 'Não informado'}</td>
                <td>${movimentacao.observacao_movimentacao || '-'}</td>
            `;

            listaMovimentacoes.appendChild(linha);

        });

    } catch (erro) {
        console.error('Erro ao listar movimentações:', erro);
        listaMovimentacoes.innerHTML = `
            <tr>
                <td colspan="6">Erro ao carregar o histórico.</td>
            </tr>
        `;
    }
}