const express = require('express');
const router = express.Router();
const cargoController = require('../controllers/cargoController');
const { verificarPermissao } = require('../middlewares/verificarPermissao');

// Listar permissões disponíveis
router.get('/permissoes', verificarPermissao('cargo:gerenciar'), cargoController.listarPermissoes);
// Listar cargos
router.get('/listar', verificarPermissao('cargo:gerenciar'), cargoController.listarCargos);
// Consultar cargo por ID
router.get('/:id', verificarPermissao('cargo:gerenciar'), cargoController.obterCargo);
// Cadastrar cargo
router.post('/', verificarPermissao('cargo:gerenciar'), cargoController.criarCargo);
// Alterar cargo
router.put('/:id', verificarPermissao('cargo:gerenciar'), cargoController.atualizarCargo);
// Excluir cargo
router.delete('/:id', verificarPermissao('cargo:gerenciar'), cargoController.deletarCargo);

module.exports = router;