import { iniciarLivros } from './livro/livro.js';
import { iniciarCarrinho } from './carrinho/carrinho.js';

const URL_API = 'http://127.0.0.1:3001';

// Inicializar a página
window.addEventListener('DOMContentLoaded', function () {
    iniciarLivros();
    iniciarCarrinho();

    const telaInicial = document.getElementById('telaInicial');
    const telaCatalogo = document.getElementById('telaCatalogo');
    const btExplorar = document.getElementById('btExplorar');
    const apresentacao = document.querySelector('.apresentacao');

    apresentacao.style.backgroundImage = "url('/fundos/fundo1.png')";

    const imagens = document.querySelectorAll('.imagem');

    let imagemAtual = 0;

    function trocarImagem() {

        let proximaImagem = imagemAtual + 1;

        if (proximaImagem >= imagens.length) {
            proximaImagem = 0;
        }

        imagens[imagemAtual].style.transition = 'left 1s ease';
        imagens[proximaImagem].style.transition = 'left 1s ease';

        imagens[proximaImagem].style.left = '0';
        imagens[imagemAtual].style.left = '-100%';

        imagens[imagemAtual].classList.remove('ativa');
        imagens[proximaImagem].classList.add('ativa');

        imagemAtual = proximaImagem;

        setTimeout(function () {
            imagens.forEach(function (imagem, i) {
                if (i !== imagemAtual) {
                    imagem.style.transition = 'none';
                    imagem.style.left = '100%';
                }
            });
        }, 1000);
    }

    setInterval(trocarImagem, 5000);

    // Abrir o catálogo
    btExplorar.onclick = function () {
        telaInicial.style.display = 'none';
        telaCatalogo.style.display = 'block';

        document.querySelector('.barra-lateral').style.display = 'block';
    };
});

const avisoCookies = document.getElementById('avisoCookies');
const btAceitarCookies = document.getElementById('btAceitarCookies');

// Verificar se a pessoa já aceitou o aviso
if (localStorage.getItem('cookiesAceitos') === 'sim') {
    avisoCookies.style.display = 'none';
}

// Aceitar o aviso
btAceitarCookies.onclick = function () {
    localStorage.setItem('cookiesAceitos', 'sim');
    avisoCookies.style.display = 'none';
};

async function verificarLogin() {

    try {
        const resposta = await fetch(`${URL_API}/login/sessao`, {
            method: 'GET',
            credentials: 'include'
        });

        if (resposta.ok) {
            const dados = await resposta.json();

            console.log('Usuário conectado:', dados.usuario);

            const areaUsuario = document.getElementById('areaUsuario');

            areaUsuario.innerHTML = `
            <div class="menu-usuario">
                <button id="btUsuario" title="Minha conta">
                    <i class="fa-regular fa-circle-user"></i>
                </button>
                
                <div id="opcoesUsuario" class="opcoes-usuario">
                    <button id="btInformacoes"> Ver informações </button>
                    <button id="btPedidos"> Meus pedidos </button>
                    <button id="btSair"> Sair </button>
                </div>
             </div>`;

            const saudacao = document.createElement('span');
            saudacao.className = 'saudacao-usuario';
            saudacao.textContent = `Bem-vindo, ${dados.usuario.nome}!`;

            areaUsuario.prepend(saudacao);

            const btUsuario = document.getElementById('btUsuario');
            const opcoesUsuario = document.getElementById('opcoesUsuario');

            btUsuario.onclick = function () {
                opcoesUsuario.classList.toggle('mostrar');
            };

            const btInformacoes = document.getElementById('btInformacoes');

            btInformacoes.onclick = function () {
                window.location.href = './informacoes/informacoes.html';
            };

            const btPedidos = document.getElementById('btPedidos');

            btPedidos.onclick = function () {
                window.location.href = './pedidos/pedidos.html';
            };

            const btSair = document.getElementById('btSair');

            btSair.onclick = async function () {

                try {
                    const resposta = await fetch(`${URL_API}/login/sair`, {
                        method: 'POST',
                        credentials: 'include'
                    });

                    const dados = await resposta.json();

                    if (resposta.ok) {
                        alert(dados.mensagem);

                        window.location.reload();
                    } else {
                        alert(dados.mensagem);
                    }

                } catch (error) {
                    console.error('Erro ao sair:', error);
                    alert('Não foi possível sair da conta.');
                }

            };

        } else {
            console.log('Nenhum usuário conectado.');
        }

    } catch (error) {
        console.error('Erro ao verificar login:', error);
    }

}
verificarLogin();

const btLogin = document.getElementById('btLogin');

btLogin.onclick = function () {
    window.location.href = './login/login.html';
};