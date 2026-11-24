const URL_API = 'http://127.0.0.1:3001';

// Elementos da página
const selectPedido = document.getElementById('select-pedido');
const listaLivros = document.getElementById('lista-livros');
const formDevolucao = document.getElementById('form-devolucao');
const listaDevolucoes = document.getElementById('lista-devolucoes');
const pesquisaDevolucao = document.getElementById('pesquisa-devolucao');
const btnRegistrar = document.getElementById('btn-registrar');

let devolucoes = [];

// Inicialização
async function inicializar() {
    await carregarPedidos();
    await listarDevolucoes();
}

// Carregar pedidos disponíveis
async function carregarPedidos() {

    try {

        const resposta = await fetch(`${URL_API}/devolucao/pedidos-disponiveis`, {
            credentials: 'include'
        });

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            throw new Error(dados.mensagem);
        }

        selectPedido.innerHTML = '<option value="">Selecione um pedido</option>';

        dados.pedidos.forEach(pedido => {

            const opcao = document.createElement('option');

            opcao.value = pedido.id_pedido;
            opcao.textContent =
                `Pedido ${pedido.id_pedido} - ${pedido.nome_pessoa}`;

            selectPedido.appendChild(opcao);

        });

    } catch (erro) {

        console.error(erro);
        alert('Não foi possível carregar os pedidos disponíveis.');

    }

}

// Carregar livros do pedido
async function carregarLivros() {

    const idPedido = selectPedido.value;

    listaLivros.innerHTML = '';

    if (!idPedido) {

        listaLivros.innerHTML = `
            <p class="mensagem-vazia">
                Selecione um pedido para visualizar os livros.
            </p>
        `;

        return;
    }

    try {

        const resposta = await fetch(`${URL_API}/devolucao/pedido/${idPedido}`, {
            credentials: 'include'
        });

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            throw new Error(dados.mensagem);
        }

        if (dados.livros.length === 0) {

            listaLivros.innerHTML = `
                <p class="mensagem-vazia">
                    Não existem livros disponíveis para devolução neste pedido.
                </p>
            `;

            return;
        }

        dados.livros.forEach(livro => {

            const quantidadeDisponivel =
                Number(livro.quantidade_disponivel);

            const div = document.createElement('div');

            div.classList.add('livro-devolucao');

            div.innerHTML = `

                <div class="informacoes-livro">

                    <h4>${escaparHTML(livro.nome_livro)}</h4>

                    <p>Comprados: ${livro.quantidade_comprada}</p>

                    <p>Já devolvidos: ${livro.quantidade_devolvida}</p>

                    <p>
                        Disponíveis para devolução:
                        ${quantidadeDisponivel}
                    </p>

                </div>

                <div class="selecao-livro">

                    <label class="label-selecao">

                        <input
                            type="checkbox"
                            class="livro-selecionado"
                            value="${livro.id_livro}"
                        >

                        Selecionar livro para devolução

                    </label>

                    <div class="campos-livro">

                        <label>
                            Quantidade - Pessoal:

                            <input
                                type="number"
                                class="quantidade-pessoal"
                                min="0"
                                max="${quantidadeDisponivel}"
                                value="0"
                                disabled
                            >
                        </label>

                        <label>
                            Quantidade - Defeito:

                            <input
                                type="number"
                                class="quantidade-defeito"
                                min="0"
                                max="${quantidadeDisponivel}"
                                value="0"
                                disabled
                            >
                        </label>

                    </div>

                </div>

            `;

            if (quantidadeDisponivel <= 0) {
                div.querySelector('.livro-selecionado').disabled = true;
            }

            listaLivros.appendChild(div);

        });

    } catch (erro) {

        console.error(erro);

        listaLivros.innerHTML = `
            <p class="mensagem-vazia">
                Não foi possível carregar os livros deste pedido.
            </p>
        `;

    }

}

// Habilitar os campos de cada livro
listaLivros.addEventListener('change', function (evento) {

    if (evento.target.classList.contains('livro-selecionado')) {

        const divLivro = evento.target.closest('.livro-devolucao');

        const quantidadePessoal =
            divLivro.querySelector('.quantidade-pessoal');

        const quantidadeDefeito =
            divLivro.querySelector('.quantidade-defeito');

        quantidadePessoal.disabled = !evento.target.checked;
        quantidadeDefeito.disabled = !evento.target.checked;

        if (!evento.target.checked) {
            quantidadePessoal.value = 0;
            quantidadeDefeito.value = 0;
        }

    }

});

// Verificar se a soma das quantidades está correta
listaLivros.addEventListener('input', function (evento) {

    if (
        evento.target.classList.contains('quantidade-pessoal') ||
        evento.target.classList.contains('quantidade-defeito')
    ) {

        const divLivro = evento.target.closest('.livro-devolucao');

        const quantidadePessoal = Number(
            divLivro.querySelector('.quantidade-pessoal').value
        );

        const quantidadeDefeito = Number(
            divLivro.querySelector('.quantidade-defeito').value
        );

        const quantidadeMaxima = Number(
            divLivro.querySelector('.quantidade-pessoal').max
        );

        if (quantidadePessoal + quantidadeDefeito > quantidadeMaxima) {

            alert(
                `A quantidade total não pode ultrapassar ${quantidadeMaxima}.`
            );

            evento.target.value = 0;
        }

    }

});

// Registrar devolução
async function registrarDevolucao(evento) {

    evento.preventDefault();

    const idPedido = selectPedido.value;

    if (!idPedido) {
        alert('Selecione um pedido.');
        return;
    }

    const itens = [];

    const livrosSelecionados =
        listaLivros.querySelectorAll('.livro-selecionado:checked');

    if (livrosSelecionados.length === 0) {
        alert('Selecione pelo menos um livro para devolver.');
        return;
    }

    for (const checkbox of livrosSelecionados) {

        const divLivro = checkbox.closest('.livro-devolucao');

        const quantidadePessoal = Number(
            divLivro.querySelector('.quantidade-pessoal').value
        );

        const quantidadeDefeito = Number(
            divLivro.querySelector('.quantidade-defeito').value
        );

        const quantidadeMaxima = Number(
            divLivro.querySelector('.quantidade-pessoal').max
        );

        if (
            !Number.isInteger(quantidadePessoal) ||
            !Number.isInteger(quantidadeDefeito) ||
            quantidadePessoal < 0 ||
            quantidadeDefeito < 0 ||
            quantidadePessoal + quantidadeDefeito <= 0 ||
            quantidadePessoal + quantidadeDefeito > quantidadeMaxima
        ) {

            alert('Verifique as quantidades informadas para cada livro.');
            return;

        }

        // Registrar quantidade por motivo pessoal
        if (quantidadePessoal > 0) {

            itens.push({
                id_livro: Number(checkbox.value),
                quantidade: quantidadePessoal,
                motivo_devolucao: 'Pessoal'
            });

        }

        // Registrar quantidade por defeito
        if (quantidadeDefeito > 0) {

            itens.push({
                id_livro: Number(checkbox.value),
                quantidade: quantidadeDefeito,
                motivo_devolucao: 'Defeito'
            });

        }

    }

    const dadosDevolucao = {
        id_pedido: Number(idPedido),
        itens: itens
    };

    try {

        btnRegistrar.disabled = true;
        btnRegistrar.textContent = 'Registrando...';

        const resposta = await fetch(`${URL_API}/devolucao`, {

            method: 'POST',

            headers: {
                'Content-Type': 'application/json'
            },

            credentials: 'include',

            body: JSON.stringify(dadosDevolucao)

        });

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            throw new Error(dados.mensagem || 'Erro ao registrar devolução.');
        }

        alert('Devolução registrada com sucesso!');

        formDevolucao.reset();

        listaLivros.innerHTML = `
            <p class="mensagem-vazia">
                Selecione um pedido para visualizar os livros.
            </p>
        `;

        await carregarPedidos();
        await listarDevolucoes();

    } catch (erro) {

        console.error(erro);

        alert(erro.message || 'Não foi possível registrar a devolução.');

    } finally {

        btnRegistrar.disabled = false;
        btnRegistrar.textContent = 'Registrar Devolução';

    }

}

// Listar histórico
async function listarDevolucoes() {

    try {

        const resposta = await fetch(`${URL_API}/devolucao`, {
            credentials: 'include'
        });

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            throw new Error(dados.mensagem);
        }

        devolucoes = dados.devolucoes;

        mostrarDevolucoes(devolucoes);

    } catch (erro) {

        console.error(erro);

        listaDevolucoes.innerHTML = `
            <tr>
                <td colspan="7">
                    Não foi possível carregar o histórico.
                </td>
            </tr>
        `;

    }

}

// Mostrar histórico
function mostrarDevolucoes(lista) {

    listaDevolucoes.innerHTML = '';

    if (lista.length === 0) {

        listaDevolucoes.innerHTML = `
            <tr>
                <td colspan="7">
                    Nenhuma devolução encontrada.
                </td>
            </tr>
        `;

        return;
    }

    lista.forEach(devolucao => {

        const linha = document.createElement('tr');

        linha.innerHTML = `
            <td>${devolucao.id_devolucao}</td>
            <td>${devolucao.id_pedido}</td>
            <td>${escaparHTML(devolucao.nome_livro)}</td>
            <td>${devolucao.quantidade_devolvida}</td>
            <td>${escaparHTML(devolucao.motivo_devolucao)}</td>
            <td>${formatarData(devolucao.data_devolucao)}</td>
            <td>${escaparHTML(devolucao.nome_funcionario)}</td>
        `;

        listaDevolucoes.appendChild(linha);

    });

}

// Pesquisar histórico
function pesquisarDevolucoes() {

    const pesquisa = pesquisaDevolucao.value.toLowerCase();

    const resultado = devolucoes.filter(devolucao => {

        return (
            String(devolucao.id_pedido).includes(pesquisa) ||
            String(devolucao.id_devolucao).includes(pesquisa) ||
            devolucao.nome_livro.toLowerCase().includes(pesquisa) ||
            devolucao.nome_funcionario.toLowerCase().includes(pesquisa)
        );

    });

    mostrarDevolucoes(resultado);

}

// Formatar data
function formatarData(data) {

    if (!data) {
        return '-';
    }

    return new Date(data).toLocaleString('pt-BR');

}

// Escapar textos
function escaparHTML(texto) {

    return String(texto ?? '').replace(/[&<>"']/g, caractere => {

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

// Eventos
selectPedido.addEventListener('change', carregarLivros);

formDevolucao.addEventListener('submit', registrarDevolucao);

pesquisaDevolucao.addEventListener('input', pesquisarDevolucoes);