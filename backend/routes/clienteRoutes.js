const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/clienteController');
const { verificarPermissao } = require('../middlewares/verificarPermissao');

// Consultar uma pessoa pelo CPF
router.get('/pessoa/:cpf', verificarPermissao('cliente:gerenciar'), clienteController.obterPessoa);
// Listar clientes
router.get('/', verificarPermissao('cliente:gerenciar'), clienteController.listarClientes);
// Cadastrar cliente
router.post('/', verificarPermissao('cliente:gerenciar'), clienteController.criarCliente);
// Consultar cliente
router.get('/:id', verificarPermissao('cliente:gerenciar'), clienteController.obterCliente);
// Alterar cliente
router.put('/:id', verificarPermissao('cliente:gerenciar'), clienteController.atualizarCliente);
// Excluir cliente
router.delete('/:id', verificarPermissao('cliente:gerenciar'), clienteController.deletarCliente);

module.exports = router;