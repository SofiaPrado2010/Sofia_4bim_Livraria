const URL_API = 'http://127.0.0.1:3001';

// Obtém o token enviado no link do e-mail
const parametros = new URLSearchParams(window.location.search);
const token = parametros.get('token');
const form = document.getElementById('formRedefinirSenha');
const mensagem = document.getElementById('mensagem');
const botao = document.getElementById('btEntrar');

// Verifica se existe um token no link
if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    form.style.display = 'none';
    mensagem.textContent = 'Link de recuperação inválido ou incompleto.';
    mensagem.style.color = 'red';

}

form.onsubmit = async function (event) {
    event.preventDefault();
    if (!token || !/^[a-f0-9]{64}$/.test(token)) {
        return;
    }

    const novaSenha = document.getElementById('novaSenha').value;
    const confirmarSenha = document.getElementById('confirmarSenha').value;

    // Verifica se as senhas são iguais
    if (novaSenha !== confirmarSenha) {
        mensagem.textContent = 'As senhas não são iguais.';
        mensagem.style.color = 'red';
        return;
    }

    // Verifica o tamanho da senha
    if (novaSenha.length < 8 || novaSenha.length > 72) {
        mensagem.textContent = 'A senha deve possuir entre 8 e 72 caracteres.';
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

        if (resposta.ok && dados.sucesso) {
            mensagem.textContent = dados.mensagem;
            mensagem.style.color = '#39834b';
            form.style.display = 'none';

        } else {
            mensagem.textContent = dados.mensagem || 'Não foi possível atualizar sua senha.';
            mensagem.style.color = 'red';
            botao.disabled = false;
        }

    } catch (error) {
        console.error('Erro ao redefinir senha:', error);
        mensagem.textContent = 'Não foi possível conectar ao servidor.';
        mensagem.style.color = 'red';
        botao.disabled = false;

    }

};