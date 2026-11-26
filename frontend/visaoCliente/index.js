import { iniciarLivros } from './livro/livro.js';
import { iniciarCarrinho } from './carrinho/carrinho.js';

const URL_API = 'http://127.0.0.1:3001';

// INICIALIZAR A PÁGINA
window.addEventListener('DOMContentLoaded', function () {
    iniciarLivros();
    iniciarCarrinho();

    // ÁREA DO CATÁLOGO
    const telaCatalogo = document.getElementById('telaCatalogo');

    // CARROSSEL DO BANNER
    const slides = document.querySelectorAll('.banner-slide');
    const indicadores = document.querySelectorAll('.banner-indicador');
    const btAnterior = document.querySelector('.banner-anterior');
    const btProximo = document.querySelector('.banner-proximo');
    const botoesExplorar = document.querySelectorAll('.botao-banner');

    let slideAtual = 0;
    let intervaloCarrossel;

    // MOSTRAR SLIDE
    function mostrarSlide(indice) {

        if (slides.length === 0) {
            return;
        }

        slideAtual = (indice + slides.length) % slides.length;

        slides.forEach(function (slide, i) {

            const ativo = i === slideAtual;

            slide.classList.toggle('ativo', ativo);
            slide.setAttribute('aria-hidden', String(!ativo));

        });


        // ATUALIZAR INDICADORES
        indicadores.forEach(function (indicador, i) {

            const ativo = i === slideAtual;

            indicador.classList.toggle('ativo', ativo);
            indicador.setAttribute('aria-current', String(ativo));

        });

    }

    // PRÓXIMO SLIDE
    function proximoSlide() {
        mostrarSlide(slideAtual + 1);
    }

    // SLIDE ANTERIOR
    function slideAnterior() {
        mostrarSlide(slideAtual - 1);
    }

    // REINICIAR TEMPO DO CARROSSEL
    function reiniciarIntervalo() {
        clearInterval(intervaloCarrossel);

        if (slides.length > 1) {
            intervaloCarrossel = setInterval(proximoSlide, 5000);
        }
    }

    // INICIAR CARROSSEL
    if (slides.length > 0) {
        mostrarSlide(0);
        reiniciarIntervalo();
    }

    // BOTÃO ANTERIOR
    if (btAnterior) {
        btAnterior.addEventListener('click', function () {
            slideAnterior();
            reiniciarIntervalo();
        });
    }

    // BOTÃO PRÓXIMO
    if (btProximo) {
        btProximo.addEventListener('click', function () {
            proximoSlide();
            reiniciarIntervalo();
        });
    }

    // INDICADORES
    indicadores.forEach(function (indicador, indice) {
        indicador.addEventListener('click', function () {
            mostrarSlide(indice);
            reiniciarIntervalo();
        });
    });

    // TODOS OS BOTÕES DO BANNER LEVAM AO CATÁLOGO
    botoesExplorar.forEach(function (botao) {
        botao.addEventListener('click', function () {
            telaCatalogo.scrollIntoView({
                behavior: 'smooth'
            });
        });
    });
});

// AVISO DE COOKIES
const avisoCookies = document.getElementById('avisoCookies');
const btAceitarCookies = document.getElementById('btAceitarCookies');

if (localStorage.getItem('cookiesAceitos') === 'sim') {
    avisoCookies.style.display = 'none';
}

btAceitarCookies.onclick = function () {
    localStorage.setItem('cookiesAceitos', 'sim');
    avisoCookies.style.display = 'none';
};

// VERIFICAR LOGIN
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

                        <button id="btInformacoes">
                            Ver informações
                        </button>

                        <button id="btPedidos">
                            Meus pedidos
                        </button>

                        <button id="btSair">
                            Sair
                        </button>

                    </div>

                </div>
            `;

            // SAUDAÇÃO
            const saudacao = document.createElement('span');
            saudacao.className = 'saudacao-usuario';
            saudacao.textContent = `Bem-vindo(a), ${dados.usuario.nome}!`;
            areaUsuario.prepend(saudacao);


            // ABRIR MENU DO USUÁRIO
            const btUsuario = document.getElementById('btUsuario');
            const opcoesUsuario = document.getElementById('opcoesUsuario');

            btUsuario.onclick = function () {
                opcoesUsuario.classList.toggle('mostrar');
            };

            // INFORMAÇÕES
            const btInformacoes = document.getElementById('btInformacoes');
            btInformacoes.onclick = function () {
                window.location.href = './informacoes/informacoes.html';
            };

            // PEDIDOS
            const btPedidos = document.getElementById('btPedidos');
            btPedidos.onclick = function () {
                window.location.href = './pedidos/pedidos.html';
            };


            // SAIR
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

// BOTÃO LOGIN
const btLogin = document.getElementById('btLogin');
btLogin.onclick = function () {
    window.location.href = './login/login.html';
};