const URL_API = 'http://127.0.0.1:3001';

let oQueEstaFazendo = '';
let forma_pagamento = null;

bloquearAtributos(true);

// Normalizar o nome para facilitar a identificação da forma de pagamento
function normalizarNome(nome) {
    return nome
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toUpperCase();
}

// Ajustar o campo de parcelas conforme a forma de pagamento
function ajustarLimiteParcelas() {
    const nome = normalizarNome(
        document.getElementById("inputNome_forma_pagamento").value
    );

    const campoParcelas = document.getElementById("inputMaxParcelas");
    const campoNome = document.getElementById("inputNome_forma_pagamento");

    if (nome !== 'CREDITO') {
        campoParcelas.value = 1;
        campoParcelas.readOnly = true;
        return;
    }

    campoParcelas.readOnly = campoNome.readOnly;

    if (
        campoParcelas.value === '' ||
        Number(campoParcelas.value) < 1
    ) {
        campoParcelas.value = 1;
    }

    if (Number(campoParcelas.value) > 12) {
        campoParcelas.value = 12;
    }
}

// Procurar forma de pagamento pelo ID
async function procurePorChavePrimaria(chave) {
    try {
        const resposta = await fetch(`${URL_API}/forma_pagamento/${chave}`, {
            credentials: 'include'
        });

        const data = await resposta.json();

        return data.sucesso ? data.forma_pagamento : null;

    } catch (erro) {
        return null;
    }
}

// Procurar
async function procure() {
    const id_forma_pagamento = document.getElementById("inputId_forma_pagamento").value.trim().toUpperCase();

    if (
        id_forma_pagamento === "" ||
        isNaN(id_forma_pagamento) ||
        !Number.isInteger(Number(id_forma_pagamento)) ||
        Number(id_forma_pagamento) < 0
    ) {
        mostrarAviso("Por favor, digite um número inteiro válido.");
        return;
    }

    document.getElementById("inputId_forma_pagamento").value = id_forma_pagamento;

    forma_pagamento = await procurePorChavePrimaria(id_forma_pagamento);
    oQueEstaFazendo = '';

    if (forma_pagamento) {
        mostrarDadosForma_pagamento(forma_pagamento);

        visibilidadeDosBotoes('inline', 'none', 'inline', 'none');

        mostrarAviso("Forma de pagamento encontrada! Você pode alterá-la.");

    } else {
        limparAtributos();

        visibilidadeDosBotoes('inline', 'inline', 'none', 'none');

        mostrarAviso("Forma de pagamento não encontrada. Você pode cadastrá-la.");
    }
}

// Inserir
function inserir() {
    bloquearAtributos(false);

    visibilidadeDosBotoes('none', 'none', 'none', 'inline');

    oQueEstaFazendo = 'inserindo';

    ajustarLimiteParcelas();

    mostrarAviso("INSERINDO - Digite os dados da forma de pagamento e clique em salvar.");
}

// Alterar
function alterar() {
    bloquearAtributos(false);

    visibilidadeDosBotoes('none', 'none', 'none', 'inline');

    oQueEstaFazendo = 'alterando';

    ajustarLimiteParcelas();

    mostrarAviso("ALTERANDO - Digite os novos dados e clique em salvar.");
}

// Salvar
async function salvar() {
    const id_forma_pagamento = document.getElementById("inputId_forma_pagamento").value.trim().toUpperCase();
    const nome_forma_pagamento = document.getElementById("inputNome_forma_pagamento").value.trim();

    if (!nome_forma_pagamento) {
        mostrarAviso("O nome da forma de pagamento é obrigatório.");
        return;
    }

    const tipoForma = normalizarNome(nome_forma_pagamento);

    let max_parcelas = 1;

    if (tipoForma === 'CREDITO') {
        max_parcelas = Number(document.getElementById("inputMaxParcelas").value);

        if (
            !Number.isInteger(max_parcelas) ||
            max_parcelas < 1 ||
            max_parcelas > 12
        ) {
            mostrarAviso("A quantidade máxima de parcelas deve ser um número inteiro entre 1 e 12.");
            return;
        }
    }

    const dadosForma_pagamento = {
        id_forma_pagamento,
        nome_forma_pagamento,
        max_parcelas
    };

    try {
        if (oQueEstaFazendo === 'inserindo') {
            const resposta = await fetch(`${URL_API}/forma_pagamento`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(dadosForma_pagamento)
            });

            const data = await resposta.json();

            if (!resposta.ok || !data.sucesso) {
                mostrarAviso(data.mensagem || "Erro ao cadastrar forma de pagamento.");
                return;
            }

            mostrarAviso("Forma de pagamento cadastrada com sucesso!");

        } else if (oQueEstaFazendo === 'alterando') {
            const resposta = await fetch(`${URL_API}/forma_pagamento/${id_forma_pagamento}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(dadosForma_pagamento)
            });

            const data = await resposta.json();

            if (!resposta.ok || !data.sucesso) {
                mostrarAviso(data.mensagem || "Erro ao alterar forma de pagamento.");
                return;
            }

            mostrarAviso("Forma de pagamento alterada com sucesso!");
        }

        visibilidadeDosBotoes('inline', 'none', 'none', 'none');

        limparAtributos();

        document.getElementById("inputId_forma_pagamento").value = "";

        await listar();

    } catch (erro) {
        console.error("Erro ao salvar forma de pagamento:", erro);
        mostrarAviso("Erro ao efetuar operação no servidor.");
    }
}

// Listar todas as formas de pagamento
async function listar() {
    try {
        const resposta = await fetch(`${URL_API}/forma_pagamento/listar`, {
            credentials: 'include',
            cache: 'no-store'
        });

        const data = await resposta.json();

        if (!resposta.ok || !data.sucesso) {
            document.getElementById("outputSaida").innerHTML =
                `Erro ao listar: ${data.mensagem || 'Não foi possível carregar os dados.'}`;
            return;
        }

        let texto = `
            <table class="tabela-formas_pagamento">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nome da forma de pagamento</th>
                        <th>Máximo de parcelas</th>
                        <th>Status</th>
                        <th>Ação</th>
                    </tr>
                </thead>
                <tbody>
        `;

        for (let linha of data.forma_pagamento) {
            const estaAtiva = linha.ativo === true;

            texto += `
                <tr>
                    <td>${linha.id_forma_pagamento}</td>
                    <td>${linha.nome_forma_pagamento}</td>
                    <td>${linha.max_parcelas} ${Number(linha.max_parcelas) === 1 ? 'parcela' : 'parcelas'}</td>

                    <td>
                        <span class="${estaAtiva ? 'status-ativo' : 'status-inativo'}">
                            ${estaAtiva ? 'Ativa' : 'Inativa'}
                        </span>
                    </td>

                    <td>
                        <button
                            type="button"
                            class="bt-status ${estaAtiva ? 'bt-desativar' : 'bt-reativar'}"
                            onclick="alterarStatusFormaPagamento('${linha.id_forma_pagamento}', ${!estaAtiva})">

                            ${estaAtiva ? 'Desativar' : 'Reativar'}

                        </button>
                    </td>
                </tr>
            `;
        }

        texto += `
                </tbody>
            </table>
        `;

        document.getElementById("outputSaida").innerHTML =
            data.forma_pagamento.length > 0
                ? texto
                : "Nenhuma forma de pagamento cadastrada.";

    } catch (erro) {
        console.error("Erro ao listar formas de pagamento:", erro);

        document.getElementById("outputSaida").innerHTML =
            "Servidor offline ou erro de conexão.";
    }
}

// Desativar ou reativar forma de pagamento
async function alterarStatusFormaPagamento(id, reativar) {
    const acao = reativar ? 'reativar' : 'desativar';

    try {
        const resposta = await fetch(
            `${URL_API}/forma_pagamento/${id}/${acao}`,
            {
                method: 'PUT',
                credentials: 'include'
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            mostrarAviso(
                dados.mensagem || 'Não foi possível alterar o status.'
            );
            return;
        }

        mostrarAviso(dados.mensagem);

        await listar();

    } catch (erro) {
        console.error("Erro ao alterar status:", erro);

        mostrarAviso("Erro ao comunicar com o servidor.");
    }
}

// Cancelar operação
function cancelarOperacao() {
    limparAtributos();

    bloquearAtributos(true);

    visibilidadeDosBotoes('inline', 'none', 'none', 'none');

    document.getElementById("inputId_forma_pagamento").value = "";

    mostrarAviso("Operação cancelada.");
}

// Mostrar aviso
function mostrarAviso(mensagem) {
    document.getElementById("divAviso").textContent = mensagem;
}

// Mostrar dados da forma de pagamento
function mostrarDadosForma_pagamento(c) {
    document.getElementById("inputId_forma_pagamento").value = c.id_forma_pagamento;
    document.getElementById("inputNome_forma_pagamento").value = c.nome_forma_pagamento;
    document.getElementById("inputMaxParcelas").value = c.max_parcelas || 1;

    bloquearAtributos(true);

    ajustarLimiteParcelas();
}

// Limpar atributos
function limparAtributos() {
    forma_pagamento = null;
    oQueEstaFazendo = '';

    document.getElementById("inputNome_forma_pagamento").value = "";
    document.getElementById("inputMaxParcelas").value = 1;

    bloquearAtributos(true);
}

// Bloquear ou liberar campos
function bloquearAtributos(soLeitura) {
    document.getElementById("inputId_forma_pagamento").readOnly = !soLeitura;
    document.getElementById("inputNome_forma_pagamento").readOnly = soLeitura;

    ajustarLimiteParcelas();
}

// Controlar visibilidade dos botões
function visibilidadeDosBotoes(btP, btI, btA, btS) {
    document.getElementById("btProcure").style.display = btP;
    document.getElementById("btInserir").style.display = btI;
    document.getElementById("btAlterar").style.display = btA;
    document.getElementById("btSalvar").style.display = btS;
    document.getElementById("btCancelar").style.display = btS;
}