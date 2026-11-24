const express = require('express');
const router = express.Router();
const generoController = require('../controllers/generoController');
const { verificarPermissao } = require('../middlewares/verificarPermissao');

// Consultas públicas
router.get('/listar', generoController.listarGeneros);
router.get('/:id', generoController.obterGenero);
// Operações administrativas
router.post('/', verificarPermissao('genero:gerenciar'), generoController.criarGenero);
router.put('/:id', verificarPermissao('genero:gerenciar'), generoController.atualizarGenero);
router.delete('/:id', verificarPermissao('genero:gerenciar'), generoController.deletarGenero);

module.exports = router;