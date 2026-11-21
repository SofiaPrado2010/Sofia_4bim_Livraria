const URL_API = 'http://127.0.0.1:3001';

let oQueEstaFazendo = '';
let forma_pagamento = null;
bloquearAtributos(true);

async function procurePorChavePrimaria(chave) {
    try {
        const resposta = await fetch(`${URL_API}/forma_pagamento/${chave}`);
        const data = await resposta.json();
        return data.sucesso ? data.forma_pagamento : null;
    } catch (erro) {
        return null;
    }
}

async function procure() {
    const id_forma_pagamento = document.getElementById("inputId_forma_pagamento").value.trim().toUpperCase();
    if (isNaN(id_forma_pagamento) || !Number.isInteger(Number(id_forma_pagamento)) || id_forma_pagamento === "" || id_forma_pagamento < 0) {
        mostrarAviso("Por favor digite um número inteiro");
        return;
    }

    document.getElementById("inputId_forma_pagamento").value = id_forma_pagamento;
    forma_pagamento = await procurePorChavePrimaria(id_forma_pagamento);
    oQueEstaFazendo = '';
    
    if (forma_pagamento) {
        mostrarDadosForma_pagamento(forma_pagamento);
        visibilidadeDosBotoes('inline', 'none', 'inline', 'inline', 'none');
        mostrarAviso("Achou no banco, pode alterar ou excluir");
    } else {
        limparAtributos();
        visibilidadeDosBotoes('inline', 'inline', 'none', 'none', 'none');
        mostrarAviso("Não achou no banco, pode inserir");
    }
}

function inserir() {
    bloquearAtributos(false);
    visibilidadeDosBotoes('none', 'none', 'none', 'none', 'inline');
    oQueEstaFazendo = 'inserindo';
    mostrarAviso("INSERINDO - Digite o nome da unidade e clique em salvar");
}

function alterar() {
    bloquearAtributos(false);
    visibilidadeDosBotoes('none', 'none', 'none', 'none', 'inline');
    oQueEstaFazendo = 'alterando';
    mostrarAviso("ALTERANDO - Digite o novo nome e clique em salvar");
}

function excluir() {
    bloquearAtributos(true);
    visibilidadeDosBotoes('none', 'none', 'none', 'none', 'inline');
    oQueEstaFazendo = 'excluindo';
    mostrarAviso("EXCLUINDO - Clique em salvar para confirmar a exclusão");
}

async function salvar() {
    const id_forma_pagamento = document.getElementById("inputId_forma_pagamento").value.trim().toUpperCase();
    const nome_forma_pagamento = document.getElementById("inputNome_forma_pagamento").value;

    const dadosForma_pagamento = { id_forma_pagamento, nome_forma_pagamento };

    try {
        if (oQueEstaFazendo === 'inserindo') {
            const resp = await fetch(`${URL_API}/forma_pagamento`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dadosForma_pagamento) });
            const data = await resp.json();
            if (!data.sucesso) return mostrarAviso(data.mensagem);
            mostrarAviso("Inserido no Banco de Dados com sucesso!");
        } else if (oQueEstaFazendo === 'alterando') {
            const resp = await fetch(`${URL_API}/forma_pagamento/${id_forma_pagamento}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dadosForma_pagamento) });
            const data = await resp.json();
            if (!data.sucesso) return mostrarAviso(data.mensagem);
            mostrarAviso("Alterado no Banco de Dados com sucesso!");
        } else if (oQueEstaFazendo === 'excluindo') {
            const resposta = await fetch(`${URL_API}/forma_pagamento/${id_forma_pagamento}`, { method: 'DELETE' });
            const data = await resposta.json();
            if (!data.sucesso) {
                mostrarAviso(data.mensagem || "Erro ao excluir no servidor.");
                return;
            }
            mostrarAviso("Excluído do Banco de Dados!");
        }

        visibilidadeDosBotoes('inline', 'none', 'none', 'none', 'none');
        limparAtributos();
        document.getElementById("inputId_forma_pagamento").value = "";
        listar();
    } catch (erro) {
        mostrarAviso("Erro ao efetuar operação no servidor.");
    }
}

async function listar() {
    try {
        const resposta = await fetch(`${URL_API}/forma_pagamento/listar`);
        const data = await resposta.json();

        if (data.sucesso) {
            let texto = `
                <table class="tabela-formas_pagamento">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nome da forma de pagamento</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            for (let linha of data.forma_pagamento) {
                texto += `
                    <tr>
                        <td>${linha.id_forma_pagamento}</td>
                        <td>${linha.nome_forma_pagamento}</td>
                    </tr>
                `;
            }

            texto += `
                    </tbody>
                </table>
            `;

            document.getElementById("outputSaida").innerHTML = data.forma_pagamento.length > 0 ? texto : "Nenhuma forma de pagamento cadastrada.";

        } else {
            document.getElementById("outputSaida").innerHTML = `Erro no banco: ${data.mensagem}`;
        }

    } catch (erro) {
        console.error("Erro ao listar:", erro);
        document.getElementById("outputSaida").innerHTML = "Servidor offline ou erro de conexão (CORS).";
    }
}

function cancelarOperacao() {
    limparAtributos();
    bloquearAtributos(true);
    visibilidadeDosBotoes('inline', 'none', 'none', 'none', 'none');
    mostrarAviso("Cancelou a operação");
}

function mostrarAviso(mensagem) {
    document.getElementById("divAviso").innerHTML = mensagem;
}

function mostrarDadosForma_pagamento(c) {
    document.getElementById("inputId_forma_pagamento").value = c.id_forma_pagamento;
    document.getElementById("inputNome_forma_pagamento").value = c.nome_forma_pagamento;
    bloquearAtributos(true);
}

function limparAtributos() {
    forma_pagamento = null;
    oQueEstaFazendo = '';
    document.getElementById("inputNome_forma_pagamento").value = "";
    bloquearAtributos(true);
}

function bloquearAtributos(soLeitura) {
    document.getElementById("inputId_forma_pagamento").readOnly = !soLeitura;
    document.getElementById("inputNome_forma_pagamento").readOnly = soLeitura;
}

function visibilidadeDosBotoes(btP, btI, btA, btE, btS) {
    document.getElementById("btProcure").style.display = btP;
    document.getElementById("btInserir").style.display = btI;
    document.getElementById("btAlterar").style.display = btA;
    document.getElementById("btExcluir").style.display = btE;
    document.getElementById("btSalvar").style.display = btS;
    document.getElementById("btCancelar").style.display = btS;
}