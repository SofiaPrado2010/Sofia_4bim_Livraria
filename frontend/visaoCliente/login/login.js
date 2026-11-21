const URL_API = 'http://127.0.0.1:3001';

// Redirecionar cliente
function redirecionarCliente() {

    const compraPendente = sessionStorage.getItem('compraPendente');

    if (compraPendente === 'true') {

        sessionStorage.removeItem('compraPendente');

        window.location.href = '../pagamento/pagamento.html';

    } else {

        window.location.href = '../index.html';

    }
}

document.getElementById('formLogin').onsubmit = async function (event) {
    event.preventDefault();

    const usuario = document.getElementById('usuario').value;
    const senha = document.getElementById('senha').value;

    const mensagem = document.getElementById('mensagem');
    const botao = document.getElementById('btEntrar');

    const escolhaArea = document.getElementById('escolhaArea');
    const formLogin = document.getElementById('formLogin');

    try {
        botao.disabled = true;
        mensagem.textContent = 'Verificando seus dados...';
        mensagem.style.color = '#80665e';

        const resposta = await fetch(`${URL_API}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                usuario_pessoa: usuario,
                senha_pessoa: senha
            })
        });

        const dados = await resposta.json();

        if (resposta.ok) {

            sessionStorage.setItem(
                'usuario',
                JSON.stringify(dados.usuario)
            );

            const perfis = dados.usuario.perfis;

            // Pessoa com os dois perfis
            if (perfis.includes('CLIENTE') &&
                perfis.includes('FUNCIONARIO')) {

                mensagem.textContent = '';
                formLogin.style.display = 'none';
                escolhaArea.hidden = false;

                return;
            }

            // Pessoa somente cliente
            if (perfis.includes('CLIENTE')) {

                redirecionarCliente();
                return;
            }

            // Pessoa somente funcionário
            if (perfis.includes('FUNCIONARIO')) {

                sessionStorage.removeItem('compraPendente');

                window.location.href = '../../visaoGerente/menu/menu.html';
                return;
            }

            mensagem.textContent = 'Nenhum perfil de acesso foi encontrado.';
            mensagem.style.color = 'red';

        } else {
            mensagem.textContent = dados.mensagem;
            mensagem.style.color = 'red';
        }

    } catch (error) {
        console.error('Erro ao realizar login:', error);
        mensagem.textContent = 'Não foi possível realizar o login.';
        mensagem.style.color = 'red';

    } finally {
        botao.disabled = false;
    }
};


// Escolha da área
document.getElementById('btFuncionario').onclick = function () {

    sessionStorage.removeItem('compraPendente');

    window.location.href = '../../visaoGerente/menu/menu.html';
};

document.getElementById('btCliente').onclick = function () {

    redirecionarCliente();

};