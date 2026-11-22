const URL_API = 'http://127.0.0.1:3001';

const nomeFuncionario = document.getElementById('nomeFuncionario');
const btSair = document.getElementById('btSair');
const menuGrid = document.getElementById('menuGrid');

// Verificar sessão e permissões
async function carregarMenu() {

    try {

        const resposta = await fetch(`${URL_API}/login/sessao`, {
            credentials: 'include'
        });

        const dados = await resposta.json();

        // Verificar se existe alguém conectado
        if (!resposta.ok) {

            window.location.href = '../../visaoCliente/login/login.html';

            return;
        }

        const usuario = dados.usuario;

        // Verificar se o usuário é funcionário
        if (!usuario.perfis.includes('FUNCIONARIO')) {

            alert('Acesso permitido somente para funcionários.');

            window.location.href = '../../visaoCliente/login/login.html';

            return;
        }

        // Exibir nome e cargo do funcionário
        nomeFuncionario.textContent =
            `${usuario.nome} - ${usuario.cargo}`;

        // Obter permissões do funcionário
        const permissoes = usuario.permissoes;

        // Percorrer os cartões do menu
        const cartoes = menuGrid.querySelectorAll(
            '[data-permissao], [data-permissoes]'
        );

        cartoes.forEach(cartao => {

            let permissoesNecessarias = [];

            // Verificar se o cartão possui uma ou várias permissões
            if (cartao.dataset.permissoes) {

                permissoesNecessarias =
                    cartao.dataset.permissoes.split(',');

            } else {

                permissoesNecessarias.push(
                    cartao.dataset.permissao
                );

            }

            // Verificar se o funcionário possui pelo menos uma permissão
            const possuiPermissao = permissoesNecessarias.some(
                permissao => permissoes.includes(permissao)
            );

            if (!possuiPermissao) {

                cartao.style.display = 'none';

            }

        });

    } catch (erro) {

        console.error('Erro ao carregar menu:', erro);

        alert('Não foi possível conectar ao servidor.');

        window.location.href = '../../visaoCliente/login/login.html';

    }

}

// Sair da conta
btSair.onclick = async function () {

    try {

        const resposta = await fetch(`${URL_API}/login/sair`, {

            method: 'POST',

            credentials: 'include'

        });

        const dados = await resposta.json();

        if (resposta.ok) {

            window.location.href = '../../visaoCliente/login/login.html';

        } else {

            alert(dados.mensagem || 'Não foi possível sair da conta.');

        }

    } catch (erro) {

        console.error('Erro ao sair da conta:', erro);

        alert('Não foi possível conectar ao servidor.');

    }

};

// Iniciar o menu
carregarMenu();