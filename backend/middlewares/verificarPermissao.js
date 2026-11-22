// Permissões de cada cargo
const permissoesPorCargo = {
    'Gerente': [
        'livro:visualizar',
        'livro:gerenciar',
        'estoque:alterar',
        'pedido:visualizar',
        'pedido:alterar',
        'pagamento:registrar',
        'entrega:alterar',
        'devolucao:visualizar',
        'devolucao:gerenciar',
        'pessoa:gerenciar',
        'funcionario:gerenciar',
        'cargo:gerenciar',
        'genero:gerenciar',
        'forma_pagamento:gerenciar'
    ],

    'Atendente': [
        'livro:visualizar',
        'pedido:visualizar',
        'pedido:alterar',
        'devolucao:visualizar',
        'devolucao:gerenciar'
    ],

    'Vendedor': [
        'livro:visualizar',
        'pedido:visualizar',
        'pedido:alterar',
        'devolucao:visualizar',
        'devolucao:gerenciar'
    ],

    'Estoquista': [
        'livro:visualizar',
        'estoque:alterar'
    ],

    'Operador de Caixa': [
        'pedido:visualizar',
        'pagamento:registrar'
    ],

    'Auxiliar Administrativo': [
        'pessoa:consultar'
    ],

    'Assistente de Vendas': [
        'livro:visualizar',
        'pedido:visualizar',
        'pedido:alterar',
        'devolucao:visualizar',
        'devolucao:gerenciar'
    ],

    'Auxiliar de Estoque': [
        'livro:visualizar',
        'estoque:alterar'
    ],

    'Comprador': [
        'livro:visualizar'
    ],

    'Auxiliar de Logística': [
        'pedido:visualizar',
        'entrega:alterar'
    ]
};


// Retorna as permissões de determinado cargo
exports.obterPermissoes = (cargo) => {
    return permissoesPorCargo[cargo] || [];
};


// Verifica se o funcionário possui determinada permissão
exports.verificarPermissao = (permissao) => {

    return (req, res, next) => {

        // Verifica se existe uma sessão
        if (!req.session.usuario) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Você precisa fazer login.'
            });
        }

        const usuario = req.session.usuario;

        // Verifica se o usuário é funcionário
        if (!usuario.perfis.includes('FUNCIONARIO')) {
            return res.status(403).json({
                sucesso: false,
                mensagem: 'Acesso permitido somente para funcionários.'
            });
        }

        // Busca as permissões do cargo
        const permissoes = exports.obterPermissoes(usuario.cargo);

        // Verifica se possui a permissão solicitada
        if (!permissoes.includes(permissao)) {
            return res.status(403).json({
                sucesso: false,
                mensagem: 'Você não possui autorização para realizar esta operação.'
            });
        }

        // Permissão concedida
        next();
    };
};