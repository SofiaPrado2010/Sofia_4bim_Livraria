const URL_API = 'http://127.0.0.1:3001';

let pessoaAtual = null;

// Buscar informações da pessoa conectada
async function carregarInformacoes() {
    try {
        const resposta = await fetch(`${URL_API}/pessoa/minhasInformacoes`, {
            method: 'GET',
            credentials: 'include'
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            alert(dados.mensagem);
            window.location.href = '../login/login.html';
            return;
        }

        pessoaAtual = dados.pessoa;

        document.getElementById('nome').textContent = pessoaAtual.nome_pessoa;
        document.getElementById('cpf').textContent = pessoaAtual.cpf_pessoa;

        document.getElementById('dataNascimento').textContent =
            new Date(pessoaAtual.data_nascimento_pessoa).toLocaleDateString('pt-BR');

        document.getElementById('endereco').textContent = pessoaAtual.endereco_pessoa;
        document.getElementById('cidade').textContent = pessoaAtual.cidade_pessoa || 'Não informado';
        document.getElementById('estado').textContent = pessoaAtual.estado_pessoa || 'Não informado';
        document.getElementById('usuario').textContent = pessoaAtual.usuario_pessoa;
        document.getElementById('email').textContent = pessoaAtual.email_pessoa;

    } catch (error) {
        console.error('Erro ao carregar informações:', error);
        alert('Não foi possível carregar suas informações.');
    }
}

// Mostrar os campos de edição
document.getElementById('btAlterar').onclick = function () {

    document.getElementById('nome').hidden = true;
    document.getElementById('dataNascimento').hidden = true;
    document.getElementById('endereco').hidden = true;
    document.getElementById('cidade').hidden = true;
    document.getElementById('estado').hidden = true;
    document.getElementById('email').hidden = true;

    document.getElementById('btAlterar').hidden = true;

    document.getElementById('btSalvar').hidden = false;
    document.getElementById('btCancelar').hidden = false;

    document.getElementById('inputNome').value = pessoaAtual.nome_pessoa;

    document.getElementById('inputDataNascimento').value =
        pessoaAtual.data_nascimento_pessoa.substring(0, 10);

    document.getElementById('inputEndereco').value = pessoaAtual.endereco_pessoa;
    document.getElementById('inputCidade').value = pessoaAtual.cidade_pessoa || '';
    document.getElementById('inputEstado').value = pessoaAtual.estado_pessoa || '';
    document.getElementById('inputEmail').value = pessoaAtual.email_pessoa;

    document.querySelectorAll('.dados input').forEach(function (campo) {
        campo.hidden = false;
    });
};

// Salvar as informações alteradas
document.getElementById('btSalvar').onclick = async function () {

    const nome = document.getElementById('inputNome').value;
    const dataNascimento = document.getElementById('inputDataNascimento').value;
    const endereco = document.getElementById('inputEndereco').value;
    const cidade = document.getElementById('inputCidade').value;
    const estado = document.getElementById('inputEstado').value.toUpperCase();
    const email = document.getElementById('inputEmail').value;

    if (!nome || !dataNascimento || !endereco || !cidade || !estado || !email) {
        alert('Preencha todos os campos!');
        return;
    }

    try {
        const resposta = await fetch(`${URL_API}/pessoa/minhasInformacoes`, {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nome_pessoa: nome,
                data_nascimento_pessoa: dataNascimento,
                endereco_pessoa: endereco,
                cidade_pessoa: cidade,
                estado_pessoa: estado,
                email_pessoa: email
            })
        });

        const dados = await resposta.json();

        if (resposta.ok) {
            alert(dados.mensagem);

            // Atualizar as informações na tela
            await carregarInformacoes();

            // Sair do modo de edição
            sairModoEdicao();

        } else {
            alert(dados.mensagem);
        }

    } catch (error) {
        console.error('Erro ao salvar informações:', error);
        alert('Não foi possível salvar as alterações.');
    }
};

document.getElementById('btCancelar').onclick = function () {
    carregarInformacoes();
    sairModoEdicao();
};

// Sair do modo de edição
function sairModoEdicao() {

    document.querySelectorAll('.dados input').forEach(function (campo) {
        campo.hidden = true;
    });

    document.querySelectorAll('.dados span').forEach(function (campo) {
        campo.hidden = false;
    });

    document.getElementById('btAlterar').hidden = false;
    document.getElementById('btSalvar').hidden = true;
    document.getElementById('btCancelar').hidden = true;
}

// Voltar para a loja
document.getElementById('btVoltar').onclick = function () {
    window.location.href = '../index.html';
};

// Carregar informações ao abrir a página
carregarInformacoes();