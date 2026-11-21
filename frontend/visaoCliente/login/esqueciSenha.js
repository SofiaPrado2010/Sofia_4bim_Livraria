const URL_API = 'http://127.0.0.1:3001';

document.getElementById('formRecuperacao').onsubmit = async function (event) {

    event.preventDefault();

    const email = document.getElementById('email').value;
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

        if (resposta.ok) {

            mensagem.textContent = dados.mensagem;
            mensagem.style.color = '#39834b';

            document.getElementById('email').value = '';

        } else {

            mensagem.textContent = dados.mensagem;
            mensagem.style.color = 'red';

        }

    } catch (error) {

        console.error('Erro ao solicitar recuperação:', error);

        mensagem.textContent = 'Não foi possível enviar a solicitação.';
        mensagem.style.color = 'red';

    } finally {

        botao.disabled = false;

    }

};