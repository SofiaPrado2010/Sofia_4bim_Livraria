const express = require('express');
const router = express.Router();
const funcionarioController = require('./../controllers/funcionarioController');
const { verificarPermissao } = require('../middlewares/verificarPermissao');

// Todas as operações administrativas exigem permissão para gerenciar funcionários

router.get('/abrirCrudFuncionario', verificarPermissao('funcionario:gerenciar'), funcionarioController.abrirCrudFuncionario);
router.get('/pessoa/:cpf', verificarPermissao('funcionario:gerenciar'), funcionarioController.obterPessoa);
router.get('/', verificarPermissao('funcionario:gerenciar'), funcionarioController.listarFuncionarios);
router.post('/', verificarPermissao('funcionario:gerenciar'), funcionarioController.criarFuncionario);
router.get('/:id', verificarPermissao('funcionario:gerenciar'), funcionarioController.obterFuncionario);
router.put('/:id', verificarPermissao('funcionario:gerenciar'), funcionarioController.atualizarFuncionario);
router.delete('/:id', verificarPermissao('funcionario:gerenciar'), funcionarioController.deletarFuncionario);

module.exports = router;