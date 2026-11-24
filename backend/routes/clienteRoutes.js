const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/clienteController');

// Consultar uma pessoa pelo CPF
router.get('/pessoa/:cpf', clienteController.obterPessoa);

// Listar clientes
router.get('/', clienteController.listarClientes);

// Cadastrar cliente
router.post('/', clienteController.criarCliente);

// Consultar, alterar e excluir cliente
router.get('/:id', clienteController.obterCliente);
router.put('/:id', clienteController.atualizarCliente);
router.delete('/:id', clienteController.deletarCliente);

module.exports = router;