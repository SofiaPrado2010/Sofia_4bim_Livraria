
const URL_API = 'http://127.0.0.1:3001';
const SILHUETA_URL = `${URL_API}/imagens/silhueta.png`;

let oQueEstaFazendo = '';
let livro = null;

bloquearAtributos(true);

async function inicializar() {
    await carregarGeneros();
    await listar();
}

async function carregarGeneros() {
    const select = document.getElementById("selectId_genero");

    try {
        const resposta = await fetch(`${URL_API}/genero/listar`);
        const data = await resposta.json();

        if (data.sucesso) {
            select.innerHTML = '<option value="">-- Selecione um Gênero --</option>';

            data.generos.forEach(um => {
                select.innerHTML += `<option value="${um.id_genero}">${um.id_genero} - ${um.nome_genero}</option>`;
            });
        } else {
            select.innerHTML = '<option value="">Erro ao carregar gêneros</option>';
        }

    } catch (erro) {
        console.error("Erro ao carregar gêneros:", erro);
        select.innerHTML = '<option value="">Erro ao carregar gêneros</option>';
    }
}

function carregarImagem(id) {
    const img = document.getElementById('imglivro');

    img.onerror = null;

    if (!id) {
        img.src = `${SILHUETA_URL}?t=${Date.now()}`;
        return;
    }

    img.src = `${URL_API}/imagens/${id}.png?t=${Date.now()}`;

    img.onerror = () => {
        img.onerror = null;
        img.src = `${SILHUETA_URL}?t=${Date.now()}`;
    };
}

function acionarUpload() {
    if (oQueEstaFazendo !== 'inserindo' && oQueEstaFazendo !== 'alterando') {
        mostrarAviso("Clique em Inserir ou Alterar primeiro para poder escolher uma imagem.");
        return;
    }

    document.getElementById('inputImagem').click();
}

function previewImagem() {
    const inputFiles = document.getElementById('inputImagem').files;

    if (inputFiles.length > 0) {
        const url = URL.createObjectURL(inputFiles[0]);

        document.getElementById('imglivro').src = url;

        mostrarAviso("Imagem escolhida! Clique em Salvar para concluir.");
    }
}

async function uploadImagemParaServidor(id) {
    const inputFiles = document.getElementById('inputImagem').files;

    if (inputFiles.length === 0) {
        return;
    }

    const formData = new FormData();
    formData.append('imagem', inputFiles[0]);

    const resposta = await fetch(`${URL_API}/livro/upload/${id}`, {
        method: 'POST',
        credentials: 'include',
        body: formData
    });

    const data = await resposta.json();

    if (!resposta.ok || !data.sucesso) {
        throw new Error(data.mensagem || "Erro ao enviar a imagem.");
    }
}

async function procurePorChavePrimaria(chave) {
    try {
        const resposta = await fetch(`${URL_API}/livro/${chave}`);
        const data = await resposta.json();

        return data.sucesso ? data.livro : null;

    } catch (erro) {
        console.error("Erro ao procurar livro:", erro);
        return null;
    }
}

async function procure() {
    const id_livro = document.getElementById("inputId_livro").value;

    if (isNaN(id_livro) || !Number.isInteger(Number(id_livro)) || id_livro === "" || id_livro < 0) {
        mostrarAviso("Por favor, digite um número inteiro positivo.");
        return;
    }

    livro = await procurePorChavePrimaria(id_livro);
    oQueEstaFazendo = '';

    if (livro) {
        mostrarDadosLivro(livro);

        document.getElementById("inputId_livro").readOnly = true;

        carregarImagem(id_livro);

        visibilidadeDosBotoes('inline', 'none', 'inline', 'inline', 'none');

        mostrarAviso("Achou no banco, pode alterar ou excluir.");

    } else {
        limparAtributos();
        carregarImagem(null);

        visibilidadeDosBotoes('inline', 'inline', 'none', 'none', 'none');

        mostrarAviso("Não achou no banco, pode inserir.");
    }
}

function inserir() {
    bloquearAtributos(false);

    visibilidadeDosBotoes('none', 'none', 'none', 'none', 'inline');

    oQueEstaFazendo = 'inserindo';

    mostrarAviso("INSERINDO - Digite os atributos, escolha a imagem e clique em salvar.");
}

function alterar() {
    bloquearAtributos(false);

    visibilidadeDosBotoes('none', 'none', 'none', 'none', 'inline');

    oQueEstaFazendo = 'alterando';

    mostrarAviso("ALTERANDO - Digite os atributos, mude a imagem (opcional) e clique em salvar.");
}

function excluir() {
    bloquearAtributos(true);

    visibilidadeDosBotoes('none', 'none', 'none', 'none', 'inline');

    oQueEstaFazendo = 'excluindo';

    mostrarAviso("EXCLUINDO - Clique em salvar para confirmar a exclusão.");
}

async function salvar() {
    const id_livro = document.getElementById("inputId_livro").value;
    const nome_livro = document.getElementById("inputNome_livro").value;
    const id_genero = document.getElementById("selectId_genero").value || null;
    const autor = document.getElementById("inputAutor").value;
    const preco_unitario = parseFloat(document.getElementById("inputPreco").value);
    const numero_paginas = parseInt(document.getElementById("inputPaginas").value);
    const tipo_capa = document.getElementById("selectTipoCapa").value;

    const dadosLivro = {
        id_livro,
        nome_livro,
        autor,
        preco_unitario,
        numero_paginas,
        id_genero,
        tipo_capa
    };

    try {
        let resposta;
        let data;

        if (oQueEstaFazendo === 'inserindo') {
            resposta = await fetch(`${URL_API}/livro`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dadosLivro)
            });

            data = await resposta.json();

            if (!resposta.ok || !data.sucesso) {
                throw new Error(data.mensagem || "Erro ao cadastrar livro.");
            }

            await uploadImagemParaServidor(id_livro);

            mostrarAviso("Livro cadastrado com sucesso!");

        } else if (oQueEstaFazendo === 'alterando') {
            resposta = await fetch(`${URL_API}/livro/${id_livro}`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dadosLivro)
            });

            data = await resposta.json();

            if (!resposta.ok || !data.sucesso) {
                throw new Error(data.mensagem || "Erro ao atualizar livro.");
            }

            await uploadImagemParaServidor(id_livro);

            mostrarAviso("Livro atualizado com sucesso!");

        } else if (oQueEstaFazendo === 'excluindo') {
            resposta = await fetch(`${URL_API}/livro/${id_livro}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            data = await resposta.json();

            if (!resposta.ok || !data.sucesso) {
                throw new Error(data.mensagem || "Erro ao excluir livro.");
            }

            mostrarAviso("Livro excluído com sucesso!");
        }

        // Limpa os campos e restaura a imagem padrão
        limparAtributos();
        carregarImagem(null);

        document.getElementById("inputId_livro").value = "";

        visibilidadeDosBotoes('inline', 'none', 'none', 'none', 'none');

        await listar();

    } catch (erro) {
        console.error("Erro ao salvar livro:", erro);

        mostrarAviso(erro.message || "Erro ao efetuar operação no servidor.");
    }
}

async function listar() {
    try {
        const resposta = await fetch(`${URL_API}/livro/listar`);
        const data = await resposta.json();

        if (!resposta.ok || !data.sucesso) {
            throw new Error(data.mensagem || "Não foi possível carregar os livros.");
        }

        if (!Array.isArray(data.livros)) {
            throw new Error("O servidor não retornou uma lista válida de livros.");
        }

        let texto = `
            <table class="tabela-livros">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nome do livro</th>
                        <th>Autor</th>
                        <th>Gênero</th>
                        <th>Preço</th>
                        <th>Páginas</th>
                        <th>Capa</th>
                        <th>Status</th>
                        <th>Ação</th>
                    </tr>
                </thead>
                <tbody>
        `;

        for (let linha of data.livros) {
            texto += `
                <tr>
                    <td>${linha.id_livro}</td>
                    <td>${linha.nome_livro}</td>
                    <td>${linha.autor}</td>
                    <td>${linha.id_genero || '-'}</td>
                    <td>R$ ${parseFloat(linha.preco_unitario).toFixed(2)}</td>
                    <td>${linha.numero_paginas}</td>
                    <td>${linha.tipo_capa}</td>
                    <td>
                        <span class="${linha.ativo ? 'status-ativo' : 'status-inativo'}">
                            ${linha.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                    </td>
                    <td>
                        ${linha.ativo
                    ? `<button class="bt-status bt-desativar"
                                    onclick="alterarStatusLivro(${linha.id_livro}, false)">
                                    Desativar
                                  </button>`
                    : `<button class="bt-status bt-reativar"
                                    onclick="alterarStatusLivro(${linha.id_livro}, true)">
                                    Reativar
                                  </button>`
                }
                    </td>
                </tr>
            `;
        }

        texto += `
                </tbody>
            </table>
        `;

        document.getElementById("outputSaida").innerHTML =
            data.livros.length > 0 ? texto : "Nenhum livro cadastrado.";

    } catch (erro) {
        console.error("Erro ao listar livros:", erro);

        document.getElementById("outputSaida").innerHTML =
            erro.message || "Erro ao carregar os livros.";
    }
}

async function alterarStatusLivro(id, reativar) {
    const acao = reativar ? 'reativar' : 'desativar';

    try {
        const resposta = await fetch(
            `${URL_API}/livro/${id}/${acao}`,
            {
                method: 'PUT',
                credentials: 'include'
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            mostrarAviso(dados.mensagem || 'Não foi possível alterar o status.');
            return;
        }

        mostrarAviso(dados.mensagem);

        await listar();

    } catch (erro) {
        console.error('Erro ao alterar status:', erro);
        mostrarAviso('Erro ao comunicar com o servidor.');
    }
}

function cancelarOperacao() {
    limparAtributos();

    carregarImagem(null);

    bloquearAtributos(true);

    visibilidadeDosBotoes('inline', 'none', 'none', 'none', 'none');

    mostrarAviso("Operação cancelada.");
}

function mostrarAviso(mensagem) {
    document.getElementById("divAviso").innerHTML = mensagem;
}

function mostrarDadosLivro(l) {
    document.getElementById("inputId_livro").value = l.id_livro;
    document.getElementById("inputNome_livro").value = l.nome_livro;
    document.getElementById("selectId_genero").value = l.id_genero || "";
    document.getElementById("inputAutor").value = l.autor;
    document.getElementById("inputPreco").value = l.preco_unitario;
    document.getElementById("inputPaginas").value = l.numero_paginas;

    const tipoCapa = String(l.tipo_capa || '').trim().toLowerCase();

    if (tipoCapa === 'dura' || tipoCapa === 'capa dura') {
        document.getElementById("selectTipoCapa").value = "Capa dura";
    } else if (tipoCapa === 'comum' || tipoCapa === 'capa comum') {
        document.getElementById("selectTipoCapa").value = "Capa comum";
    } else {
        document.getElementById("selectTipoCapa").value = "";
    }

    bloquearAtributos(true);
}

function limparAtributos() {
    livro = null;
    oQueEstaFazendo = '';

    document.getElementById("inputNome_livro").value = "";
    document.getElementById("selectId_genero").value = "";
    document.getElementById("inputAutor").value = "";
    document.getElementById("inputPreco").value = "";
    document.getElementById("inputPaginas").value = "";
    document.getElementById("inputImagem").value = "";
    document.getElementById("selectTipoCapa").value = "";

    bloquearAtributos(true);
}

function bloquearAtributos(soLeitura) {
    document.getElementById("inputId_livro").readOnly = !soLeitura;
    document.getElementById("inputNome_livro").readOnly = soLeitura;
    document.getElementById("selectId_genero").disabled = soLeitura;
    document.getElementById("inputAutor").readOnly = soLeitura;
    document.getElementById("inputPreco").readOnly = soLeitura;
    document.getElementById("inputPaginas").readOnly = soLeitura;
    document.getElementById("selectTipoCapa").disabled = soLeitura;
}

function visibilidadeDosBotoes(btP, btI, btA, btE, btS) {
    document.getElementById("btProcure").style.display = btP;
    document.getElementById("btInserir").style.display = btI;
    document.getElementById("btAlterar").style.display = btA;
    document.getElementById("btExcluir").style.display = btE;
    document.getElementById("btSalvar").style.display = btS;
    document.getElementById("btCancelar").style.display = btS;
}