const URL_API = 'http://127.0.0.1:3001';

let oQueEstaFazendo = '';
let funcionario = null;

bloquearAtributos(true);
visibilidadeDosBotoes('inline', 'none', 'none', 'none', 'none');

// Procurar funcionário pela chave primária
async function procurePorChavePrimaria(chave) {
    try {
        const resposta = await fetch(`${URL_API}/funcionario/${chave}`);
        const data = await resposta.json();

        return data.sucesso ? data.funcionario : null;

    } catch (erro) {
        console.error('Erro ao procurar funcionário:', erro);
        return null;
    }
}

// Buscar funcionário pelo CPF
async function buscar() {
    const cpf = document.getElementById('inputCpf').value.trim();

    if (cpf === '' || !/^\d{11}$/.test(cpf)) {
        mostrarAviso('Por favor, digite um CPF válido com 11 números.');
        return;
    }

    document.getElementById('inputCpf').value = cpf;

    funcionario = await procurePorChavePrimaria(cpf);
    oQueEstaFazendo = '';

    if (funcionario) {
        await listarCargos();
        mostrarDadosFuncionario(funcionario);
        visibilidadeDosBotoes('inline', 'none', 'inline', 'inline', 'none');
        mostrarAviso('Funcionário encontrado! Pode alterar ou excluir.');

    } else {
        limparAtributos();
        document.getElementById('inputCpf').value = cpf;
        visibilidadeDosBotoes('inline', 'inline', 'none', 'none', 'none');
        mostrarAviso('Funcionário não encontrado. Pode inserir.');
    }
}

// Preparar inclusão
function incluir() {
    const cpf = document.getElementById('inputCpf').value;
    limparAtributos();
    document.getElementById('inputCpf').value = cpf;
    bloquearAtributos(false);
    visibilidadeDosBotoes('none', 'none', 'none', 'none', 'inline');
    oQueEstaFazendo = 'inserindo';
    mostrarAviso('INSERINDO - Preencha os dados e clique em salvar.');
}

// Preparar alteração
function alterar() {
    if (!funcionario) {
        mostrarAviso('Busque um funcionário antes de alterar.');
        return;
    }

    bloquearAtributos(true, true);

    document.getElementById('selectCargo').disabled = false;
    document.getElementById('inputDataContratacao').readOnly = false;
    document.getElementById('inputSalario').readOnly = false;
    document.getElementById('inputComissao').readOnly = false;

    visibilidadeDosBotoes('none', 'none', 'none', 'none', 'inline');
    oQueEstaFazendo = 'alterando';
    mostrarAviso('ALTERANDO - Modifique os dados profissionais e clique em salvar.');
}

// Preparar exclusão
function excluir() {
    if (!funcionario) {
        mostrarAviso('Busque um funcionário antes de excluir.');
        return;
    }

    bloquearAtributos(true, true);
    visibilidadeDosBotoes('none', 'none', 'none', 'none', 'inline');
    oQueEstaFazendo = 'excluindo';
    mostrarAviso('EXCLUINDO - Clique em salvar para confirmar a exclusão.');
}

// Salvar operação
async function salvar() {
    try {
        const cpf_pessoa = document.getElementById("inputCpf").value.trim();
        const nome_pessoa = document.getElementById("inputNome").value.trim();
        const data_nascimento_pessoa = document.getElementById("inputDataNascimento").value;
        const endereco_pessoa = document.getElementById("inputEndereco").value.trim();
        const usuario_pessoa = document.getElementById("inputUsuario").value.trim();
        const senha_pessoa = document.getElementById("inputSenha").value;
        const email_pessoa = document.getElementById("inputEmail").value.trim();
        const id_cargo = document.getElementById("selectCargo").value;
        const data_contratacao = document.getElementById("inputDataContratacao").value;
        const salario = document.getElementById("inputSalario").value;
        const porcentagem_comissao_funcionario = document.getElementById("inputComissao").value || 0;

        const dadosFuncionario = {
            cpf_pessoa,
            cpf_funcionario: cpf_pessoa,
            nome_pessoa,
            data_nascimento_pessoa,
            endereco_pessoa,
            usuario_pessoa,
            senha_pessoa,
            email_pessoa,
            id_cargo,
            data_contratacao,
            salario,
            porcentagem_comissao_funcionario
        };

        let resposta;

        // Inclusão
        if (oQueEstaFazendo === 'inserindo') {

            if (
                !cpf_pessoa ||
                !/^\d{11}$/.test(cpf_pessoa) ||
                !nome_pessoa ||
                !data_nascimento_pessoa ||
                !endereco_pessoa ||
                !usuario_pessoa ||
                !senha_pessoa ||
                !email_pessoa ||
                !id_cargo ||
                !data_contratacao ||
                salario === ''
            ) {
                mostrarAviso('Preencha todos os campos obrigatórios corretamente.');
                return;
            }

            if (!Number.isFinite(Number(salario)) || Number(salario) < 1621) {
                mostrarAviso('O funcionário deve receber pelo menos um salário mínimo.');
                return;
            }

            if (
                !Number.isFinite(Number(porcentagem_comissao_funcionario)) ||
                Number(porcentagem_comissao_funcionario) < 0
            ) {
                mostrarAviso('A porcentagem de comissão não pode ser negativa.');
                return;
            }

            resposta = await fetch(`${URL_API}/funcionario`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dadosFuncionario)
            });

        }

        // Alteração
        else if (oQueEstaFazendo === 'alterando') {

            if (
                !id_cargo ||
                !data_contratacao ||
                salario === ''
            ) {
                mostrarAviso('Preencha os campos profissionais obrigatórios.');
                return;
            }

            if (!Number.isFinite(Number(salario)) || Number(salario) < 1621) {
                mostrarAviso('O funcionário deve receber pelo menos um salário mínimo.');
                return;
            }

            if (
                !Number.isFinite(Number(porcentagem_comissao_funcionario)) ||
                Number(porcentagem_comissao_funcionario) < 0
            ) {
                mostrarAviso('A porcentagem de comissão não pode ser negativa.');
                return;
            }

            resposta = await fetch(`${URL_API}/funcionario/${cpf_pessoa}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id_cargo,
                    data_contratacao,
                    salario,
                    porcentagem_comissao_funcionario
                })
            });

        }

        // Exclusão
        else if (oQueEstaFazendo === 'excluindo') {
            resposta = await fetch(`${URL_API}/funcionario/${cpf_pessoa}`, {
                method: 'DELETE'
            });
        }

        else {
            mostrarAviso('Nenhuma operação foi selecionada.');
            return;
        }

        const data = await resposta.json();
        if (!resposta.ok || !data.sucesso) {
            mostrarAviso(data.mensagem || 'Erro ao efetuar operação.');
            return;
        }

        if (oQueEstaFazendo === 'inserindo') {
            mostrarAviso('Funcionário cadastrado com sucesso!');

        } else if (oQueEstaFazendo === 'alterando') {
            mostrarAviso('Funcionário alterado com sucesso!');

        } else if (oQueEstaFazendo === 'excluindo') {
            mostrarAviso('Funcionário excluído com sucesso!');
        }

        // Finalizar operação
        limparAtributos();
        document.getElementById('inputCpf').value = '';
        bloquearAtributos(true);
        visibilidadeDosBotoes('inline', 'none', 'none', 'none', 'none');
        oQueEstaFazendo = '';
        await listar();

    } catch (erro) {
        console.error('Erro ao salvar:', erro);
        mostrarAviso('Erro ao efetuar operação no servidor.');
    }
}

// Listar funcionários
async function listar() {
    try {
        await listarCargos();

        const resposta = await fetch(`${URL_API}/funcionario`);
        const data = await resposta.json();

        if (data.sucesso) {
            let texto = `
                <table class="tabela-funcionarios">
                    <thead>
                        <tr>
                            <th>CPF</th>
                            <th>Nome</th>
                            <th>Cargo</th>
                            <th>Salário</th>
                            <th>Comissão</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            for (let linha of data.funcionarios) {
                texto += `
                    <tr>
                        <td>${linha.cpf_funcionario}</td>
                        <td>${linha.nome_pessoa}</td>
                        <td>${linha.id_cargo}</td>
                        <td>R$ ${linha.salario}</td>
                        <td>${linha.porcentagem_comissao_funcionario}%</td>
                    </tr>
                `;
            }

            texto += `
                    </tbody>
                </table>
            `;

            document.getElementById('outputSaida').innerHTML =
                data.funcionarios.length > 0
                    ? texto
                    : 'Nenhum funcionário cadastrado.';

        } else {
            document.getElementById('outputSaida').innerHTML =
                `Erro no banco: ${data.mensagem}`;
        }

    } catch (erro) {
        console.error('Erro ao listar funcionários:', erro);

        document.getElementById('outputSaida').innerHTML =
            'Servidor offline ou erro de conexão.';
    }
}

// Listar cargos no select
async function listarCargos() {
    try {
        const resposta = await fetch(`${URL_API}/cargo/listar`);
        const data = await resposta.json();

        if (!data.sucesso) {
            mostrarAviso(data.mensagem);
            return;
        }

        const selectCargo = document.getElementById('selectCargo');

        selectCargo.innerHTML =
            '<option value="">Selecione um cargo</option>';

        for (let cargo of data.cargos) {
            const opcao = document.createElement('option');

            opcao.value = cargo.id_cargo;
            opcao.textContent = cargo.nome_cargo;

            selectCargo.appendChild(opcao);
        }

    } catch (erro) {
        console.error('Erro ao listar cargos:', erro);
        mostrarAviso('Erro ao carregar os cargos.');
    }
}

// Cancelar operação
function cancelar() {
    limparAtributos();
    document.getElementById('inputCpf').value = '';
    bloquearAtributos(true);
    visibilidadeDosBotoes('inline', 'none', 'none', 'none', 'none');
    oQueEstaFazendo = '';
    mostrarAviso('Operação cancelada.');
}

// Mostrar mensagem na barrinha
function mostrarAviso(mensagem) {
    document.getElementById('divAviso').innerHTML = mensagem;
}

// Mostrar dados do funcionário
function mostrarDadosFuncionario(f) {
    document.getElementById('inputCpf').value =
        f.cpf_funcionario || f.cpf_pessoa;

    document.getElementById('inputNome').value = f.nome_pessoa;
    document.getElementById('inputDataNascimento').value = (f.data_nascimento_pessoa || '').substring(0, 10);

    document.getElementById('inputEndereco').value = f.endereco_pessoa;
    document.getElementById('inputUsuario').value = f.usuario_pessoa;
    document.getElementById('inputSenha').value = '';
    document.getElementById('inputEmail').value = f.email_pessoa;
    document.getElementById('selectCargo').value = f.id_cargo;
    document.getElementById('inputDataContratacao').value = (f.data_contratacao || '').substring(0, 10);
    document.getElementById('inputSalario').value = f.salario;
    document.getElementById('inputComissao').value = f.porcentagem_comissao_funcionario;

    bloquearAtributos(true, true);
}

// Limpar campos
function limparAtributos() {
    funcionario = null;
    oQueEstaFazendo = '';

    document.getElementById('inputNome').value = '';
    document.getElementById('inputDataNascimento').value = '';
    document.getElementById('inputEndereco').value = '';
    document.getElementById('inputUsuario').value = '';
    document.getElementById('inputSenha').value = '';
    document.getElementById('inputEmail').value = '';
    document.getElementById('selectCargo').value = '';
    document.getElementById('inputDataContratacao').value = '';
    document.getElementById('inputSalario').value = '';
    document.getElementById('inputComissao').value = '';

    bloquearAtributos(true);
}

// Bloquear ou liberar campos
function bloquearAtributos(soLeitura, cpfSomenteLeitura = false) {
    document.getElementById('inputCpf').readOnly = cpfSomenteLeitura;

    document.getElementById('inputNome').readOnly = soLeitura;
    document.getElementById('inputDataNascimento').readOnly = soLeitura;
    document.getElementById('inputEndereco').readOnly = soLeitura;
    document.getElementById('inputUsuario').readOnly = soLeitura;
    document.getElementById('inputSenha').readOnly = soLeitura;
    document.getElementById('inputEmail').readOnly = soLeitura;
    document.getElementById('selectCargo').disabled = soLeitura;
    document.getElementById('inputDataContratacao').readOnly = soLeitura;
    document.getElementById('inputSalario').readOnly = soLeitura;
    document.getElementById('inputComissao').readOnly = soLeitura;
}

// Controlar visibilidade dos botões
function visibilidadeDosBotoes(btB, btI, btA, btE, btS) {
    document.getElementById('btBuscar').style.display = btB;
    document.getElementById('btIncluir').style.display = btI;
    document.getElementById('btAlterar').style.display = btA;
    document.getElementById('btExcluir').style.display = btE;
    document.getElementById('btSalvar').style.display = btS;
    document.getElementById('btCancelar').style.display = btS;
}

// Conectar os botões
document.getElementById('btBuscar').addEventListener('click', buscar);
document.getElementById('btIncluir').addEventListener('click', incluir);
document.getElementById('btAlterar').addEventListener('click', alterar);
document.getElementById('btExcluir').addEventListener('click', excluir);
document.getElementById('btSalvar').addEventListener('click', salvar);
document.getElementById('btCancelar').addEventListener('click', cancelar);

// Carregar dados ao abrir a página
listar();