const { query, pool } = require('../database');
const bcrypt = require('bcrypt');

// Lista os clientes
exports.listarClientes = async (req, res) => {
    try {
        const result = await query(
            `SELECT c.cpf_cliente, p.nome_pessoa, p.email_pessoa,
                    p.data_nascimento_pessoa, p.endereco_pessoa,
                    p.cidade_pessoa, p.estado_pessoa,
                    c.renda_cliente, c.data_cadastro
             FROM cliente c
             INNER JOIN pessoa p ON c.cpf_cliente = p.cpf_pessoa
             ORDER BY p.nome_pessoa`
        );

        res.json({
            sucesso: true,
            clientes: result.rows
        });

    } catch (error) {
        console.error('Erro ao listar clientes:', error);

        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao listar clientes.'
        });
    }
};

// Consulta uma pessoa pelo CPF, mesmo que ainda não seja cliente
exports.obterPessoa = async (req, res) => {
    try {
        const cpf = req.params.cpf;

        if (!/^\d{11}$/.test(cpf)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'CPF inválido.'
            });
        }

        const result = await query(
            `SELECT cpf_pessoa, nome_pessoa, data_nascimento_pessoa,
                    endereco_pessoa, cidade_pessoa, estado_pessoa,
                    usuario_pessoa, email_pessoa
             FROM pessoa
             WHERE cpf_pessoa = $1`,
            [cpf]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Pessoa não encontrada.'
            });
        }

        res.json({
            sucesso: true,
            pessoa: result.rows[0]
        });

    } catch (error) {
        console.error('Erro ao consultar pessoa:', error);

        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro interno do servidor.'
        });
    }
};

// Cadastra um cliente
exports.criarCliente = async (req, res) => {
    let conexao;

    try {
        const {
            cpf_pessoa,
            nome_pessoa,
            data_nascimento_pessoa,
            endereco_pessoa,
            cidade_pessoa,
            estado_pessoa,
            usuario_pessoa,
            senha_pessoa,
            email_pessoa,
            renda_cliente
        } = req.body;

        if (!cpf_pessoa || !/^\d{11}$/.test(cpf_pessoa)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'CPF inválido.'
            });
        }

        if (renda_cliente === undefined || renda_cliente === null ||
            renda_cliente === '' || !Number.isFinite(Number(renda_cliente)) ||
            Number(renda_cliente) < 0) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Informe uma renda válida.'
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        conexao = await pool.connect();

        await conexao.query('BEGIN');

        // Verifica se a pessoa já está cadastrada
        const pessoaExistente = await conexao.query(
            'SELECT cpf_pessoa FROM pessoa WHERE cpf_pessoa = $1 FOR UPDATE',
            [cpf_pessoa]
        );

        if (pessoaExistente.rows.length === 0) {

            // Verifica os dados obrigatórios da pessoa nova
            if (
                !nome_pessoa ||
                !data_nascimento_pessoa ||
                !endereco_pessoa ||
                !cidade_pessoa ||
                !estado_pessoa ||
                !usuario_pessoa ||
                !senha_pessoa ||
                !email_pessoa
            ) {
                await conexao.query('ROLLBACK');

                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Preencha todos os dados pessoais.'
                });
            }

            if (!emailRegex.test(email_pessoa)) {
                await conexao.query('ROLLBACK');

                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Email inválido.'
                });
            }

            // Criptografa a senha
            const senhaCriptografada = await bcrypt.hash(senha_pessoa, 10);

            // Cadastra a pessoa
            await conexao.query(
                `INSERT INTO pessoa
                 (cpf_pessoa, nome_pessoa, data_nascimento_pessoa,
                  endereco_pessoa, cidade_pessoa, estado_pessoa,
                  usuario_pessoa, senha_pessoa, email_pessoa)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                    cpf_pessoa,
                    nome_pessoa,
                    data_nascimento_pessoa,
                    endereco_pessoa,
                    cidade_pessoa,
                    estado_pessoa.toUpperCase(),
                    usuario_pessoa,
                    senhaCriptografada,
                    email_pessoa
                ]
            );
        }

        // Verifica se já existe o perfil de cliente
        const clienteExistente = await conexao.query(
            'SELECT cpf_cliente FROM cliente WHERE cpf_cliente = $1',
            [cpf_pessoa]
        );

        if (clienteExistente.rows.length > 0) {
            await conexao.query('ROLLBACK');

            return res.status(400).json({
                sucesso: false,
                mensagem: 'Esta pessoa já está cadastrada como cliente.'
            });
        }

        // Cadastra o perfil de cliente com a data automática
        await conexao.query(
            `INSERT INTO cliente
             (cpf_cliente, data_cadastro, renda_cliente)
             VALUES ($1, CURRENT_DATE, $2)`,
            [cpf_pessoa, Number(renda_cliente)]
        );

        await conexao.query('COMMIT');

        res.status(201).json({
            sucesso: true,
            mensagem: 'Cliente cadastrado com sucesso!'
        });

    } catch (error) {
        if (conexao) {
            await conexao.query('ROLLBACK');
        }

        console.error('Erro ao cadastrar cliente:', error);

        if (error.code === '23505') {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'CPF, usuário ou email já cadastrado.'
            });
        }

        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro interno ao cadastrar cliente.'
        });

    } finally {
        if (conexao) {
            conexao.release();
        }
    }
};

// Consulta um cliente pelo CPF
exports.obterCliente = async (req, res) => {
    try {
        const cpf = req.params.id;

        const result = await query(
            `SELECT c.cpf_cliente, c.renda_cliente, c.data_cadastro,
                    p.nome_pessoa, p.data_nascimento_pessoa,
                    p.endereco_pessoa, p.cidade_pessoa,
                    p.estado_pessoa, p.usuario_pessoa,
                    p.email_pessoa
             FROM cliente c
             INNER JOIN pessoa p ON c.cpf_cliente = p.cpf_pessoa
             WHERE c.cpf_cliente = $1`,
            [cpf]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Cliente não encontrado.'
            });
        }

        res.json({
            sucesso: true,
            cliente: result.rows[0]
        });

    } catch (error) {
        console.error('Erro ao consultar cliente:', error);

        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro interno do servidor.'
        });
    }
};

// Atualiza a renda do cliente
exports.atualizarCliente = async (req, res) => {
    try {
        const cpf = req.params.id;
        const { renda_cliente } = req.body;

        if (renda_cliente === undefined || renda_cliente === null ||
            renda_cliente === '' || !Number.isFinite(Number(renda_cliente)) ||
            Number(renda_cliente) < 0) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Informe uma renda válida.'
            });
        }

        const result = await query(
            `UPDATE cliente
             SET renda_cliente = $1
             WHERE cpf_cliente = $2
             RETURNING cpf_cliente, renda_cliente, data_cadastro`,
            [Number(renda_cliente), cpf]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Cliente não encontrado.'
            });
        }

        res.json({
            sucesso: true,
            mensagem: 'Renda atualizada com sucesso!',
            cliente: result.rows[0]
        });

    } catch (error) {
        console.error('Erro ao atualizar cliente:', error);

        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro interno do servidor.'
        });
    }
};

// Exclui somente o perfil de cliente
exports.deletarCliente = async (req, res) => {
    try {
        const cpf = req.params.id;

        // Verifica se a pessoa possui pedidos
        const pedidos = await query(
            `SELECT id_pedido
             FROM pedido
             WHERE cpf_pessoa = $1
             LIMIT 1`,
            [cpf]
        );

        if (pedidos.rows.length > 0) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Não é possível excluir este cliente, pois existem pedidos vinculados a ele.'
            });
        }

        // Exclui somente o perfil de cliente
        const result = await query(
            'DELETE FROM cliente WHERE cpf_cliente = $1 RETURNING cpf_cliente',
            [cpf]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Cliente não encontrado.'
            });
        }

        res.json({
            sucesso: true,
            mensagem: 'Perfil de cliente excluído com sucesso!'
        });

    } catch (error) {
        console.error('Erro ao excluir cliente:', error);

        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro interno do servidor.'
        });
    }
};
