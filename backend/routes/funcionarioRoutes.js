const express = require('express');
const router = express.Router();
const funcionarioController = require('./../controllers/funcionarioController');

// CRUD de Funcionários

router.get('/abrirCrudFuncionario', funcionarioController.abrirCrudFuncionario);

// Consultar uma pessoa pelo CPF, mesmo que ainda não seja funcionário
router.get('/pessoa/:cpf', funcionarioController.obterPessoa);

// Listar funcionários
router.get('/', funcionarioController.listarFuncionarios);

// Cadastrar funcionário
router.post('/', funcionarioController.criarFuncionario);

// Consultar, alterar e excluir funcionário
router.get('/:id', funcionarioController.obterFuncionario);
router.put('/:id', funcionarioController.atualizarFuncionario);
router.delete('/:id', funcionarioController.deletarFuncionario);

module.exports = router;