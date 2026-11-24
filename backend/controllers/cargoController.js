const { query, pool } = require('../database');

// Listar todos os cargos e suas permissões
exports.listarCargos = async (req, res) => {
    try {
        const sql = `
            SELECT
                c.id_cargo,
                c.nome_cargo,
                COALESCE(
                    ARRAY_AGG(p.codigo_permissao)
                    FILTER (WHERE p.codigo_permissao IS NOT NULL),
                    ARRAY[]::VARCHAR[]
                ) AS permissoes
            FROM cargo c
            LEFT JOIN cargo_tem_permissao cp
                ON c.id_cargo = cp.id_cargo
            LEFT JOIN permissao p
                ON cp.id_permissao = p.id_permissao
            GROUP BY c.id_cargo, c.nome_cargo
            ORDER BY c.id_cargo
        `;

        const result = await query(sql);

        res.json({
            sucesso: true,
            cargos: result.rows
        });

    } catch (error) {
        console.error('Erro ao listar cargos:', error);
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao listar cargos.'
        });
    }
};

// Listar todas as permissões disponíveis
exports.listarPermissoes = async (req, res) => {
    try {
        const result = await query(
            'SELECT id_permissao, codigo_permissao FROM permissao ORDER BY codigo_permissao'
        );

        res.json({
            sucesso: true,
            permissoes: result.rows
        });

    } catch (error) {
        console.error('Erro ao listar permissões:', error);
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao listar permissões.'
        });
    }
};

// Obter cargo por ID, incluindo suas permissões
exports.obterCargo = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id < 0) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'ID do cargo inválido.'
            });
        }

        const result = await query(
            'SELECT * FROM cargo WHERE id_cargo = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Cargo não encontrado.'
            });
        }

        const permissoes = await query(
            `SELECT p.codigo_permissao
             FROM cargo_tem_permissao cp
             INNER JOIN permissao p
                ON cp.id_permissao = p.id_permissao
             WHERE cp.id_cargo = $1
             ORDER BY p.codigo_permissao`,
            [id]
        );

        res.json({
            sucesso: true,
            cargo: {
                ...result.rows[0],
                permissoes: permissoes.rows.map(
                    linha => linha.codigo_permissao
                )
            }
        });

    } catch (error) {
        console.error('Erro ao obter cargo:', error);
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro interno do servidor.'
        });
    }
};

// Validar as permissões recebidas
async function validarPermissoes(permissoes, nomeCargo) {
    if (!Array.isArray(permissoes)) {
        return {
            valido: false,
            mensagem: 'Selecione as permissões do cargo.'
        };
    }

    const permissoesUnicas = [
        ...new Set(
            permissoes
                .filter(p => typeof p === 'string')
                .map(p => p.trim())
                .filter(Boolean)
        )
    ];

    const resultado = await query(
        `SELECT codigo_permissao
         FROM permissao
         WHERE codigo_permissao = ANY($1::VARCHAR[])`,
        [permissoesUnicas]
    );

    if (resultado.rows.length !== permissoesUnicas.length) {
        return {
            valido: false,
            mensagem: 'Uma ou mais permissões selecionadas são inválidas.'
        };
    }

    if (
        nomeCargo.trim().toLowerCase() === 'gerente' &&
        !permissoesUnicas.includes('cargo:gerenciar')
    ) {
        return {
            valido: false,
            mensagem: 'O cargo Gerente precisa manter a permissão de gerenciar cargos.'
        };
    }

    return {
        valido: true,
        permissoes: permissoesUnicas
    };
}

// Associar as permissões ao cargo
async function salvarPermissoes(conexao, idCargo, permissoes) {
    if (permissoes.length === 0) {
        return;
    }

    await conexao.query(
        `INSERT INTO cargo_tem_permissao (id_cargo, id_permissao)
         SELECT $1, id_permissao
         FROM permissao
         WHERE codigo_permissao = ANY($2::VARCHAR[])`,
        [idCargo, permissoes]
    );
}

// Criar cargo
exports.criarCargo = async (req, res) => {
    let conexao;

    try {
        const { id_cargo, nome_cargo, permissoes } = req.body;

        const id = Number(id_cargo);
        const nome = typeof nome_cargo === 'string'
            ? nome_cargo.trim()
            : '';

        if (!Number.isInteger(id) || id < 0 || !nome) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Informe um ID válido e o nome do cargo.'
            });
        }

        const validacao = await validarPermissoes(permissoes, nome);

        if (!validacao.valido) {
            return res.status(400).json({
                sucesso: false,
                mensagem: validacao.mensagem
            });
        }

        conexao = await pool.connect();

        await conexao.query('BEGIN');

        const result = await conexao.query(
            `INSERT INTO cargo (id_cargo, nome_cargo)
             VALUES ($1, $2)
             RETURNING *`,
            [id, nome]
        );

        await salvarPermissoes(
            conexao,
            id,
            validacao.permissoes
        );

        await conexao.query('COMMIT');

        res.status(201).json({
            sucesso: true,
            mensagem: 'Cargo inserido com sucesso!',
            cargo: {
                ...result.rows[0],
                permissoes: validacao.permissoes
            }
        });

    } catch (error) {
        if (conexao) {
            await conexao.query('ROLLBACK');
        }

        console.error('Erro ao criar cargo:', error);

        if (error.code === '23505') {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Este ID de cargo já está cadastrado.'
            });
        }

        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao inserir cargo no banco de dados.'
        });

    } finally {
        if (conexao) {
            conexao.release();
        }
    }
};

// Atualizar cargo
exports.atualizarCargo = async (req, res) => {
    let conexao;

    try {
        const id = Number(req.params.id);

        const { nome_cargo, permissoes } = req.body;

        const nome = typeof nome_cargo === 'string'
            ? nome_cargo.trim()
            : '';

        if (!Number.isInteger(id) || id < 0 || !nome) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Informe um nome válido para o cargo.'
            });
        }

        const validacao = await validarPermissoes(permissoes, nome);

        if (!validacao.valido) {
            return res.status(400).json({
                sucesso: false,
                mensagem: validacao.mensagem
            });
        }

        conexao = await pool.connect();

        await conexao.query('BEGIN');

        const result = await conexao.query(
            `UPDATE cargo
             SET nome_cargo = $1
             WHERE id_cargo = $2
             RETURNING *`,
            [nome, id]
        );

        if (result.rows.length === 0) {
            await conexao.query('ROLLBACK');

            return res.status(404).json({
                sucesso: false,
                mensagem: 'Cargo não encontrado.'
            });
        }

        // Remover as permissões antigas
        await conexao.query(
            'DELETE FROM cargo_tem_permissao WHERE id_cargo = $1',
            [id]
        );

        // Salvar as novas permissões
        await salvarPermissoes(
            conexao,
            id,
            validacao.permissoes
        );

        await conexao.query('COMMIT');

        res.json({
            sucesso: true,
            mensagem: 'Cargo alterado com sucesso!',
            cargo: {
                ...result.rows[0],
                permissoes: validacao.permissoes
            }
        });

    } catch (error) {
        if (conexao) {
            await conexao.query('ROLLBACK');
        }

        console.error('Erro ao atualizar cargo:', error);

        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao atualizar cargo.'
        });

    } finally {
        if (conexao) {
            conexao.release();
        }
    }
};

// Deletar cargo
exports.deletarCargo = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id < 0) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'ID do cargo inválido.'
            });
        }

        const cargo = await query(
            'SELECT nome_cargo FROM cargo WHERE id_cargo = $1',
            [id]
        );

        if (cargo.rows.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Cargo não encontrado.'
            });
        }

        if (cargo.rows[0].nome_cargo.trim().toLowerCase() === 'gerente') {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'O cargo Gerente não pode ser excluído.'
            });
        }

        await query(
            'DELETE FROM cargo WHERE id_cargo = $1',
            [id]
        );

        res.json({
            sucesso: true,
            mensagem: 'Cargo excluído com sucesso!'
        });

    } catch (error) {
        console.error('Erro ao deletar cargo:', error);

        if (error.code === '23503') {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Não é possível excluir um cargo que possui funcionários associados.'
            });
        }

        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao excluir cargo.'
        });
    }
};