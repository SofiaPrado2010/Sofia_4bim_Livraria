const URL_API = 'http://127.0.0.1:3001';

let oQueEstaFazendo = '';
let cargo = null;
let permissoesDisponiveis = [];
let permissoesCarregadas = false;

// Organização das permissões e seus nomes na tela
const gruposPermissoes = {
    'Livros': {
        'livro:visualizar': 'Visualizar livros',
        'livro:gerenciar': 'Gerenciar livros'
    },
    'Estoque': {
        'estoque:alterar': 'Alterar estoque'
    },
    'Pedidos': {
        'pedido:visualizar': 'Visualizar pedidos',
        'pedido:alterar': 'Gerenciar pedidos'
    },
    'Pagamentos': {
        'pagamento:registrar': 'Registrar pagamentos'
    },
    'Devoluções': {
        'devolucao:visualizar': 'Visualizar devoluções',
        'devolucao:gerenciar': 'Gerenciar devoluções'
    },
    'Clientes': {
        'cliente:gerenciar': 'Gerenciar clientes'
    },
    'Funcionários': {
        'funcionario:gerenciar': 'Gerenciar funcionários'
    },
    'Cargos': {
        'cargo:gerenciar': 'Gerenciar cargos'
    },
    'Gêneros': {
        'genero:gerenciar': 'Gerenciar gêneros'
    },
    'Formas de pagamento': {
        'forma_pagamento:gerenciar': 'Gerenciar formas de pagamento'
    }
};

bloquearAtributos(true);

// Escapar textos antes de colocá-los na tabela
function escaparHTML(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, caractere => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    })[caractere]);
}

// Buscar permissões disponíveis no banco
async function carregarPermissoes() {
    if (permissoesCarregadas) return true;

    try {
        const resposta = await fetch(`${URL_API}/cargo/permissoes`, {
            credentials: 'include'
        });

        const data = await resposta.json();

        if (!resposta.ok || !data.sucesso) {
            throw new Error(data.mensagem || 'Não foi possível carregar as permissões.');
        }

        permissoesDisponiveis = data.permissoes;
        permissoesCarregadas = true;

        renderizarPermissoes();

        return true;

    } catch (erro) {
        console.error('Erro ao carregar permissões:', erro);

        document.getElementById('listaPermissoes').innerHTML =
            '<p class="sem-permissoes">Não foi possível carregar as permissões. Verifique sua sessão e tente novamente.</p>';

        return false;
    }
}

// Montar os cartões de permissões na tela
function renderizarPermissoes() {
    const lista = document.getElementById('listaPermissoes');
    lista.innerHTML = '';

    for (const [nomeGrupo, permissoesGrupo] of Object.entries(gruposPermissoes)) {
        const permissoesDoGrupo = permissoesDisponiveis.filter(
            permissao => Object.hasOwn(permissoesGrupo, permissao.codigo_permissao)
        );

        if (permissoesDoGrupo.length === 0) continue;

        const cartao = document.createElement('div');
        cartao.className = 'grupo-permissoes';

        const titulo = document.createElement('h4');
        titulo.textContent = nomeGrupo;
        cartao.appendChild(titulo);

        permissoesDoGrupo.forEach(permissao => {
            const codigo = permissao.codigo_permissao;

            const label = document.createElement('label');
            label.className = 'opcao-permissao';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.dataset.permissao = codigo;
            checkbox.disabled = true;

            const texto = document.createElement('span');
            texto.textContent = permissoesGrupo[codigo];

            label.appendChild(checkbox);
            label.appendChild(texto);

            cartao.appendChild(label);
        });

        lista.appendChild(cartao);
    }

    // Mostrar permissões que eventualmente sejam adicionadas ao banco
    const permissoesConhecidas = Object.values(gruposPermissoes)
        .flatMap(grupo => Object.keys(grupo));

    const outrasPermissoes = permissoesDisponiveis.filter(
        permissao => !permissoesConhecidas.includes(permissao.codigo_permissao)
    );

    if (outrasPermissoes.length > 0) {
        const cartao = document.createElement('div');
        cartao.className = 'grupo-permissoes';

        const titulo = document.createElement('h4');
        titulo.textContent = 'Outras permissões';
        cartao.appendChild(titulo);

        outrasPermissoes.forEach(permissao => {
            const label = document.createElement('label');
            label.className = 'opcao-permissao';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.dataset.permissao = permissao.codigo_permissao;
            checkbox.disabled = true;

            const texto = document.createElement('span');
            texto.textContent = permissao.codigo_permissao;

            label.appendChild(checkbox);
            label.appendChild(texto);

            cartao.appendChild(label);
        });

        lista.appendChild(cartao);
    }

    if (lista.children.length === 0) {
        lista.innerHTML = '<p class="sem-permissoes">Nenhuma permissão cadastrada.</p>';
    }
}

// Marcar as permissões de um cargo consultado
function selecionarPermissoes(permissoes = []) {
    const selecionadas = new Set(permissoes);

    document.querySelectorAll('#listaPermissoes input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = selecionadas.has(checkbox.dataset.permissao);
    });
}

// Obter os códigos das permissões selecionadas
function obterPermissoesSelecionadas() {
    return Array.from(
        document.querySelectorAll('#listaPermissoes input[type="checkbox"]:checked')
    ).map(checkbox => checkbox.dataset.permissao);
}

// Consultar cargo pelo ID
async function procurePorChavePrimaria(chave) {
    try {
        const resposta = await fetch(`${URL_API}/cargo/${chave}`, {
            credentials: 'include'
        });

        const data = await resposta.json();

        return data.sucesso ? data.cargo : null;

    } catch (erro) {
        console.error('Erro ao consultar cargo:', erro);
        return null;
    }
}

async function procure() {
    const id_cargo = document.getElementById('inputId_cargo').value.trim();

    if (id_cargo === '' || !Number.isInteger(Number(id_cargo)) || Number(id_cargo) < 0) {
        mostrarAviso('Por favor, digite um número inteiro válido.');
        return;
    }

    const carregouPermissoes = await carregarPermissoes();

    if (!carregouPermissoes) {
        mostrarAviso('Não foi possível carregar as permissões. Atualize a página e tente novamente.');
        return;
    }

    document.getElementById('inputId_cargo').value = id_cargo;

    cargo = await procurePorChavePrimaria(id_cargo);
    oQueEstaFazendo = '';

    if (cargo) {
        mostrarDadosCargo(cargo);

        visibilidadeDosBotoes('inline', 'none', 'inline', 'inline', 'none');

        mostrarAviso('Cargo encontrado! Você pode alterar ou excluir.');

    } else {
        limparAtributos();

        visibilidadeDosBotoes('inline', 'inline', 'none', 'none', 'none');

        mostrarAviso('Cargo não encontrado. Você pode cadastrá-lo.');
    }
}

// Iniciar inserção
function inserir() {
    bloquearAtributos(false);

    visibilidadeDosBotoes('none', 'none', 'none', 'none', 'inline');

    oQueEstaFazendo = 'inserindo';

    selecionarPermissoes([]);

    mostrarAviso('INSERINDO - Preencha o nome do cargo, selecione suas permissões e clique em salvar.');
}

// Iniciar alteração
function alterar() {
    bloquearAtributos(false);

    visibilidadeDosBotoes('none', 'none', 'none', 'none', 'inline');

    oQueEstaFazendo = 'alterando';

    mostrarAviso('ALTERANDO - Modifique o nome e as permissões do cargo e clique em salvar.');
}

// Iniciar exclusão
function excluir() {
    bloquearAtributos(true);

    visibilidadeDosBotoes('none', 'none', 'none', 'none', 'inline');

    oQueEstaFazendo = 'excluindo';

    mostrarAviso('EXCLUINDO - Clique em salvar para confirmar a exclusão.');
}

// Salvar operações
async function salvar() {
    const id_cargo = document.getElementById('inputId_cargo').value.trim();
    const nome_cargo = document.getElementById('inputNome_cargo').value.trim();

    if (oQueEstaFazendo === '') {
        mostrarAviso('Nenhuma operação foi selecionada.');
        return;
    }

    if (oQueEstaFazendo !== 'excluindo') {
        if (nome_cargo === '') {
            mostrarAviso('Informe o nome do cargo.');
            return;
        }

        const carregouPermissoes = await carregarPermissoes();

        if (!carregouPermissoes) {
            mostrarAviso('Não foi possível carregar as permissões.');
            return;
        }
    }

    const dadosCargo = {
        id_cargo: Number(id_cargo),
        nome_cargo,
        permissoes: obterPermissoesSelecionadas()
    };

    try {
        let resposta;
        let data;

        if (oQueEstaFazendo === 'inserindo') {
            resposta = await fetch(`${URL_API}/cargo`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(dadosCargo)
            });

            data = await resposta.json();

            if (!resposta.ok || !data.sucesso) {
                mostrarAviso(data.mensagem || 'Erro ao cadastrar cargo.');
                return;
            }

            mostrarAviso('Cargo cadastrado no banco de dados com sucesso!');

        } else if (oQueEstaFazendo === 'alterando') {
            resposta = await fetch(`${URL_API}/cargo/${id_cargo}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(dadosCargo)
            });

            data = await resposta.json();

            if (!resposta.ok || !data.sucesso) {
                mostrarAviso(data.mensagem || 'Erro ao alterar cargo.');
                return;
            }

            mostrarAviso('Cargo alterado no banco de dados com sucesso!');

        } else if (oQueEstaFazendo === 'excluindo') {
            resposta = await fetch(`${URL_API}/cargo/${id_cargo}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            data = await resposta.json();

            if (!resposta.ok || !data.sucesso) {
                mostrarAviso(data.mensagem || 'Erro ao excluir cargo.');
                return;
            }

            mostrarAviso('Cargo excluído do banco de dados com sucesso!');
        }

        visibilidadeDosBotoes('inline', 'none', 'none', 'none', 'none');

        limparAtributos();

        document.getElementById('inputId_cargo').value = '';

        await listar();

    } catch (erro) {
        console.error('Erro ao salvar cargo:', erro);
        mostrarAviso('Erro ao efetuar operação no servidor.');
    }
}

// Listar cargos
async function listar() {
    try {
        const carregouPermissoes = await carregarPermissoes();

        if (!carregouPermissoes) {
            document.getElementById('outputSaida').innerHTML =
                'Não foi possível carregar os dados. Verifique sua sessão.';
            return;
        }

        const resposta = await fetch(`${URL_API}/cargo/listar`, {
            credentials: 'include'
        });

        const data = await resposta.json();

        if (!resposta.ok || !data.sucesso) {
            document.getElementById('outputSaida').innerHTML =
                `Erro ao listar cargos: ${escaparHTML(data.mensagem || 'Erro desconhecido.')}`;
            return;
        }

        let texto = `
            <table class="tabela-cargos">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nome do cargo</th>
                    </tr>
                </thead>
                <tbody>
        `;

        for (const linha of data.cargos) {
            texto += `
                <tr>
                    <td>${escaparHTML(linha.id_cargo)}</td>
                    <td>${escaparHTML(linha.nome_cargo)}</td>
                </tr>
            `;
        }

        texto += `
                </tbody>
            </table>
        `;

        document.getElementById('outputSaida').innerHTML =
            data.cargos.length > 0 ? texto : 'Nenhum cargo cadastrado.';

    } catch (erro) {
        console.error('Erro ao listar cargos:', erro);

        document.getElementById('outputSaida').innerHTML =
            'Servidor offline ou erro de conexão.';
    }
}

// Cancelar operação
function cancelarOperacao() {
    limparAtributos();

    bloquearAtributos(true);

    visibilidadeDosBotoes('inline', 'none', 'none', 'none', 'none');

    mostrarAviso('Operação cancelada.');
}

// Exibir aviso
function mostrarAviso(mensagem) {
    document.getElementById('divAviso').textContent = mensagem;
}

// Mostrar dados do cargo consultado
function mostrarDadosCargo(c) {
    document.getElementById('inputId_cargo').value = c.id_cargo;
    document.getElementById('inputNome_cargo').value = c.nome_cargo;

    selecionarPermissoes(c.permissoes || []);

    bloquearAtributos(true);
}

// Limpar dados do formulário
function limparAtributos() {
    cargo = null;
    oQueEstaFazendo = '';

    document.getElementById('inputNome_cargo').value = '';

    selecionarPermissoes([]);

    bloquearAtributos(true);
}

// Bloquear ou liberar os campos
function bloquearAtributos(soLeitura) {
    document.getElementById('inputId_cargo').readOnly = !soLeitura;
    document.getElementById('inputNome_cargo').readOnly = soLeitura;

    document.querySelectorAll('#listaPermissoes input[type="checkbox"]').forEach(checkbox => {
        checkbox.disabled = soLeitura;
    });
}

// Controlar visibilidade dos botões
function visibilidadeDosBotoes(btP, btI, btA, btE, btS) {
    document.getElementById('btProcure').style.display = btP;
    document.getElementById('btInserir').style.display = btI;
    document.getElementById('btAlterar').style.display = btA;
    document.getElementById('btExcluir').style.display = btE;
    document.getElementById('btSalvar').style.display = btS;
    document.getElementById('btCancelar').style.display = btS;
}