const { pool } = require('../database');

// Listar todos os pedidos para a área administrativa
exports.listarPedidosAdmin = async (req, res) => {

    try {

        const resultado = await pool.query(`
            SELECT
                p.id_pedido,
                p.cpf_pessoa,
                pe.nome_pessoa,
                p.data_pedido,
                p.status_pedido,
                COALESCE(
                    pg.valor_total,
                    SUM(ip.quantidade * ip.preco_unitario)
                ) AS valor_total

            FROM pedido p

            INNER JOIN pessoa pe
                ON p.cpf_pessoa = pe.cpf_pessoa

            LEFT JOIN item_pedido ip
                ON p.id_pedido = ip.id_pedido

            LEFT JOIN pagamento pg
                ON p.id_pedido = pg.id_pedido

            GROUP BY
                p.id_pedido,
                p.cpf_pessoa,
                pe.nome_pessoa,
                p.data_pedido,
                p.status_pedido,
                pg.valor_total

            ORDER BY p.data_pedido DESC
        `);

        return res.status(200).json({
            sucesso: true,
            pedidos: resultado.rows
        });

    } catch (error) {

        console.error('Erro ao listar pedidos administrativos:', error);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao consultar os pedidos.'
        });
    }
};


// Consultar detalhes de qualquer pedido na área administrativa
exports.obterDetalhesPedidoAdmin = async (req, res) => {

    const { id } = req.params;

    try {

        // Consultar os dados do pedido e do cliente
        const resultadoPedido = await pool.query(`
            SELECT
                p.id_pedido,
                p.data_pedido,
                p.status_pedido,
                p.endereco_entrega,
                p.cidade_entrega,
                p.estado_entrega,
                p.prazo_pagamento,
                pe.cpf_pessoa,
                pe.nome_pessoa,
                pe.email_pessoa,
                COALESCE(
                    pg.valor_total,
                    (
                        SELECT SUM(ip.quantidade * ip.preco_unitario)
                        FROM item_pedido ip
                        WHERE ip.id_pedido = p.id_pedido
                    )
                ) AS valor_total,
                pg.data_pagamento

            FROM pedido p

            INNER JOIN pessoa pe
                ON p.cpf_pessoa = pe.cpf_pessoa

            LEFT JOIN pagamento pg
                ON p.id_pedido = pg.id_pedido

            WHERE p.id_pedido = $1
        `, [id]);

        if (resultadoPedido.rows.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Pedido não encontrado.'
            });
        }

        // Consultar os livros do pedido
        const resultadoItens = await pool.query(`
            SELECT
                l.id_livro,
                l.nome_livro,
                ip.quantidade,
                ip.preco_unitario,
                (ip.quantidade * ip.preco_unitario) AS subtotal

            FROM item_pedido ip

            INNER JOIN livro l
                ON ip.id_livro = l.id_livro

            WHERE ip.id_pedido = $1

            ORDER BY l.nome_livro
        `, [id]);

        // Consultar as formas de pagamento
        const resultadoPagamentos = await pool.query(`
            SELECT
                fp.id_forma_pagamento,
                fp.nome_forma_pagamento,
                pfp.valor_pago,
                pfp.quantidade_parcelas

            FROM pagamento_tem_forma_pagamento pfp

            INNER JOIN forma_pagamento fp
                ON pfp.id_forma_pagamento = fp.id_forma_pagamento

            WHERE pfp.pagamento_id_pedido = $1
        `, [id]);

        return res.status(200).json({
            sucesso: true,
            pedido: resultadoPedido.rows[0],
            itens: resultadoItens.rows,
            formasPagamento: resultadoPagamentos.rows
        });

    } catch (error) {

        console.error('Erro ao consultar detalhes do pedido:', error);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao consultar os detalhes do pedido.'
        });
    }
};