const { pool } = require('../database');
const crypto = require('crypto');

// Estados brasileiros permitidos
const estadosPermitidos = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF',
    'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
    'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RS',
    'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

// Criar pedido
exports.criarPedido = async (req, res) => {

    const cliente = req.session.usuario;

    try {

        // Verificar se existe alguém conectado
        if (!cliente) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Você precisa estar conectado para realizar uma compra.'
            });
        }

        // Verificar se o usuário possui perfil de cliente
        if (
            !Array.isArray(cliente.perfis) ||
            !cliente.perfis.includes('CLIENTE')
        ) {
            return res.status(403).json({
                sucesso: false,
                mensagem: 'Somente clientes podem realizar pedidos.'
            });
        }

        // Verificar os dados recebidos
        if (
            !req.body ||
            typeof req.body !== 'object' ||
            Array.isArray(req.body)
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Dados do pedido inválidos.'
            });
        }

        const {
            itens,
            endereco,
            cidade,
            estado,
            pagamentos,
            chaveIdempotencia
        } = req.body;

        // Verificar os dados do pedido
        if (
            !Array.isArray(itens) || itens.length === 0 ||
            !Array.isArray(pagamentos) || pagamentos.length === 0 ||
            pagamentos.length > 3 ||
            typeof endereco !== 'string' || !endereco.trim() ||
            typeof cidade !== 'string' || !cidade.trim() ||
            typeof estado !== 'string' || !estado.trim()
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Preencha todos os dados para finalizar a compra.'
            });
        }

        // Verificar a chave de idempotência
        const formatoUUID =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        if (
            typeof chaveIdempotencia !== 'string' ||
            !formatoUUID.test(chaveIdempotencia)
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Chave de identificação da compra inválida.'
            });
        }

        // Organizar os dados de entrega
        const enderecoFinal = endereco.trim();
        const cidadeFinal = cidade.trim();
        const siglaEstado = estado.trim().toUpperCase();

        // Validar a sigla do estado
        if (!estadosPermitidos.includes(siglaEstado)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Informe uma sigla de estado brasileiro válida.'
            });
        }

        // Verificar o tamanho dos dados de entrega
        if (
            enderecoFinal.length > 150 ||
            cidadeFinal.length > 100
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Confira o tamanho dos dados de entrega.'
            });
        }

        // Verificar as formas de pagamento
        const formasPermitidas = ['PIX', 'CREDITO', 'DEBITO'];
        const formasEscolhidas = [];

        let somaPagamentos = 0;

        for (const pagamento of pagamentos) {

            if (
                !pagamento ||
                typeof pagamento !== 'object' ||
                Array.isArray(pagamento)
            ) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Dados de pagamento inválidos.'
                });
            }

            const forma = pagamento.formaPagamento;
            const valor = Number(pagamento.valor);

            if (
                typeof forma !== 'string' ||
                !formasPermitidas.includes(forma)
            ) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Forma de pagamento inválida.'
                });
            }

            // Não permitir repetir a mesma forma
            if (formasEscolhidas.includes(forma)) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Não repita a mesma forma de pagamento.'
                });
            }

            // Verificar se o valor é válido
            if (
                !Number.isFinite(valor) ||
                valor <= 0 ||
                Math.abs(valor * 100 - Math.round(valor * 100)) > 0.00001
            ) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Informe valores válidos para os pagamentos.'
                });
            }

            formasEscolhidas.push(forma);

            somaPagamentos += Math.round(valor * 100);
        }

        // Verificar se os livros e as quantidades são válidos
        const livrosEscolhidos = [];

        const itensNormalizados = [];

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

            if (
                !Number.isInteger(idLivro) || idLivro <= 0 ||
                !Number.isInteger(quantidade) ||
                quantidade <= 0 || quantidade > 100
            ) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Livro ou quantidade inválida.'
                });
            }

            // Não permitir repetir o mesmo livro no pedido
            if (livrosEscolhidos.includes(idLivro)) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Existe um livro repetido no pedido.'
                });
            }

            livrosEscolhidos.push(idLivro);

            itensNormalizados.push({
                idLivro: idLivro,
                quantidade: quantidade
            });
        }

        // Organizar os livros por ID
        itensNormalizados.sort((a, b) => a.idLivro - b.idLivro);

        // Organizar os pagamentos
        const pagamentosNormalizados = pagamentos.map(pagamento => ({
            formaPagamento: pagamento.formaPagamento,
            valorCentavos: Math.round(Number(pagamento.valor) * 100)
        }));

        pagamentosNormalizados.sort((a, b) =>
            a.formaPagamento.localeCompare(b.formaPagamento)
        );

        // Criar um resumo dos dados da compra
        const dadosCompra = {
            cpf: cliente.cpf,
            itens: itensNormalizados,
            endereco: enderecoFinal,
            cidade: cidadeFinal,
            estado: siglaEstado,
            pagamentos: pagamentosNormalizados
        };

        // Gerar o hash dos dados
        const hashIdempotencia = crypto
            .createHash('sha256')
            .update(JSON.stringify(dadosCompra))
            .digest('hex');

        // Iniciar uma conexão com o banco
        const conexao = await pool.connect();

        try {

            // Iniciar a transação
            await conexao.query('BEGIN');

            // Criar o pedido com a chave de idempotência
            const pedido = await conexao.query(
                `INSERT INTO pedido (
                    cpf_pessoa,
                    data_pedido,
                    status_pedido,
                    endereco_entrega,
                    cidade_entrega,
                    estado_entrega,
                    chave_idempotencia,
                    hash_idempotencia
                )
                VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7)
                ON CONFLICT (chave_idempotencia) DO NOTHING
                RETURNING id_pedido`,
                [
                    cliente.cpf,
                    'Concluído',
                    enderecoFinal,
                    cidadeFinal,
                    siglaEstado,
                    chaveIdempotencia,
                    hashIdempotencia
                ]
            );

            // Verificar se essa compra já foi registrada
            if (pedido.rows.length === 0) {

                const pedidoExistente = await conexao.query(
                    `SELECT
                        p.id_pedido,
                        p.cpf_pessoa,
                        p.hash_idempotencia,
                        pg.valor_total
                    FROM pedido p
                    LEFT JOIN pagamento pg
                        ON pg.id_pedido = p.id_pedido
                    WHERE p.chave_idempotencia = $1`,
                    [chaveIdempotencia]
                );

                if (pedidoExistente.rows.length === 0) {
                    throw new Error('Não foi possível verificar o pedido anterior.');
                }

                const existente = pedidoExistente.rows[0];

                // Verificar se a chave pertence à mesma compra
                if (
                    existente.cpf_pessoa !== cliente.cpf ||
                    existente.hash_idempotencia !== hashIdempotencia
                ) {

                    const erro = new Error(
                        'Essa chave já foi utilizada em outra solicitação de compra.'
                    );

                    erro.status = 409;

                    throw erro;
                }

                // Finalizar a transação sem criar outro pedido
                await conexao.query('COMMIT');

                return res.status(200).json({
                    sucesso: true,
                    repetido: true,
                    mensagem: 'Esse pedido já foi registrado anteriormente.',
                    idPedido: existente.id_pedido,
                    valorTotal: Number(existente.valor_total)
                });
            }

            const idPedido = pedido.rows[0].id_pedido;

            // Registrar os livros do pedido
            let valorTotalCentavos = 0;

            for (const item of itensNormalizados) {

                // Buscar o livro e bloquear seu registro
                const livro = await conexao.query(
                    `SELECT preco_unitario, quantidade_estoque
                     FROM livro
                     WHERE id_livro = $1
                     FOR UPDATE`,
                    [item.idLivro]
                );

                // Verificar se o livro existe
                if (livro.rows.length === 0) {

                    const erro = new Error('Livro não encontrado.');
                    erro.status = 400;

                    throw erro;
                }

                const quantidade = item.quantidade;
                const estoque = Number(livro.rows[0].quantidade_estoque);

                // Conferir a disponibilidade no estoque
                if (quantidade > estoque) {

                    const erro = new Error(
                        `Estoque insuficiente para o livro ${item.idLivro}.`
                    );

                    erro.status = 400;

                    throw erro;
                }

                const preco = Number(livro.rows[0].preco_unitario);

                if (!Number.isFinite(preco) || preco <= 0) {
                    throw new Error('Preço inválido cadastrado para um livro.');
                }

                // Calcular o subtotal em centavos
                const precoCentavos = Math.round(preco * 100);
                const subtotalCentavos = precoCentavos * quantidade;

                valorTotalCentavos += subtotalCentavos;

                // Inserir o livro no pedido
                await conexao.query(
                    `INSERT INTO item_pedido (
                        id_pedido,
                        id_livro,
                        quantidade,
                        preco_unitario
                    )
                    VALUES ($1, $2, $3, $4)`,
                    [
                        idPedido,
                        item.idLivro,
                        quantidade,
                        precoCentavos / 100
                    ]
                );

                // Atualizar o estoque
                await conexao.query(
                    `UPDATE livro
                     SET quantidade_estoque = quantidade_estoque - $1
                     WHERE id_livro = $2`,
                    [
                        quantidade,
                        item.idLivro
                    ]
                );
            }

            // Verificar se os pagamentos correspondem ao total
            if (somaPagamentos !== valorTotalCentavos) {

                const erro = new Error(
                    'A soma dos pagamentos precisa ser igual ao total da compra.'
                );

                erro.status = 400;

                throw erro;
            }

            const valorTotal = valorTotalCentavos / 100;

            // Registrar o pagamento
            await conexao.query(
                `INSERT INTO pagamento (
                    id_pedido,
                    data_pagamento,
                    valor_total
                )
                VALUES ($1, NOW(), $2)`,
                [idPedido, valorTotal]
            );

            // Registrar cada forma de pagamento escolhida
            for (const pagamento of pagamentosNormalizados) {

                // Buscar o ID da forma de pagamento
                const forma = await conexao.query(
                    `SELECT id_forma_pagamento
                     FROM forma_pagamento
                     WHERE UPPER(nome_forma_pagamento) =
                        CASE $1
                            WHEN 'CREDITO' THEN 'CRÉDITO'
                            WHEN 'DEBITO' THEN 'DÉBITO'
                            WHEN 'PIX' THEN 'PIX'
                        END`,
                    [pagamento.formaPagamento]
                );

                if (forma.rows.length === 0) {

                    const erro = new Error(
                        'Forma de pagamento não encontrada no banco de dados.'
                    );

                    erro.status = 400;

                    throw erro;
                }

                const idFormaPagamento =
                    forma.rows[0].id_forma_pagamento;

                // Registrar o valor correspondente à forma escolhida
                await conexao.query(
                    `INSERT INTO pagamento_tem_forma_pagamento (
                        pagamento_id_pedido,
                        id_forma_pagamento,
                        valor_pago
                    )
                    VALUES ($1, $2, $3)`,
                    [
                        idPedido,
                        idFormaPagamento,
                        pagamento.valorCentavos / 100
                    ]
                );
            }

            // Confirmar todas as operações no banco
            await conexao.query('COMMIT');

            res.status(201).json({
                sucesso: true,
                repetido: false,
                mensagem: 'Compra realizada com sucesso!',
                idPedido: idPedido,
                valorTotal: valorTotal
            });

        } catch (error) {

            // Cancelar as operações se algo der errado
            await conexao.query('ROLLBACK');

            throw error;

        } finally {

            // Liberar a conexão com o banco
            conexao.release();
        }

    } catch (error) {

        console.error('Erro ao criar pedido:', error);

        res.status(error.status || 500).json({
            sucesso: false,
            mensagem: error.status
                ? error.message
                : 'Erro ao realizar pedido.'
        });
    }
};


// Listar pedidos do cliente conectado
exports.listarPedidos = async (req, res) => {

    const cliente = req.session.usuario;

    try {

        // Verificar se existe alguém conectado
        if (!cliente) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Você precisa estar conectado para consultar seus pedidos.'
            });
        }

        // Verificar se o usuário possui perfil de cliente
        if (
            !Array.isArray(cliente.perfis) ||
            !cliente.perfis.includes('CLIENTE')
        ) {
            return res.status(403).json({
                sucesso: false,
                mensagem: 'Somente clientes podem consultar pedidos.'
            });
        }

        // Buscar os pedidos do cliente
        const pedidos = await pool.query(
            `SELECT
                p.id_pedido,
                p.data_pedido,
                p.status_pedido,
                pg.valor_total
            FROM pedido p
            LEFT JOIN pagamento pg
                ON pg.id_pedido = p.id_pedido
            WHERE p.cpf_pessoa = $1
            ORDER BY p.data_pedido DESC`,
            [cliente.cpf]
        );

        // Retornar os pedidos encontrados
        return res.status(200).json({
            sucesso: true,
            pedidos: pedidos.rows
        });

    } catch (error) {

        console.error('Erro ao listar pedidos:', error);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao consultar o histórico de pedidos.'
        });
    }
};


// Consultar detalhes de um pedido
exports.obterDetalhesPedido = async (req, res) => {

    const cliente = req.session.usuario;

    try {

        // Verificar se existe alguém conectado
        if (!cliente) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Você precisa estar conectado para consultar seus pedidos.'
            });
        }

        // Verificar se o usuário possui perfil de cliente
        if (
            !Array.isArray(cliente.perfis) ||
            !cliente.perfis.includes('CLIENTE')
        ) {
            return res.status(403).json({
                sucesso: false,
                mensagem: 'Somente clientes podem consultar pedidos.'
            });
        }

        // Verificar o número do pedido
        const idPedido = Number(req.params.id);

        if (!Number.isInteger(idPedido) || idPedido <= 0) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Número do pedido inválido.'
            });
        }

        // Buscar os dados principais do pedido
        const pedido = await pool.query(
            `SELECT
                p.id_pedido,
                p.data_pedido,
                p.status_pedido,
                p.endereco_entrega,
                p.cidade_entrega,
                p.estado_entrega,
                pg.valor_total
            FROM pedido p
            LEFT JOIN pagamento pg
                ON pg.id_pedido = p.id_pedido
            WHERE p.id_pedido = $1
            AND p.cpf_pessoa = $2`,
            [idPedido, cliente.cpf]
        );

        // Verificar se o pedido existe e pertence ao cliente
        if (pedido.rows.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Pedido não encontrado.'
            });
        }

        // Buscar os livros do pedido
        const itens = await pool.query(
            `SELECT
                ip.id_livro,
                l.nome_livro,
                ip.quantidade,
                ip.preco_unitario,
                (ip.quantidade * ip.preco_unitario) AS subtotal
            FROM item_pedido ip
            INNER JOIN livro l
                ON l.id_livro = ip.id_livro
            WHERE ip.id_pedido = $1
            ORDER BY l.nome_livro`,
            [idPedido]
        );

        // Buscar as formas de pagamento do pedido
        const pagamentos = await pool.query(
            `SELECT
                fp.nome_forma_pagamento,
                ptfp.valor_pago
            FROM pagamento_tem_forma_pagamento ptfp
            INNER JOIN forma_pagamento fp
                ON fp.id_forma_pagamento = ptfp.id_forma_pagamento
            WHERE ptfp.pagamento_id_pedido = $1`,
            [idPedido]
        );

        // Retornar todos os dados do pedido
        return res.status(200).json({
            sucesso: true,
            pedido: pedido.rows[0],
            itens: itens.rows,
            pagamentos: pagamentos.rows
        });

    } catch (error) {

        console.error('Erro ao consultar detalhes do pedido:', error);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao consultar os detalhes do pedido.'
        });
    }
};