const { query } = require('../database');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Listar todos os livros
exports.listarLivros = async (req, res) => {
    try {
        const result = await query(
            'SELECT * FROM livro ORDER BY id_livro'
        );

        res.json({ sucesso: true, livros: result.rows });

    } catch (error) {
        console.error('Erro ao listar livros:', error);
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao listar livros.'
        });
    }
};

// Obter livro por ID
exports.obterLivro = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);

        if (isNaN(id)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'ID inválido.'
            });
        }

        const result = await query(
            'SELECT * FROM livro WHERE id_livro = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Livro não encontrado.'
            });
        }

        res.json({ sucesso: true, livro: result.rows[0] });

    } catch (error) {
        console.error('Erro ao obter livro:', error);
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao buscar livro.'
        });
    }
};

// Criar livro
exports.criarLivro = async (req, res) => {
    try {
        const {
            id_livro,
            nome_livro,
            autor,
            preco_unitario,
            numero_paginas,
            id_genero,
            quantidade_estoque,
            tipo_capa
        } = req.body;

        if (!id_livro || !nome_livro) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'ID e nome do livro são obrigatórios.'
            });
        }

        const sql = `
            INSERT INTO livro (
                id_livro,
                nome_livro,
                autor,
                preco_unitario,
                numero_paginas,
                id_genero,
                quantidade_estoque,
                tipo_capa
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;

        const values = [
            id_livro,
            nome_livro,
            autor,
            preco_unitario,
            numero_paginas,
            id_genero,
            quantidade_estoque,
            tipo_capa
        ];

        const result = await query(sql, values);

        res.status(201).json({
            sucesso: true,
            mensagem: 'Livro cadastrado com sucesso!',
            livro: result.rows[0]
        });

    } catch (error) {
        console.error('Erro ao criar livro:', error);

        if (error.code === '23503') {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'O gênero informado não existe.'
            });
        }

        if (error.code === '23505') {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Já existe um livro com esse ID.'
            });
        }

        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao cadastrar livro.'
        });
    }
};

// Atualizar livro
exports.atualizarLivro = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);

        if (isNaN(id)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'ID inválido.'
            });
        }

        const {
            nome_livro,
            autor,
            preco_unitario,
            numero_paginas,
            id_genero,
            quantidade_estoque,
            tipo_capa
        } = req.body;

        const sql = `
            UPDATE livro
            SET nome_livro = $1,
                autor = $2,
                preco_unitario = $3,
                numero_paginas = $4,
                id_genero = $5,
                quantidade_estoque = $6,
                tipo_capa = $7
            WHERE id_livro = $8
            RETURNING *
        `;

        const values = [
            nome_livro,
            autor,
            preco_unitario,
            numero_paginas,
            id_genero,
            quantidade_estoque,
            tipo_capa,
            id
        ];

        const result = await query(sql, values);

        if (result.rows.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Livro não encontrado.'
            });
        }

        res.json({
            sucesso: true,
            mensagem: 'Livro atualizado com sucesso!',
            livro: result.rows[0]
        });

    } catch (error) {
        console.error('Erro ao atualizar livro:', error);

        if (error.code === '23503') {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'O gênero informado não existe.'
            });
        }

        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao atualizar livro.'
        });
    }
};

// Upload e salvamento da imagem
exports.uploadImagem = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);

        if (isNaN(id)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'ID inválido.'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Nenhuma imagem foi enviada.'
            });
        }

        const livro = await query(
            'SELECT * FROM livro WHERE id_livro = $1',
            [id]
        );

        if (livro.rows.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Livro não encontrado.'
            });
        }

        const pastaImagens = path.join(__dirname, '../../imagens');

        if (!fs.existsSync(pastaImagens)) {
            fs.mkdirSync(pastaImagens, { recursive: true });
        }

        const caminhoDestino = path.join(pastaImagens, `${id}.png`);

        await sharp(req.file.buffer)
            .resize(300, 300, { fit: 'cover' })
            .toFormat('png')
            .toFile(caminhoDestino);

        res.json({
            sucesso: true,
            mensagem: 'Imagem salva com sucesso!'
        });

    } catch (error) {
        console.error('Erro ao salvar imagem:', error);
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao processar imagem.'
        });
    }
};

// Deletar livro
exports.deletarLivro = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);

        if (isNaN(id)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'ID inválido.'
            });
        }

        const result = await query(
            'DELETE FROM livro WHERE id_livro = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Livro não encontrado.'
            });
        }

        const imgPath = path.join(__dirname, '../../imagens', `${id}.png`);

        if (fs.existsSync(imgPath)) {
            fs.unlinkSync(imgPath);
        }

        res.json({
            sucesso: true,
            mensagem: 'Livro excluído com sucesso!'
        });

    } catch (error) {
        console.error('Erro ao deletar livro:', error);

        if (error.code === '23503') {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Não é possível excluir este livro porque ele está associado a pedidos ou devoluções.'
            });
        }

        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao excluir livro.'
        });
    }
};