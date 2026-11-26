const URL_API = 'http://127.0.0.1:3001';

const formEmail = document.getElementById('formEmail');
const formCodigo = document.getElementById('formCodigo');
const formSenha = document.getElementById('formSenha');
const campoEmail = document.getElementById('email');
const campoCodigo = document.getElementById('codigo');
const campoNovaSenha = document.getElementById('novaSenha');
const campoConfirmarSenha = document.getElementById('confirmarSenha');
const mensagem = document.getElementById('mensagem');
const btEnviarCodigo = document.getElementById('btEnviarCodigo');
const btVerificarCodigo = document.getElementById('btVerificarCodigo');
const btRedefinirSenha = document.getElementById('btRedefinirSenha');
const btVoltarEmail = document.getElementById('btVoltarEmail');

let tokenRecuperacao = null;

// ========================================
// EXIBIR MENSAGENS
// ========================================

function exibirMensagem(texto, cor = '#80665e') {
    mensagem.textContent = texto;
    mensagem.style.color = cor;
}

// ========================================
// ALTERAR ETAPA
// ========================================

function mostrarEtapa(etapa) {
    formEmail.hidden = etapa !== 'email';
    formCodigo.hidden = etapa !== 'codigo';
    formSenha.hidden = etapa !== 'senha';

    mensagem.textContent = '';
}

// ========================================
// ETAPA 1: SOLICITAR CÓDIGO
// ========================================

formEmail.onsubmit = async function (event) {

    event.preventDefault();

    const email = campoEmail.value.trim();

    try {

        btEnviarCodigo.disabled = true;

        exibirMensagem('Enviando código de recuperação...');

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

        if (!resposta.ok || !dados.sucesso) {
            exibirMensagem(
                dados.mensagem || 'Não foi possível solicitar o código.',
                '#c0392b'
            );
            return;
        }

        exibirMensagem(dados.mensagem, '#39834b');

        mostrarEtapa('codigo');

        campoCodigo.focus();

    } catch (error) {

        console.error('Erro ao solicitar código:', error);

        exibirMensagem(
            'Não foi possível conectar ao servidor.',
            '#c0392b'
        );

    } finally {
        btEnviarCodigo.disabled = false;
    }

};

// ========================================
// ETAPA 2: VERIFICAR CÓDIGO
// ========================================

campoCodigo.addEventListener('input', function () {
    this.value = this.value.replace(/\D/g, '').slice(0, 6);
});

formCodigo.onsubmit = async function (event) {

    event.preventDefault();

    const email = campoEmail.value.trim();
    const codigo = campoCodigo.value.trim();

    if (!/^\d{6}$/.test(codigo)) {
        exibirMensagem(
            'Informe um código com exatamente seis números.',
            '#c0392b'
        );
        return;
    }

    try {

        btVerificarCodigo.disabled = true;

        exibirMensagem('Verificando código...');

        const resposta = await fetch(`${URL_API}/login/verificar-codigo`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email_pessoa: email,
                codigo: codigo
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            exibirMensagem(
                dados.mensagem || 'Não foi possível verificar o código.',
                '#c0392b'
            );
            return;
        }

        tokenRecuperacao = dados.tokenRecuperacao;

        mostrarEtapa('senha');

        campoNovaSenha.focus();

    } catch (error) {

        console.error('Erro ao verificar código:', error);

        exibirMensagem(
            'Não foi possível conectar ao servidor.',
            '#c0392b'
        );

    } finally {
        btVerificarCodigo.disabled = false;
    }

};

// ========================================
// VOLTAR PARA O E-MAIL
// ========================================

btVoltarEmail.onclick = function () {

    tokenRecuperacao = null;
    campoCodigo.value = '';

    mostrarEtapa('email');

};

// ========================================
// ETAPA 3: REDEFINIR SENHA
// ========================================

formSenha.onsubmit = async function (event) {

    event.preventDefault();

    const novaSenha = campoNovaSenha.value;
    const confirmarSenha = campoConfirmarSenha.value;

    if (novaSenha.length < 8 || novaSenha.length > 72) {
        exibirMensagem(
            'A senha deve possuir entre 8 e 72 caracteres.',
            '#c0392b'
        );
        return;
    }

    if (novaSenha !== confirmarSenha) {
        exibirMensagem(
            'As senhas informadas não são iguais.',
            '#c0392b'
        );
        campoConfirmarSenha.focus();
        return;
    }

    if (!tokenRecuperacao) {
        exibirMensagem(
            'Sua autorização expirou. Solicite um novo código.',
            '#c0392b'
        );
        return;
    }

    try {

        btRedefinirSenha.disabled = true;

        exibirMensagem('Salvando sua nova senha...');

        const resposta = await fetch(`${URL_API}/login/redefinir-senha`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: tokenRecuperacao,
                novaSenha: novaSenha
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            exibirMensagem(
                dados.mensagem || 'Não foi possível redefinir sua senha.',
                '#c0392b'
            );
            return;
        }

        tokenRecuperacao = null;

        formSenha.reset();

        exibirMensagem(
            'Senha redefinida com sucesso! Redirecionando para o login...',
            '#39834b'
        );

        setTimeout(() => {
            window.location.href = '../login.html';
        }, 2000);

    } catch (error) {

        console.error('Erro ao redefinir senha:', error);

        exibirMensagem(
            'Não foi possível conectar ao servidor.',
            '#c0392b'
        );

    } finally {
        btRedefinirSenha.disabled = false;
    }

};