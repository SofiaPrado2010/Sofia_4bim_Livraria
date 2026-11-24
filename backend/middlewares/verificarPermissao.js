const { query } = require('../database');

// Buscar as permissões de um cargo diretamente no banco de dados
exports.obterPermissoes = async (cargo) => {
    try {
        if (!cargo) {
            return [];
        }

        const sql = `
            SELECT p.codigo_permissao
            FROM cargo
            INNER JOIN cargo_tem_permissao cp
                ON cargo.id_cargo = cp.id_cargo
            INNER JOIN permissao p
                ON cp.id_permissao = p.id_permissao
            WHERE LOWER(TRIM(cargo.nome_cargo)) = LOWER(TRIM($1))
            ORDER BY p.codigo_permissao
        `;

        const resultado = await query(sql, [cargo]);

        return resultado.rows.map(
            linha => linha.codigo_permissao
        );

    } catch (error) {
        console.error('Erro ao buscar permissões do cargo:', error);
        throw error;
    }
};

// Verificar se o funcionário possui determinada permissão
exports.verificarPermissao = (permissao) => {
    return async (req, res, next) => {
        try {
            if (!req.session.usuario) {
                return res.status(401).json({
                    sucesso: false,
                    mensagem: 'Você precisa fazer login.'
                });
            }

            const usuario = req.session.usuario;

            if (
                !Array.isArray(usuario.perfis) ||
                !usuario.perfis.includes('FUNCIONARIO')
            ) {
                return res.status(403).json({
                    sucesso: false,
                    mensagem: 'Acesso permitido somente para funcionários.'
                });
            }

            const permissoes = await exports.obterPermissoes(
                usuario.cargo
            );

            if (!permissoes.includes(permissao)) {
                return res.status(403).json({
                    sucesso: false,
                    mensagem: 'Você não possui autorização para realizar esta operação.'
                });
            }

            next();

        } catch (error) {
            console.error('Erro ao verificar permissão:', error);

            return res.status(500).json({
                sucesso: false,
                mensagem: 'Erro ao verificar as permissões do usuário.'
            });
        }
    };
};