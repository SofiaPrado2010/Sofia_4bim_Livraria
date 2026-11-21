const URL_API = 'http://127.0.0.1:3001';

// Quando o formulário for enviado
document.getElementById('formCadastro').onsubmit = async function (event) {

    // Impede a página de recarregar
    event.preventDefault();

    // Recupera os valores dos campos
    const nome = document.getElementById('nome').value;
    const cpf = document.getElementById('cpf').value;
    const dataNascimento = document.getElementById('dataNascimento').value;
    const cidade = document.getElementById('cidade').value;
    const estado = document.getElementById('estado').value.toUpperCase();
    const endereco = document.getElementById('endereco').value;
    const usuario = document.getElementById('usuario').value;
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;
    const confirmarSenha = document.getElementById('confirmarSenha').value;

    const mensagem = document.getElementById('mensagem');
    const botao = document.getElementById('btCadastrar');

    // Verifica se as senhas são iguais
    if (senha !== confirmarSenha) {
        mensagem.textContent = 'As senhas não coincidem!';
        mensagem.style.color = 'red';
        return;
    }

    // Organiza os dados para enviar ao backend
    const pessoa = {
        cpf_pessoa: cpf,
        nome_pessoa: nome,
        data_nascimento_pessoa: dataNascimento,
        cidade_pessoa: cidade,
        estado_pessoa: estado,
        endereco_pessoa: endereco,
        usuario_pessoa: usuario,
        senha_pessoa: senha,
        email_pessoa: email
    };

    try {
        botao.disabled = true;
        mensagem.textContent = 'Realizando cadastro...';
        mensagem.style.color = '#80665e';

        // Envia os dados para o backend
        const resposta = await fetch(`${URL_API}/pessoa/cadastroCliente`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(pessoa)
        });

        const dados = await resposta.json();

        if (resposta.ok) {

            mensagem.textContent = 'Cadastro realizado com sucesso! Redirecionando para o login...';
            mensagem.style.color = 'green';

            document.getElementById('formCadastro').reset();

            // Redireciona para o login após 2 segundos
            setTimeout(function () {
                window.location.href = '../login/login.html';
            }, 2000);

            return;

        } else {

            mensagem.textContent = dados.mensagem;
            mensagem.style.color = 'red';

        }

    } catch (error) {

        console.error('Erro ao realizar cadastro:', error);

        mensagem.textContent = 'Não foi possível realizar o cadastro.';
        mensagem.style.color = 'red';

    } finally {

        botao.disabled = false;

    }

};