
import { adicionarCarrinho } from '../carrinho/carrinho.js';

const URL_API = 'http://127.0.0.1:3001';

// Variáveis para guardar os dados
let listaGeneros = [];
let listaLivros = [];
let generoSelecionado = null;
let capaSelecionada = null;
let pesquisaAtual = '';


// NORMALIZAR TEXTO
function normalizarTexto(texto) {
    return texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

// ÍCONES DOS GÊNEROS
function obterIconeGenero(nomeGenero) {
    const nome = normalizarTexto(nomeGenero);

    const icones = {
        'fantasia': 'fa-wand-magic-sparkles',
        'romance': 'fa-heart',
        'ficcao cientifica': 'fa-rocket',
        'distopia': 'fa-earth-americas',
        'misterio': 'fa-magnifying-glass',
        'terror': 'fa-ghost',
        'aventura': 'fa-compass',
        'drama': 'fa-masks-theater',
        'classico': 'fa-book-open',
        'infantojuvenil': 'fa-child'
    };

    return icones[nome] || 'fa-book';
}

// BUSCAR OS GÊNEROS
async function listarGeneros() {
    const resposta = await fetch(`${URL_API}/genero/listar`);
    const dados = await resposta.json();

    listaGeneros = dados.generos;

    const filtroGenero = document.getElementById('filtroGenero');

    filtroGenero.innerHTML = '';

    // BOTÃO TODOS
    const botaoTodos = document.createElement('button');
    botaoTodos.classList.add('cartao-genero');

    botaoTodos.innerHTML = `
        <i class="fa-solid fa-book-open"></i>
        <span>Todos</span>
    `;

    botaoTodos.onclick = function () {
        generoSelecionado = null;
        aplicarFiltros();
    };

    filtroGenero.appendChild(botaoTodos);

    // CRIAR CARTÕES DOS GÊNEROS
    listaGeneros.forEach(genero => {
        const botao = document.createElement('button');
        botao.classList.add('cartao-genero');

        const icone = obterIconeGenero(genero.nome_genero);

        botao.innerHTML = `
            <i class="fa-solid ${icone}"></i>
            <span>${genero.nome_genero}</span>
        `;

        botao.onclick = function () {
            if (String(generoSelecionado) === String(genero.id_genero)) {
                generoSelecionado = null;
            } else {
                generoSelecionado = genero.id_genero;
            }

            aplicarFiltros();
        };

        filtroGenero.appendChild(botao);
    });
}

// CRIAR OS BOTÕES DE TIPO DE CAPA
function listarTiposCapa() {
    const tiposCapa = ['Capa comum', 'Capa dura'];
    const filtroCapa = document.getElementById('filtroCapa');

    filtroCapa.innerHTML = '';

    // BOTÃO TODOS
    const botaoTodos = document.createElement('button');
    botaoTodos.textContent = 'Todos';

    botaoTodos.onclick = function () {
        capaSelecionada = null;
        aplicarFiltros();
    };

    filtroCapa.appendChild(botaoTodos);

    tiposCapa.forEach(tipo => {
        const botao = document.createElement('button');
        botao.textContent = tipo;

        botao.onclick = function () {
            if (capaSelecionada === tipo) {
                capaSelecionada = null;
            } else {
                capaSelecionada = tipo;
            }

            aplicarFiltros();
        };

        filtroCapa.appendChild(botao);
    });
}

// BUSCAR OS LIVROS
async function listarLivros() {
    const resposta = await fetch(`${URL_API}/livro/catalogo`);
    const dados = await resposta.json();

    listaLivros = dados.livros;
    exibirLivros(listaLivros);
}

// EXIBIR OS LIVROS
function exibirLivros(livros) {
    const lista = document.getElementById('listaLivros');

    lista.innerHTML = '';

    if (livros.length === 0) {
        lista.innerHTML = `<p>Nenhum livro encontrado.</p>`;
        return;
    }

    livros.forEach(livro => {
        const card = document.createElement('div');
        card.classList.add('card-livro');

        card.onclick = function () {
            abrirDetalhes(livro);
        };

        card.innerHTML = `
            <img
                src="${URL_API}/imagens/${livro.id_livro}.png"
                alt="Capa do livro ${livro.nome_livro}"
            >

            <h3>${livro.nome_livro}</h3>

            <p>Autor: ${livro.autor}</p>

            <p>
                R$ ${Number(livro.preco_unitario).toFixed(2)}
            </p>

            <p>Tipo de capa: ${livro.tipo_capa}</p>
        `;

        lista.appendChild(card);
    });
}

// ATUALIZAR DESTAQUE DOS FILTROS
function atualizarBotoesFiltros() {
    const botoesGenero = document.querySelectorAll('#filtroGenero button');

    botoesGenero.forEach((botao, indice) => {
        if (indice === 0) {
            botao.classList.toggle('selecionado', generoSelecionado === null);
        } else {
            const genero = listaGeneros[indice - 1];

            botao.classList.toggle(
                'selecionado',
                String(generoSelecionado) === String(genero.id_genero)
            );
        }
    });

    const botoesCapa = document.querySelectorAll('#filtroCapa button');

    botoesCapa.forEach((botao, indice) => {
        if (indice === 0) {
            botao.classList.toggle('selecionado', capaSelecionada === null);
        } else {
            const tipo = indice === 1 ? 'Capa comum' : 'Capa dura';

            botao.classList.toggle(
                'selecionado',
                capaSelecionada === tipo
            );
        }
    });
}

// APLICAR FILTROS
function aplicarFiltros() {
    let livrosFiltrados = listaLivros;

    if (generoSelecionado !== null) {
        livrosFiltrados = livrosFiltrados.filter(livro =>
            String(livro.id_genero) === String(generoSelecionado)
        );
    }

    if (capaSelecionada !== null) {
        livrosFiltrados = livrosFiltrados.filter(livro =>
            livro.tipo_capa === capaSelecionada
        );
    }

    if (pesquisaAtual.trim() !== '') {
        const pesquisa = normalizarTexto(pesquisaAtual);

        livrosFiltrados = livrosFiltrados.filter(livro => {
            const nome = normalizarTexto(livro.nome_livro);
            const autor = normalizarTexto(livro.autor);

            return nome.includes(pesquisa) || autor.includes(pesquisa);
        });
    }

    atualizarBotoesFiltros();
    exibirLivros(livrosFiltrados);
}

// PESQUISAR LIVROS
function pesquisarLivros() {
    const input = document.getElementById('inputPesquisa');

    pesquisaAtual = input.value;
    aplicarFiltros();
}

// ABRIR DETALHES DO LIVRO
function abrirDetalhes(livro) {
    const detalhes = document.getElementById('detalhesLivro');
    const conteudo = document.getElementById('conteudoDetalhes');

    detalhes.style.display = 'flex';

    const genero = listaGeneros.find(g =>
        String(g.id_genero) === String(livro.id_genero)
    );

    conteudo.innerHTML = `
        <div class="detalhe-livro">

            <img
                src="${URL_API}/imagens/${livro.id_livro}.png"
                alt="Capa de ${livro.nome_livro}"
            >

            <div class="detalhe-informacoes">

                <h2>${livro.nome_livro}</h2>
                <p>
                    <strong>Autor:</strong>
                    ${livro.autor}
                </p>
                <p>
                    <strong>Gênero:</strong>
                    ${genero ? genero.nome_genero : 'Não informado'}
                </p>
                <p>
                    <strong>Preço:</strong>
                    R$ ${Number(livro.preco_unitario).toFixed(2)}
                </p>
                <p>
                    <strong>Número de páginas:</strong>
                    ${livro.numero_paginas}
                </p>
                <p>
                    <strong>Tipo de capa:</strong>
                    ${livro.tipo_capa}
                </p>
                <div class="acoes-detalhes">
                    <div class="grupo-quantidade">
                        <label for="quantidadeLivro"> Quantidade:</label>
                        <input type="number" id="quantidadeLivro" value="1" min="1" max="${livro.quantidade_estoque}">
                    </div>

                    <button id="btAdicionarCarrinho">
                        Adicionar ao carrinho
                    </button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('btAdicionarCarrinho').onclick = function () {
        const quantidade = document.getElementById('quantidadeLivro').value;
        adicionarCarrinho(livro, quantidade);
    };
}

// INICIALIZAR FUNCIONALIDADES DOS LIVROS
export async function iniciarLivros() {
    document.getElementById('inputPesquisa').oninput = pesquisarLivros;

    document.getElementById('inputPesquisa').onkeydown = function (event) {
        if (event.key === 'Enter') {
            pesquisarLivros();
        }
    };

    document.getElementById('btFecharDetalhes').onclick = function () {
        document.getElementById('detalhesLivro').style.display = 'none';
    };

    // FECHAR DETALHES CLICANDO FORA DA JANELA
    document.getElementById('detalhesLivro').onclick = function (event) {
        if (event.target.id === 'detalhesLivro') {
            document.getElementById('detalhesLivro').style.display = 'none';
        }
    };

    await listarGeneros();
    listarTiposCapa();
    await listarLivros();
}