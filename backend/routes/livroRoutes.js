const express = require('express');
const multer = require('multer');
const router = express.Router();

const livroController = require('../controllers/livroController');
const { verificarPermissao } = require('../middlewares/verificarPermissao');

// Configuração do Multer
const upload = multer({
    storage: multer.memoryStorage()
});

// Rotas de consulta dos livros
// Permanecem disponíveis para os clientes e funcionários
router.get('/listar', livroController.listarLivros);
router.get('/:id', livroController.obterLivro);

// Rotas de gerenciamento de livros
// Somente funcionários com permissão podem executar
router.post(
    '/',
    verificarPermissao('livro:gerenciar'),
    livroController.criarLivro
);

router.put(
    '/:id',
    verificarPermissao('livro:gerenciar'),
    livroController.atualizarLivro
);

router.delete(
    '/:id',
    verificarPermissao('livro:gerenciar'),
    livroController.deletarLivro
);

// Rota para upload da imagem
router.post(
    '/upload/:id',
    verificarPermissao('livro:gerenciar'),
    upload.single('imagem'),
    livroController.uploadImagem
);

module.exports = router;