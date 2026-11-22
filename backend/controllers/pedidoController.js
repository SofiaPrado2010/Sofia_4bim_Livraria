const { pool } = require('../database');
const crypto = require('crypto');

// Estados brasileiros permitidos
const estadosPermitidos = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF',
    'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
    'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RS',
    'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

// Devolver os livros ao estoque
async function devolverEstoque(conexao, idPedido) {

    await conexao.query(
        `UPDATE livro l
         SET quantidade_estoque = l.quantidade_estoque + itens.quantidade
         FROM (
             SELECT
                 id_livro,
                 SUM(quantidade) AS quantidade
             FROM item_pedido
             WHERE id_pedido = $1
             GROUP BY id_livro
         ) AS itens
         WHERE l.id_livro = itens.id_livro`,
        [idPedido]
    );
}

// Criar pedido
exports.criarPedido = async (req, res) => {

    const cliente = req.session.usuario;

    try {

        // Verificar se existe alguém conectado
        if (!cliente) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Você precisa estar conectado para realizar um pedido.'
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
            chaveIdempotencia
        } = req.body;

        // Verificar os dados do pedido
        if (
            !Array.isArray(itens) || itens.length === 0 ||
            typeof endereco !== 'string' || !endereco.trim() ||
            typeof cidade !== 'string' || !cidade.trim() ||
            typeof estado !== 'string' || !estado.trim()
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Preencha todos os dados para confirmar o pedido.'
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
                mensagem: 'Chave de identificação do pedido inválida.'
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

        // Criar um resumo dos dados do pedido
        const dadosPedido = {
            cpf: cliente.cpf,
            itens: itensNormalizados,
            endereco: enderecoFinal,
            cidade: cidadeFinal,
            estado: siglaEstado
        };

        // Gerar o hash dos dados
        const hashIdempotencia = crypto
            .createHash('sha256')
            .update(JSON.stringify(dadosPedido))
            .digest('hex');

        // Iniciar uma conexão com o banco
        const conexao = await pool.connect();

        try {

            // Iniciar a transação
            await conexao.query('BEGIN');

            // Criar o pedido com prazo de 24 horas
            const pedido = await conexao.query(
                `INSERT INTO pedido (
                    cpf_pessoa,
                    data_pedido,
                    status_pedido,
                    endereco_entrega,
                    cidade_entrega,
                    estado_entrega,
                    prazo_pagamento,
                    chave_idempotencia,
                    hash_idempotencia
                )
                VALUES (
                    $1,
                    NOW(),
                    'Pendente',
                    $2,
                    $3,
                    $4,
                    NOW() + INTERVAL '24 hours',
                    $5,
                    $6
                )
                ON CONFLICT (chave_idempotencia) DO NOTHING
                RETURNING id_pedido, prazo_pagamento`,
                [
                    cliente.cpf,
                    enderecoFinal,
                    cidadeFinal,
                    siglaEstado,
                    chaveIdempotencia,
                    hashIdempotencia
                ]
            );

            // Verificar se esse pedido já foi registrado
            if (pedido.rows.length === 0) {

                const pedidoExistente = await conexao.query(
                    `SELECT
                        p.id_pedido,
                        p.cpf_pessoa,
                        p.hash_idempotencia,
                        p.status_pedido,
                        p.prazo_pagamento,
                        COALESCE(
                            pg.valor_total,
                            (
                                SELECT COALESCE(
                                    SUM(ip.quantidade * ip.preco_unitario),
                                    0
                                )
                                FROM item_pedido ip
                                WHERE ip.id_pedido = p.id_pedido
                            )
                        ) AS valor_total
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

                // Verificar se a chave pertence ao mesmo pedido
                if (
                    existente.cpf_pessoa !== cliente.cpf ||
                    existente.hash_idempotencia !== hashIdempotencia
                ) {

                    const erro = new Error(
                        'Essa chave já foi utilizada em outra solicitação de pedido.'
                    );

                    erro.status = 409;

                    throw erro;
                }

                await conexao.query('COMMIT');

                return res.status(200).json({
                    sucesso: true,
                    repetido: true,
                    mensagem: 'Esse pedido já foi registrado anteriormente.',
                    idPedido: existente.id_pedido,
                    valorTotal: Number(existente.valor_total),
                    status: existente.status_pedido,
                    prazoPagamento: existente.prazo_pagamento
                });
            }

            const idPedido = pedido.rows[0].id_pedido;
            const prazoPagamento = pedido.rows[0].prazo_pagamento;

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

                // Reservar os livros no estoque
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

            const valorTotal = valorTotalCentavos / 100;

            // Confirmar todas as operações no banco
            await conexao.query('COMMIT');

            return res.status(201).json({
                sucesso: true,
                repetido: false,
                mensagem: 'Pedido registrado com sucesso! Você tem 24 horas para realizar o pagamento.',
                idPedido: idPedido,
                valorTotal: valorTotal,
                status: 'Pendente',
                prazoPagamento: prazoPagamento
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

        return res.status(error.status || 500).json({
            sucesso: false,
            mensagem: error.status
                ? error.message
                : 'Erro ao registrar pedido.'
        });
    }
};

// Pagar um pedido
exports.pagarPedido = async (req, res) => {

    const cliente = req.session.usuario;

    try {

        // Verificar se existe alguém conectado
        if (!cliente) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Você precisa estar conectado para pagar um pedido.'
            });
        }

        // Verificar se o usuário possui perfil de cliente
        if (
            !Array.isArray(cliente.perfis) ||
            !cliente.perfis.includes('CLIENTE')
        ) {
            return res.status(403).json({
                sucesso: false,
                mensagem: 'Somente clientes podem pagar pedidos.'
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

        const { pagamentos } = req.body;

        // Verificar os dados dos pagamentos
        if (
            !Array.isArray(pagamentos) ||
            pagamentos.length === 0 ||
            pagamentos.length > 3
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Informe de uma a três formas de pagamento.'
            });
        }

        const formasPermitidas = ['PIX', 'CREDITO', 'DEBITO'];
        const formasEscolhidas = [];
        const pagamentosNormalizados = [];

        let somaPagamentos = 0;

        // Validar cada pagamento
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
            const parcelas = pagamento.parcelas === undefined
                ? 1
                : Number(pagamento.parcelas);

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

            // Verificar a quantidade de parcelas
            if (
                !Number.isInteger(parcelas) ||
                parcelas < 1 ||
                parcelas > 12
            ) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'A quantidade de parcelas deve estar entre 1 e 12.'
                });
            }

            // Somente crédito permite parcelamento
            if (forma !== 'CREDITO' && parcelas !== 1) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Somente pagamentos com cartão de crédito podem ser parcelados.'
                });
            }

            formasEscolhidas.push(forma);

            const valorCentavos = Math.round(valor * 100);

            somaPagamentos += valorCentavos;

            pagamentosNormalizados.push({
                formaPagamento: forma,
                valorCentavos: valorCentavos,
                parcelas: parcelas
            });
        }

        // Iniciar uma conexão com o banco
        const conexao = await pool.connect();

        try {

            await conexao.query('BEGIN');

            // Buscar e bloquear o pedido
            const pedido = await conexao.query(
                `SELECT
                    id_pedido,
                    status_pedido,
                    prazo_pagamento,
                    (
                        prazo_pagamento IS NULL OR prazo_pagamento <= NOW()
                    ) AS prazo_expirado
                 FROM pedido
                 WHERE id_pedido = $1
                 AND cpf_pessoa = $2
                 FOR UPDATE`,
                [idPedido, cliente.cpf]
            );

            // Verificar se o pedido existe e pertence ao cliente
            if (pedido.rows.length === 0) {

                const erro = new Error('Pedido não encontrado.');
                erro.status = 404;

                throw erro;
            }

            const dadosPedido = pedido.rows[0];

            // Verificar se o pedido ainda está pendente
            if (dadosPedido.status_pedido !== 'Pendente') {

                const erro = new Error(
                    'Este pedido não está disponível para pagamento.'
                );

                erro.status = 409;

                throw erro;
            }

            // Verificar se o prazo de pagamento expirou
            if (dadosPedido.prazo_expirado) {

                // Cancelar o pedido e devolver o estoque
                await devolverEstoque(conexao, idPedido);

                await conexao.query(
                    `UPDATE pedido
                     SET status_pedido = 'Cancelado'
                     WHERE id_pedido = $1`,
                    [idPedido]
                );

                await conexao.query('COMMIT');

                return res.status(409).json({
                    sucesso: false,
                    mensagem: 'O prazo de pagamento deste pedido expirou. Ele foi cancelado.'
                });
            }

            // Verificar se já existe um pagamento
            const pagamentoExistente = await conexao.query(
                `SELECT id_pedido
                 FROM pagamento
                 WHERE id_pedido = $1`,
                [idPedido]
            );

            if (pagamentoExistente.rows.length > 0) {

                const erro = new Error(
                    'Este pedido já possui um pagamento registrado.'
                );

                erro.status = 409;

                throw erro;
            }

            // Calcular o valor total do pedido
            const totalPedido = await conexao.query(
                `SELECT
                    COALESCE(
                        SUM(
                            ROUND(ip.preco_unitario * 100)::BIGINT
                            * ip.quantidade
                        ),
                        0
                    ) AS total_centavos
                 FROM item_pedido ip
                 WHERE ip.id_pedido = $1`,
                [idPedido]
            );

            const valorTotalCentavos =
                Number(totalPedido.rows[0].total_centavos);

            if (valorTotalCentavos <= 0) {
                throw new Error('Não foi possível calcular o valor do pedido.');
            }

            // Verificar se os pagamentos correspondem ao total
            if (somaPagamentos !== valorTotalCentavos) {

                const erro = new Error(
                    'A soma dos pagamentos precisa ser igual ao total do pedido.'
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

            // Registrar cada forma de pagamento
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

                // Registrar o valor e a quantidade de parcelas
                await conexao.query(
                    `INSERT INTO pagamento_tem_forma_pagamento (
                        pagamento_id_pedido,
                        id_forma_pagamento,
                        valor_pago,
                        quantidade_parcelas
                    )
                    VALUES ($1, $2, $3, $4)`,
                    [
                        idPedido,
                        idFormaPagamento,
                        pagamento.valorCentavos / 100,
                        pagamento.parcelas
                    ]
                );
            }

            // Atualizar o status do pedido
            await conexao.query(
                `UPDATE pedido
                 SET status_pedido = 'Concluído'
                 WHERE id_pedido = $1`,
                [idPedido]
            );

            await conexao.query('COMMIT');

            return res.status(200).json({
                sucesso: true,
                mensagem: 'Pagamento realizado com sucesso!',
                idPedido: idPedido,
                valorTotal: valorTotal,
                status: 'Concluído'
            });

        } catch (error) {

            await conexao.query('ROLLBACK');

            throw error;

        } finally {

            conexao.release();
        }

    } catch (error) {

        console.error('Erro ao pagar pedido:', error);

        return res.status(error.status || 500).json({
            sucesso: false,
            mensagem: error.status
                ? error.message
                : 'Erro ao realizar o pagamento.'
        });
    }
};

// Cancelar um pedido
exports.cancelarPedido = async (req, res) => {

    const cliente = req.session.usuario;

    try {

        // Verificar se existe alguém conectado
        if (!cliente) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Você precisa estar conectado para cancelar um pedido.'
            });
        }

        // Verificar se o usuário possui perfil de cliente
        if (
            !Array.isArray(cliente.perfis) ||
            !cliente.perfis.includes('CLIENTE')
        ) {
            return res.status(403).json({
                sucesso: false,
                mensagem: 'Somente clientes podem cancelar pedidos.'
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

        const conexao = await pool.connect();

        try {

            await conexao.query('BEGIN');

            // Buscar e bloquear o pedido
            const pedido = await conexao.query(
                `SELECT id_pedido, status_pedido
                 FROM pedido
                 WHERE id_pedido = $1
                 AND cpf_pessoa = $2
                 FOR UPDATE`,
                [idPedido, cliente.cpf]
            );

            // Verificar se o pedido existe e pertence ao cliente
            if (pedido.rows.length === 0) {

                const erro = new Error('Pedido não encontrado.');
                erro.status = 404;

                throw erro;
            }

            // Somente pedidos pendentes podem ser cancelados
            if (pedido.rows[0].status_pedido !== 'Pendente') {

                const erro = new Error(
                    'Somente pedidos pendentes podem ser cancelados.'
                );

                erro.status = 409;

                throw erro;
            }

            // Devolver os livros ao estoque
            await devolverEstoque(conexao, idPedido);

            // Atualizar o status do pedido
            await conexao.query(
                `UPDATE pedido
                 SET status_pedido = 'Cancelado'
                 WHERE id_pedido = $1`,
                [idPedido]
            );

            await conexao.query('COMMIT');

            return res.status(200).json({
                sucesso: true,
                mensagem: 'Pedido cancelado com sucesso.',
                idPedido: idPedido,
                status: 'Cancelado'
            });

        } catch (error) {

            await conexao.query('ROLLBACK');

            throw error;

        } finally {

            conexao.release();
        }

    } catch (error) {

        console.error('Erro ao cancelar pedido:', error);

        return res.status(error.status || 500).json({
            sucesso: false,
            mensagem: error.status
                ? error.message
                : 'Erro ao cancelar pedido.'
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
                p.prazo_pagamento,
                COALESCE(
                    pg.valor_total,
                    (
                        SELECT COALESCE(
                            SUM(ip.quantidade * ip.preco_unitario),
                            0
                        )
                        FROM item_pedido ip
                        WHERE ip.id_pedido = p.id_pedido
                    )
                ) AS valor_total
            FROM pedido p
            LEFT JOIN pagamento pg
                ON pg.id_pedido = p.id_pedido
            WHERE p.cpf_pessoa = $1
            ORDER BY p.data_pedido DESC`,
            [cliente.cpf]
        );

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
                p.prazo_pagamento,
                p.endereco_entrega,
                p.cidade_entrega,
                p.estado_entrega,
                COALESCE(
                    pg.valor_total,
                    (
                        SELECT COALESCE(
                            SUM(ip.quantidade * ip.preco_unitario),
                            0
                        )
                        FROM item_pedido ip
                        WHERE ip.id_pedido = p.id_pedido
                    )
                ) AS valor_total
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
                ptfp.valor_pago,
                ptfp.quantidade_parcelas
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

// Cancelar automaticamente pedidos com prazo expirado
exports.cancelarPedidosExpirados = async () => {

    const conexao = await pool.connect();

    try {

        await conexao.query('BEGIN');

        // Buscar pedidos pendentes cujo prazo já terminou
        const pedidos = await conexao.query(
            `SELECT id_pedido
             FROM pedido
             WHERE status_pedido = 'Pendente'
             AND prazo_pagamento <= NOW()
             FOR UPDATE SKIP LOCKED`
        );

        if (pedidos.rows.length === 0) {
            await conexao.query('COMMIT');
            return 0;
        }

        const idsPedidos = pedidos.rows.map(pedido => pedido.id_pedido);

        // Devolver os livros de todos os pedidos expirados
        await conexao.query(
            `WITH itens AS (
                SELECT
                    id_livro,
                    SUM(quantidade) AS quantidade
                FROM item_pedido
                WHERE id_pedido = ANY($1::INTEGER[])
                GROUP BY id_livro
            )
            UPDATE livro l
            SET quantidade_estoque = l.quantidade_estoque + itens.quantidade
            FROM itens
            WHERE l.id_livro = itens.id_livro`,
            [idsPedidos]
        );

        // Cancelar os pedidos
        await conexao.query(
            `UPDATE pedido
             SET status_pedido = 'Cancelado'
             WHERE id_pedido = ANY($1::INTEGER[])`,
            [idsPedidos]
        );

        await conexao.query('COMMIT');

        console.log(
            `${idsPedidos.length} pedido(s) expirado(s) e cancelado(s).`
        );

        return idsPedidos.length;

    } catch (error) {

        await conexao.query('ROLLBACK');

        console.error('Erro ao cancelar pedidos expirados:', error);

        throw error;

    } finally {

        conexao.release();
    }
};