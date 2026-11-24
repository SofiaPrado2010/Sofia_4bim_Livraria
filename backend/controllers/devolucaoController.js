const { query, pool } = require('../database');

// LISTAR PEDIDOS DISPONÍVEIS PARA DEVOLUÇÃO
exports.listarPedidosDisponiveis = async (req, res) => {
    try {

        const resultado = await query(`
            SELECT
                p.id_pedido,
                p.data_pedido,
                pe.cpf_pessoa,
                pe.nome_pessoa,
                (
                    SELECT COUNT(*)
                    FROM item_pedido ip
                    WHERE ip.id_pedido = p.id_pedido
                ) AS quantidade_itens
            FROM pedido p
            INNER JOIN pessoa pe
                ON p.cpf_pessoa = pe.cpf_pessoa
            INNER JOIN pagamento pg
                ON p.id_pedido = pg.id_pedido
            WHERE p.status_pedido = 'Concluído'
            AND EXISTS (
                SELECT 1
                FROM item_pedido ip
                WHERE ip.id_pedido = p.id_pedido
                AND ip.quantidade > (
                    SELECT COALESCE(SUM(idv.quantidade_devolvida), 0)
                    FROM item_devolucao idv
                    WHERE idv.id_pedido = ip.id_pedido
                    AND idv.id_livro = ip.id_livro
                )
            )
            ORDER BY p.data_pedido DESC
        `);

        return res.status(200).json({
            sucesso: true,
            pedidos: resultado.rows
        });

    } catch (error) {
        console.error('Erro ao listar pedidos disponíveis:', error);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao carregar os pedidos disponíveis.'
        });
    }
};

// LISTAR LIVROS DE UM PEDIDO
exports.listarLivrosDoPedido = async (req, res) => {
    try {

        const idPedido = Number(req.params.id);

        if (!Number.isInteger(idPedido) || idPedido <= 0) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Número do pedido inválido.'
            });
        }

        const resultado = await query(`
            SELECT
                l.id_livro,
                l.nome_livro,
                ip.quantidade AS quantidade_comprada,
                ip.preco_unitario,
                COALESCE(
                    (
                        SELECT SUM(idv.quantidade_devolvida)
                        FROM item_devolucao idv
                        WHERE idv.id_pedido = ip.id_pedido
                        AND idv.id_livro = ip.id_livro
                    ),
                    0
                ) AS quantidade_devolvida,
                ip.quantidade - COALESCE(
                    (
                        SELECT SUM(idv.quantidade_devolvida)
                        FROM item_devolucao idv
                        WHERE idv.id_pedido = ip.id_pedido
                        AND idv.id_livro = ip.id_livro
                    ),
                    0
                ) AS quantidade_disponivel
            FROM item_pedido ip
            INNER JOIN livro l
                ON ip.id_livro = l.id_livro
            INNER JOIN pedido p
                ON ip.id_pedido = p.id_pedido
            INNER JOIN pagamento pg
                ON p.id_pedido = pg.id_pedido
            WHERE ip.id_pedido = $1
            AND p.status_pedido = 'Concluído'
            ORDER BY l.nome_livro
        `, [idPedido]);

        if (resultado.rows.length === 0) {

            return res.status(404).json({
                sucesso: false,
                mensagem: 'Pedido não encontrado ou sem livros.'
            });
        }

        return res.status(200).json({
            sucesso: true,
            livros: resultado.rows
        });

    } catch (error) {
        console.error('Erro ao listar livros do pedido:', error);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao carregar os livros do pedido.'
        });
    }
};

// REGISTRAR DEVOLUÇÃO

exports.registrarDevolucao = async (req, res) => {

    let conexao;

    try {

        const { id_pedido, itens } = req.body;
        const idPedido = Number(id_pedido);

        // VALIDAR O PEDIDO
        if (!Number.isInteger(idPedido) || idPedido <= 0) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Informe um pedido válido.'
            });
        }

        // VALIDAR OS ITENS
        if (!Array.isArray(itens) || itens.length === 0) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Selecione pelo menos um livro para devolver.'
            });
        }

        const chavesEscolhidas = [];
        const itensNormalizados = [];
        const quantidadesPorLivro = {};

        for (const item of itens) {

            if (
                !item ||
                typeof item !== 'object' ||
                Array.isArray(item)
            ) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Dados dos livros inválidos.'
                });
            }

            const idLivro = Number(item.id_livro);
            const quantidade = Number(item.quantidade);
            const motivo = item.motivo_devolucao;

            if (
                !Number.isInteger(idLivro) ||
                idLivro <= 0 ||
                !Number.isInteger(quantidade) ||
                quantidade <= 0
            ) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Livro ou quantidade inválida.'
                });
            }

            if (
                motivo !== 'Pessoal' &&
                motivo !== 'Defeito'
            ) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Motivo de devolução inválido.'
                });
            }

            // Não permitir repetir o mesmo livro com o mesmo motivo
            const chave = `${idLivro}-${motivo}`;

            if (chavesEscolhidas.includes(chave)) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Não repita o mesmo livro com o mesmo motivo.'
                });
            }

            chavesEscolhidas.push(chave);

            itensNormalizados.push({
                idLivro,
                quantidade,
                motivo
            });

            // Somar as quantidades do mesmo livro
            if (!quantidadesPorLivro[idLivro]) {
                quantidadesPorLivro[idLivro] = 0;
            }

            quantidadesPorLivro[idLivro] += quantidade;
        }

        // INICIAR A CONEXÃO E A TRANSAÇÃO
        conexao = await pool.connect();

        await conexao.query('BEGIN');

        // BUSCAR E BLOQUEAR O PEDIDO
        const pedido = await conexao.query(`
            SELECT
                p.id_pedido,
                p.status_pedido
            FROM pedido p
            INNER JOIN pagamento pg
                ON p.id_pedido = pg.id_pedido
            WHERE p.id_pedido = $1
            FOR UPDATE OF p
        `, [idPedido]);

        if (pedido.rows.length === 0) {

            const erro = new Error(
                'Pedido não encontrado ou sem pagamento registrado.'
            );

            erro.status = 404;
            throw erro;
        }

        if (pedido.rows[0].status_pedido !== 'Concluído') {

            const erro = new Error(
                'Somente pedidos concluídos podem ser devolvidos.'
            );

            erro.status = 400;
            throw erro;
        }

        // VALIDAR A QUANTIDADE TOTAL DE CADA LIVRO
        for (const idLivro in quantidadesPorLivro) {

            const compra = await conexao.query(`
                SELECT quantidade
                FROM item_pedido
                WHERE id_pedido = $1
                AND id_livro = $2
                FOR UPDATE
            `, [idPedido, idLivro]);

            if (compra.rows.length === 0) {

                const erro = new Error(
                    'Um dos livros selecionados não pertence a esse pedido.'
                );

                erro.status = 400;
                throw erro;
            }

            const quantidadeComprada =
                Number(compra.rows[0].quantidade);

            const devolucoesAnteriores = await conexao.query(`
                SELECT COALESCE(
                    SUM(quantidade_devolvida),
                    0
                ) AS total_devolvido
                FROM item_devolucao
                WHERE id_pedido = $1
                AND id_livro = $2
            `, [idPedido, idLivro]);

            const quantidadeDevolvida =
                Number(devolucoesAnteriores.rows[0].total_devolvido);

            const quantidadeDisponivel =
                quantidadeComprada - quantidadeDevolvida;

            if (quantidadesPorLivro[idLivro] > quantidadeDisponivel) {

                const erro = new Error(
                    `Quantidade indisponível para o livro ${idLivro}. Restam ${quantidadeDisponivel} unidade(s) para devolver.`
                );

                erro.status = 400;
                throw erro;
            }
        }

        // REGISTRAR A DEVOLUÇÃO
        const devolucao = await conexao.query(`
            INSERT INTO devolucao (
                id_pedido,
                funcionario_cpf
            )
            VALUES ($1, $2)
            RETURNING id_devolucao, data_devolucao
        `, [
            idPedido,
            req.session.usuario.cpf
        ]);

        const idDevolucao =
            devolucao.rows[0].id_devolucao;

        // REGISTRAR CADA MOTIVO DE DEVOLUÇÃO
        for (const item of itensNormalizados) {

            await conexao.query(`
                INSERT INTO item_devolucao (
                    id_devolucao,
                    id_pedido,
                    id_livro,
                    quantidade_devolvida,
                    motivo_devolucao
                )
                VALUES ($1, $2, $3, $4, $5)
            `, [
                idDevolucao,
                idPedido,
                item.idLivro,
                item.quantidade,
                item.motivo
            ]);

            // DEVOLUÇÃO PESSOAL: RETORNAR AO ESTOQUE
            if (item.motivo === 'Pessoal') {

                const livro = await conexao.query(`
                    UPDATE livro
                    SET quantidade_estoque =
                        quantidade_estoque + $1
                    WHERE id_livro = $2
                    RETURNING id_livro
                `, [
                    item.quantidade,
                    item.idLivro
                ]);

                if (livro.rowCount === 0) {
                    throw new Error(
                        'Livro não encontrado ao atualizar o estoque.'
                    );
                }

                // REGISTRAR A MOVIMENTAÇÃO DE ENTRADA
                await conexao.query(`
                    INSERT INTO movimentacao_estoque (
                        livro_id,
                        funcionario_cpf,
                        tipo_movimentacao,
                        quantidade_movimentacao,
                        observacao_movimentacao
                    )
                    VALUES ($1, $2, 'Entrada', $3, $4)
                `, [
                    item.idLivro,
                    req.session.usuario.cpf,
                    item.quantidade,
                    `Devolução pessoal - Pedido ${idPedido}`
                ]);
            }
        }

        // CONFIRMAR A TRANSAÇÃO
        await conexao.query('COMMIT');

        return res.status(201).json({
            sucesso: true,
            mensagem: 'Devolução registrada com sucesso!',
            idDevolucao,
            dataDevolucao: devolucao.rows[0].data_devolucao
        });

    } catch (error) {

        if (conexao) {
            await conexao.query('ROLLBACK');
        }

        console.error('Erro ao registrar devolução:', error);

        return res.status(error.status || 500).json({
            sucesso: false,
            mensagem: error.status
                ? error.message
                : 'Não foi possível registrar a devolução.'
        });

    } finally {

        if (conexao) {
            conexao.release();
        }
    }
};

// LISTAR HISTÓRICO DE DEVOLUÇÕES
exports.listarDevolucoes = async (req, res) => {
    try {

        const resultado = await query(`
            SELECT
                d.id_devolucao,
                d.id_pedido,
                d.data_devolucao,
                pe.cpf_pessoa AS cpf_funcionario,
                pe.nome_pessoa AS nome_funcionario,
                l.id_livro,
                l.nome_livro,
                idv.quantidade_devolvida,
                idv.motivo_devolucao
            FROM devolucao d
            INNER JOIN pessoa pe
                ON d.funcionario_cpf = pe.cpf_pessoa
            INNER JOIN item_devolucao idv
                ON d.id_devolucao = idv.id_devolucao
                AND d.id_pedido = idv.id_pedido
            INNER JOIN livro l
                ON idv.id_livro = l.id_livro
            ORDER BY d.data_devolucao DESC, d.id_devolucao DESC
        `);

        return res.status(200).json({
            sucesso: true,
            devolucoes: resultado.rows
        });

    } catch (error) {
        console.error('Erro ao listar devoluções:', error);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao carregar o histórico de devoluções.'
        });
    }
};