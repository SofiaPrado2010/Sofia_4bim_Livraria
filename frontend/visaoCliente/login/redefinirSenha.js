const URL_API = 'http://127.0.0.1:3001';

// Obtém o token que veio no link do e-mail
const parametros = new URLSearchParams(window.location.search);
const token = parametros.get('token');

const form = document.getElementById('formRedefinirSenha');
const mensagem = document.getElementById('mensagem');
const botao = document.getElementById('btEntrar');

// Verifica se existe um token no link
if (!token) {

    form.style.display = 'none';

    mensagem.textContent = 'Link de recuperação inválido ou incompleto.';
    mensagem.style.color = 'red';

}

form.onsubmit = async function (event) {

    event.preventDefault();

    const novaSenha = document.getElementById('novaSenha').value;
    const confirmarSenha = document.getElementById('confirmarSenha').value;

    // Verifica se as senhas são iguais
    if (novaSenha !== confirmarSenha) {

        mensagem.textContent = 'As senhas não são iguais.';
        mensagem.style.color = 'red';

        return;
    }

    if (novaSenha.length < 8) {

        mensagem.textContent = 'A senha deve possuir pelo menos 8 caracteres.';
        mensagem.style.color = 'red';

        return;
    }

    try {

        botao.disabled = true;

        mensagem.textContent = 'Atualizando sua senha...';
        mensagem.style.color = '#80665e';

        const resposta = await fetch(`${URL_API}/login/redefinir-senha`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: token,
                novaSenha: novaSenha
            })
        });

        const dados = await resposta.json();

        if (resposta.ok) {

            mensagem.textContent = dados.mensagem;
            mensagem.style.color = '#39834b';

            form.style.display = 'none';

        } else {

            mensagem.textContent = dados.mensagem;
            mensagem.style.color = 'red';

        }

    } catch (error) {

        console.error('Erro ao redefinir senha:', error);

        mensagem.textContent = 'Não foi possível atualizar sua senha.';
        mensagem.style.color = 'red';

    } finally {

        botao.disabled = false;

    }

};