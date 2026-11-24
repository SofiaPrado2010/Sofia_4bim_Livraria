const { query } = require('../database');

// Normalizar o nome para identificar a forma de pagamento
function normalizarNome(nome) {
    return nome
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toUpperCase();
}

// Validar a quantidade máxima de parcelas
function obterMaxParcelas(nome, valor) {
    const tipo = normalizarNome(nome);

    // PIX e débito não permitem parcelamento
    if (tipo !== 'CREDITO') {
        return 1;
    }

    const maxParcelas = Number(valor);

    if (
        !Number.isInteger(maxParcelas) ||
        maxParcelas < 1 ||
        maxParcelas > 12
    ) {
        return null;
    }

    return maxParcelas;
}

// Listar todas as formas de pagamento
exports.listarForma_pagamento = async (req, res) => {
    try {
        const result = await query(
            'SELECT * FROM forma_pagamento ORDER BY id_forma_pagamento'
        );

        res.json({ sucesso: true, forma_pagamento: result.rows });
    } catch (error) {
        console.error('Erro ao listar forma_pagamento:', error);
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao listar formas de pagamentos.'
        });
    }
};

// Listar somente as formas de pagamento ativas
exports.listarFormasAtivas = async (req, res) => {
    try {
        const result = await query(`
            SELECT *
            FROM forma_pagamento
            WHERE ativo = TRUE
            ORDER BY id_forma_pagamento
        `);

        res.json({ sucesso: true, forma_pagamento: result.rows });
    } catch (error) {
        console.error('Erro ao listar formas ativas:', error);
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao listar formas de pagamento ativas.'
        });
    }
};

// Obter forma de pagamento por ID
exports.obterForma_pagamento = async (req, res) => {
    try {
        const id = req.params.id ? req.params.id.trim() : '';

        const result = await query(
            'SELECT * FROM forma_pagamento WHERE id_forma_pagamento = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Forma de pagamento não encontrada.'
            });
        }

        res.json({ sucesso: true, forma_pagamento: result.rows[0] });
    } catch (error) {
        console.error('Erro ao obter forma_pagamento:', error);
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro interno do servidor.'
        });
    }
};

// Criar forma de pagamento
exports.criarForma_pagamento = async (req, res) => {
    try {
        const { id_forma_pagamento, nome_forma_pagamento, max_parcelas } = req.body;

        const id = id_forma_pagamento ? id_forma_pagamento.trim() : '';
        const nome = typeof nome_forma_pagamento === 'string'
            ? nome_forma_pagamento.trim()
            : '';

        if (!nome) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'O nome da forma de pagamento é obrigatório.'
            });
        }

        const maxParcelas = obterMaxParcelas(nome, max_parcelas);

        if (maxParcelas === null) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'A quantidade máxima de parcelas deve ser um número inteiro entre 1 e 12.'
            });
        }

        const sql = `
            INSERT INTO forma_pagamento
                (id_forma_pagamento, nome_forma_pagamento, max_parcelas)
            VALUES ($1, $2, $3)
            RETURNING *
        `;

        const result = await query(sql, [id, nome, maxParcelas]);

        res.status(201).json({
            sucesso: true,
            mensagem: 'Forma de pagamento inserida com sucesso!',
            forma_pagamento: result.rows[0]
        });
    } catch (error) {
        console.error('Erro ao criar forma_pagamento:', error);

        if (error.code === '23505') {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Este ID de forma de pagamento já está cadastrado.'
            });
        }

        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao inserir forma de pagamento no banco de dados.'
        });
    }
};

// Atualizar forma de pagamento
exports.atualizarForma_pagamento = async (req, res) => {
    try {
        const id = req.params.id ? req.params.id.trim() : '';
        const { nome_forma_pagamento, max_parcelas } = req.body;

        const nome = typeof nome_forma_pagamento === 'string'
            ? nome_forma_pagamento.trim()
            : '';

        if (!nome) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'O nome da forma de pagamento é obrigatório.'
            });
        }

        const maxParcelas = obterMaxParcelas(nome, max_parcelas);

        if (maxParcelas === null) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'A quantidade máxima de parcelas deve ser um número inteiro entre 1 e 12.'
            });
        }

        const sql = `
            UPDATE forma_pagamento
            SET
                nome_forma_pagamento = $1,
                max_parcelas = $2
            WHERE id_forma_pagamento = $3
            RETURNING *
        `;

        const result = await query(sql, [nome, maxParcelas, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Forma de pagamento não encontrada.'
            });
        }

        res.json({
            sucesso: true,
            mensagem: 'Forma de pagamento alterada com sucesso!',
            forma_pagamento: result.rows[0]
        });
    } catch (error) {
        console.error('Erro ao atualizar forma de pagamento:', error);
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao atualizar forma de pagamento.'
        });
    }
};

// Desativar forma de pagamento
exports.desativarForma_pagamento = async (req, res) => {
    try {
        const id = req.params.id ? req.params.id.trim() : '';

        const result = await query(`
            UPDATE forma_pagamento
            SET ativo = FALSE
            WHERE id_forma_pagamento = $1
            RETURNING *
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Forma de pagamento não encontrada.'
            });
        }

        res.json({
            sucesso: true,
            mensagem: 'Forma de pagamento desativada com sucesso!',
            forma_pagamento: result.rows[0]
        });
    } catch (error) {
        console.error('Erro ao desativar forma de pagamento:', error);
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao desativar forma de pagamento.'
        });
    }
};

// Reativar forma de pagamento
exports.reativarForma_pagamento = async (req, res) => {
    try {
        const id = req.params.id ? req.params.id.trim() : '';

        const result = await query(`
            UPDATE forma_pagamento
            SET ativo = TRUE
            WHERE id_forma_pagamento = $1
            RETURNING *
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Forma de pagamento não encontrada.'
            });
        }

        res.json({
            sucesso: true,
            mensagem: 'Forma de pagamento reativada com sucesso!',
            forma_pagamento: result.rows[0]
        });
    } catch (error) {
        console.error('Erro ao reativar forma de pagamento:', error);
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao reativar forma de pagamento.'
        });
    }
};

// Deletar forma de pagamento
exports.deletarForma_pagamento = async (req, res) => {
    try {
        const id = req.params.id ? req.params.id.trim() : '';

        await query(
            'DELETE FROM forma_pagamento WHERE id_forma_pagamento = $1',
            [id]
        );

        res.json({
            sucesso: true,
            mensagem: 'Forma de pagamento excluída com sucesso!'
        });
    } catch (error) {
        console.error('Erro ao deletar forma_pagamento:', error);

        if (error.code === '23503') {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Não é possível excluir esta forma de pagamento, pois ela está vinculada a outros registros.'
            });
        }

        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao excluir forma de pagamento.'
        });
    }
};