const URL_API = 'http://127.0.0.1:3001';

document.getElementById('formRecuperacao').onsubmit = async function (event) {

    event.preventDefault();

    const campoEmail = document.getElementById('email');
    const email = campoEmail.value.trim();
    const mensagem = document.getElementById('mensagem');
    const botao = document.getElementById('btEntrar');

    try {

        botao.disabled = true;

        mensagem.textContent = 'Enviando solicitação...';
        mensagem.style.color = '#80665e';

        const resposta = await fetch(`${URL_API}/login/recuperar-senha`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email_pessoa: email
            })
        });

        const dados = await resposta.json();

        if (resposta.ok && dados.sucesso) {
            mensagem.textContent = dados.mensagem;
            mensagem.style.color = '#39834b';

            campoEmail.value = '';

        } else {
            mensagem.textContent = dados.mensagem || 'Não foi possível solicitar a recuperação de senha.';
            mensagem.style.color = 'red';

        }

    } catch (error) {
        console.error('Erro ao solicitar recuperação:', error);

        mensagem.textContent = 'Não foi possível conectar ao servidor.';
        mensagem.style.color = 'red';

    } finally {
        botao.disabled = false;
    }

};