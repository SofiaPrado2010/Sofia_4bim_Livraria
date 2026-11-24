const URL_API = 'http://127.0.0.1:3001';

let oQueEstaFazendo = '';
let cliente = null;
let pessoaExistente = false;

bloquearAtributos(true);
visibilidadeDosBotoes('inline', 'none', 'none', 'none', 'none');

// Procurar cliente pelo CPF
async function procurePorChavePrimaria(chave) {
    try {
        const resposta = await fetch(`${URL_API}/cliente/${chave}`);
        const data = await resposta.json();

        return data.sucesso ? data.cliente : null;

    } catch (erro) {
        console.error('Erro ao procurar cliente:', erro);
        return null;
    }
}

// Procurar pessoa pelo CPF
async function procurePorPessoa(cpf) {
    try {
        const resposta = await fetch(`${URL_API}/cliente/pessoa/${cpf}`);
        const data = await resposta.json();

        return data.sucesso ? data.pessoa : null;

    } catch (erro) {
        console.error('Erro ao procurar pessoa:', erro);
        return null;
    }
}

// Buscar cliente ou pessoa pelo CPF
async function buscar() {
    const cpf = document.getElementById('inputCpf').value.trim();

    if (cpf === '' || !/^\d{11}$/.test(cpf)) {
        mostrarAviso('Por favor, digite um CPF válido com 11 números.');
        return;
    }

    document.getElementById('inputCpf').value = cpf;

    cliente = await procurePorChavePrimaria(cpf);
    oQueEstaFazendo = '';
    pessoaExistente = false;

    // Verificar se já é cliente
    if (cliente) {
        mostrarDadosCliente(cliente);

        visibilidadeDosBotoes('inline', 'none', 'inline', 'inline', 'none');
        mostrarAviso('Cliente encontrado! Pode alterar ou excluir.');
        return;
    }

    // Verificar se já existe como pessoa
    const pessoa = await procurePorPessoa(cpf);

    if (pessoa) {
        pessoaExistente = true;

        mostrarDadosPessoa(pessoa);

        bloquearAtributos(true, true);
        document.getElementById('inputRenda').readOnly = false;

        visibilidadeDosBotoes('none', 'none', 'none', 'none', 'inline');
        oQueEstaFazendo = 'inserindo';

        mostrarAviso('Pessoa encontrada! Informe a renda mensal e clique em salvar.');
        return;
    }

    // CPF ainda não cadastrado
    limparAtributos();
    document.getElementById('inputCpf').value = cpf;

    visibilidadeDosBotoes('inline', 'inline', 'none', 'none', 'none');
    mostrarAviso('Pessoa não encontrada. Clique em incluir para cadastrar.');
}

// Preparar inclusão
function incluir() {
    const cpf = document.getElementById('inputCpf').value.trim();

    limparAtributos();
    document.getElementById('inputCpf').value = cpf;

    bloquearAtributos(false);
    document.getElementById('inputCpf').readOnly = true;

    visibilidadeDosBotoes('none', 'none', 'none', 'none', 'inline');
    oQueEstaFazendo = 'inserindo';

    mostrarAviso('INSERINDO - Preencha os dados pessoais e do cliente.');
}

// Preparar alteração
function alterar() {
    if (!cliente) {
        mostrarAviso('Busque um cliente antes de alterar.');
        return;
    }

    bloquearAtributos(true, true);
    document.getElementById('inputRenda').readOnly = false;

    visibilidadeDosBotoes('none', 'none', 'none', 'none', 'inline');
    oQueEstaFazendo = 'alterando';

    mostrarAviso('ALTERANDO - Modifique a renda mensal e clique em salvar.');
}

// Preparar exclusão
function excluir() {
    if (!cliente) {
        mostrarAviso('Busque um cliente antes de excluir.');
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
        const cpf_pessoa = document.getElementById('inputCpf').value.trim();
        const nome_pessoa = document.getElementById('inputNome').value.trim();
        const data_nascimento_pessoa = document.getElementById('inputDataNascimento').value;
        const endereco_pessoa = document.getElementById('inputEndereco').value.trim();
        const cidade_pessoa = document.getElementById('inputCidade').value.trim();
        const estado_pessoa = document.getElementById('inputEstado').value.trim();
        const usuario_pessoa = document.getElementById('inputUsuario').value.trim();
        const senha_pessoa = document.getElementById('inputSenha').value;
        const email_pessoa = document.getElementById('inputEmail').value.trim();
        const renda_cliente = document.getElementById('inputRenda').value;

        const dadosCliente = {
            cpf_pessoa,
            nome_pessoa,
            data_nascimento_pessoa,
            endereco_pessoa,
            cidade_pessoa,
            estado_pessoa,
            usuario_pessoa,
            senha_pessoa,
            email_pessoa,
            renda_cliente
        };

        let resposta;

        // Inclusão
        if (oQueEstaFazendo === 'inserindo') {

            if (
                !cpf_pessoa ||
                !/^\d{11}$/.test(cpf_pessoa) ||
                renda_cliente === '' ||
                !Number.isFinite(Number(renda_cliente)) ||
                Number(renda_cliente) < 0
            ) {
                mostrarAviso('Informe um CPF e uma renda mensal válidos.');
                return;
            }

            // Se a pessoa ainda não existe, exigir os dados pessoais
            if (
                !pessoaExistente &&
                (
                    !nome_pessoa ||
                    !data_nascimento_pessoa ||
                    !endereco_pessoa ||
                    !cidade_pessoa ||
                    !estado_pessoa ||
                    !usuario_pessoa ||
                    !senha_pessoa ||
                    !email_pessoa
                )
            ) {
                mostrarAviso('Preencha todos os dados pessoais obrigatórios.');
                return;
            }

            // Validar email de uma pessoa nova
            if (!pessoaExistente) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

                if (!emailRegex.test(email_pessoa)) {
                    mostrarAviso('Informe um email válido.');
                    return;
                }
            }

            resposta = await fetch(`${URL_API}/cliente`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dadosCliente)
            });
        }

        // Alteração
        else if (oQueEstaFazendo === 'alterando') {

            if (
                renda_cliente === '' ||
                !Number.isFinite(Number(renda_cliente)) ||
                Number(renda_cliente) < 0
            ) {
                mostrarAviso('Informe uma renda mensal válida.');
                return;
            }

            resposta = await fetch(`${URL_API}/cliente/${cpf_pessoa}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    renda_cliente
                })
            });
        }

        // Exclusão
        else if (oQueEstaFazendo === 'excluindo') {
            resposta = await fetch(`${URL_API}/cliente/${cpf_pessoa}`, {
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
            mostrarAviso('Cliente cadastrado com sucesso!');
        } else if (oQueEstaFazendo === 'alterando') {
            mostrarAviso('Cliente alterado com sucesso!');
        } else if (oQueEstaFazendo === 'excluindo') {
            mostrarAviso('Cliente excluído com sucesso!');
        }

        // Finalizar operação
        limparAtributos();
        document.getElementById('inputCpf').value = '';

        bloquearAtributos(true);
        visibilidadeDosBotoes('inline', 'none', 'none', 'none', 'none');

        oQueEstaFazendo = '';
        pessoaExistente = false;

        await listar();

    } catch (erro) {
        console.error('Erro ao salvar:', erro);
        mostrarAviso('Erro ao efetuar operação no servidor.');
    }
}

// Listar clientes
async function listar() {
    try {
        const resposta = await fetch(`${URL_API}/cliente`);
        const data = await resposta.json();

        if (data.sucesso) {
            let texto = `
                <table class="tabela-clientes">
                    <thead>
                        <tr>
                            <th>CPF</th>
                            <th>Nome</th>
                            <th>E-mail</th>
                            <th>Renda mensal</th>
                            <th>Data de cadastro</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            for (let linha of data.clientes) {
                const dataCadastro = linha.data_cadastro
                    ? new Date(linha.data_cadastro).toLocaleDateString('pt-BR', {
                        timeZone: 'UTC'
                    })
                    : '';

                texto += `
                    <tr>
                        <td>${linha.cpf_cliente}</td>
                        <td>${linha.nome_pessoa}</td>
                        <td>${linha.email_pessoa}</td>
                        <td>R$ ${Number(linha.renda_cliente || 0).toFixed(2)}</td>
                        <td>${dataCadastro}</td>
                    </tr>
                `;
            }

            texto += `
                    </tbody>
                </table>
            `;

            document.getElementById('outputSaida').innerHTML =
                data.clientes.length > 0
                    ? texto
                    : 'Nenhum cliente cadastrado.';

        } else {
            document.getElementById('outputSaida').innerHTML =
                `Erro no banco: ${data.mensagem}`;
        }

    } catch (erro) {
        console.error('Erro ao listar clientes:', erro);

        document.getElementById('outputSaida').innerHTML =
            'Servidor offline ou erro de conexão.';
    }
}

// Cancelar operação
function cancelar() {
    limparAtributos();
    document.getElementById('inputCpf').value = '';

    bloquearAtributos(true);
    visibilidadeDosBotoes('inline', 'none', 'none', 'none', 'none');

    oQueEstaFazendo = '';
    pessoaExistente = false;

    mostrarAviso('Operação cancelada.');
}

// Mostrar mensagem na barrinha
function mostrarAviso(mensagem) {
    document.getElementById('divAviso').innerHTML = mensagem;
}

// Mostrar dados do cliente
function mostrarDadosCliente(c) {
    document.getElementById('inputCpf').value = c.cpf_cliente;
    document.getElementById('inputNome').value = c.nome_pessoa;

    document.getElementById('inputDataNascimento').value =
        (c.data_nascimento_pessoa || '').substring(0, 10);

    document.getElementById('inputEndereco').value = c.endereco_pessoa;
    document.getElementById('inputCidade').value = c.cidade_pessoa;
    document.getElementById('inputEstado').value = c.estado_pessoa;
    document.getElementById('inputUsuario').value = c.usuario_pessoa;
    document.getElementById('inputSenha').value = '';
    document.getElementById('inputEmail').value = c.email_pessoa;

    document.getElementById('inputRenda').value = c.renda_cliente ?? '';

    bloquearAtributos(true, true);
}

// Mostrar dados de uma pessoa que ainda não é cliente
function mostrarDadosPessoa(p) {
    document.getElementById('inputCpf').value = p.cpf_pessoa;
    document.getElementById('inputNome').value = p.nome_pessoa;

    document.getElementById('inputDataNascimento').value =
        (p.data_nascimento_pessoa || '').substring(0, 10);

    document.getElementById('inputEndereco').value = p.endereco_pessoa;
    document.getElementById('inputCidade').value = p.cidade_pessoa;
    document.getElementById('inputEstado').value = p.estado_pessoa;
    document.getElementById('inputUsuario').value = p.usuario_pessoa;
    document.getElementById('inputSenha').value = '';
    document.getElementById('inputEmail').value = p.email_pessoa;

    document.getElementById('inputRenda').value = '';
}

// Limpar campos
function limparAtributos() {
    cliente = null;
    oQueEstaFazendo = '';
    pessoaExistente = false;

    document.getElementById('inputNome').value = '';
    document.getElementById('inputDataNascimento').value = '';
    document.getElementById('inputEndereco').value = '';
    document.getElementById('inputCidade').value = '';
    document.getElementById('inputEstado').value = '';
    document.getElementById('inputUsuario').value = '';
    document.getElementById('inputSenha').value = '';
    document.getElementById('inputEmail').value = '';
    document.getElementById('inputRenda').value = '';

    bloquearAtributos(true);
}

// Bloquear ou liberar campos
function bloquearAtributos(soLeitura, cpfSomenteLeitura = false) {
    document.getElementById('inputCpf').readOnly = cpfSomenteLeitura;

    document.getElementById('inputNome').readOnly = soLeitura;
    document.getElementById('inputDataNascimento').readOnly = soLeitura;
    document.getElementById('inputEndereco').readOnly = soLeitura;
    document.getElementById('inputCidade').readOnly = soLeitura;
    document.getElementById('inputEstado').readOnly = soLeitura;
    document.getElementById('inputUsuario').readOnly = soLeitura;
    document.getElementById('inputSenha').readOnly = soLeitura;
    document.getElementById('inputEmail').readOnly = soLeitura;

    document.getElementById('inputRenda').readOnly = soLeitura;
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