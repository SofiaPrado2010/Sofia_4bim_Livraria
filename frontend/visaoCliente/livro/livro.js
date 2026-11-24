import { adicionarCarrinho } from '../carrinho/carrinho.js';

const URL_API = 'http://127.0.0.1:3001';

// Variáveis para guardar os dados
let listaGeneros = [];
let listaLivros = [];
let generoSelecionado = null;
let capaSelecionada = null;
let pesquisaAtual = '';

// Buscar os gêneros no banco de dados
async function listarGeneros() {
    const resposta = await fetch(`${URL_API}/genero/listar`);
    const dados = await resposta.json();

    listaGeneros = dados.generos;

    const filtroGenero = document.getElementById('filtroGenero');

    filtroGenero.innerHTML = '';

    listaGeneros.forEach(genero => {
        const botao = document.createElement('button');

        botao.textContent = genero.nome_genero;

        botao.onclick = function () {
            if (generoSelecionado === genero.id_genero) {
                generoSelecionado = null;
            } else {
                generoSelecionado = genero.id_genero;
            }

            aplicarFiltros();
        };

        filtroGenero.appendChild(botao);
    });
}

// Criar os botões de tipo de capa
function listarTiposCapa() {
    const tiposCapa = ['Capa comum', 'Capa dura'];

    const filtroCapa = document.getElementById('filtroCapa');

    filtroCapa.innerHTML = '';

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

// Buscar os livros no banco de dados
async function listarLivros() {
    const resposta = await fetch(`${URL_API}/livro/catalogo`);
    const dados = await resposta.json();

    listaLivros = dados.livros;

    exibirLivros(listaLivros);
}

// Exibir os livros no catálogo
function exibirLivros(livros) {
    const lista = document.getElementById('listaLivros');

    lista.innerHTML = '';

    if (livros.length === 0) {
        lista.innerHTML = '<p>Livro não encontrado.</p>';
        return;
    }

    livros.forEach(livro => {
        const card = document.createElement('div');

        card.classList.add('card-livro');

        card.onclick = function () {
            abrirDetalhes(livro);
        };

        card.innerHTML = `
            <img src="${URL_API}/imagens/${livro.id_livro}.png"
                 alt="Capa do livro ${livro.nome_livro}">

            <h3>${livro.nome_livro}</h3>
            <p>Autor: ${livro.autor}</p>
            <p>Preço: R$ ${Number(livro.preco_unitario).toFixed(2)}</p>
            <p>Tipo de capa: ${livro.tipo_capa}</p>
        `;

        lista.appendChild(card);
    });
}

// Aplicar filtros
function aplicarFiltros() {
    let livrosFiltrados = listaLivros;

    if (generoSelecionado !== null) {
        livrosFiltrados = livrosFiltrados.filter(livro =>
            livro.id_genero === generoSelecionado
        );
    }

    if (capaSelecionada !== null) {
        livrosFiltrados = livrosFiltrados.filter(livro =>
            livro.tipo_capa === capaSelecionada
        );
    }

    if (pesquisaAtual.trim() !== '') {
        const pesquisa = pesquisaAtual
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');

        livrosFiltrados = livrosFiltrados.filter(livro => {
            const nome = livro.nome_livro
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '');

            const autor = livro.autor
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '');

            return nome.includes(pesquisa) || autor.includes(pesquisa);
        });
    }

    exibirLivros(livrosFiltrados);
}

// Pesquisar livros
function pesquisarLivros() {
    const input = document.getElementById('inputPesquisa');

    pesquisaAtual = input.value;

    aplicarFiltros();
}

// Abrir detalhes do livro
function abrirDetalhes(livro) {
    const detalhes = document.getElementById('detalhesLivro');
    const conteudo = document.getElementById('conteudoDetalhes');

    detalhes.style.display = 'flex';

    const genero = listaGeneros.find(g =>
        g.id_genero === livro.id_genero
    );

    conteudo.innerHTML = `
    <div class="detalhe-livro">

        <img src="${URL_API}/imagens/${livro.id_livro}.png"
             alt="Capa de ${livro.nome_livro}">

        <div>
            <h2>${livro.nome_livro}</h2>

            <p><strong>Autor:</strong> ${livro.autor}</p>
            <p><strong>Gênero:</strong> ${genero ? genero.nome_genero : 'Não informado'}</p>
            <p><strong>Preço:</strong> R$ ${Number(livro.preco_unitario).toFixed(2)}</p>
            <p><strong>Número de páginas:</strong> ${livro.numero_paginas}</p>
            <p><strong>Tipo de capa:</strong> ${livro.tipo_capa}</p>

            <label for="quantidadeLivro">Quantidade:</label>
            <input
                type="number"
                id="quantidadeLivro"
                value="1"
                min="1"
                max="${livro.quantidade_estoque}"
            >

            <button id="btAdicionarCarrinho">
                Adicionar ao carrinho
            </button>
        </div>
    </div>`;

    document.getElementById('btAdicionarCarrinho').onclick = function () {
        const quantidade = document.getElementById('quantidadeLivro').value;

        adicionarCarrinho(livro, quantidade);
    };

}

// Inicializar as funcionalidades dos livros
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

    await listarGeneros();
    listarTiposCapa();
    await listarLivros();
}