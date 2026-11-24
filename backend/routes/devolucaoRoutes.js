const express = require('express');
const router = express.Router();

const devolucaoController = require('../controllers/devolucaoController');
const { verificarPermissao } = require('../middlewares/verificarPermissao');

// LISTAR PEDIDOS DISPONÍVEIS PARA DEVOLUÇÃO
router.get('/pedidos-disponiveis', verificarPermissao('devolucao:gerenciar'), devolucaoController.listarPedidosDisponiveis);
// LISTAR LIVROS DE UM PEDIDO
router.get('/pedido/:id', verificarPermissao('devolucao:gerenciar'), devolucaoController.listarLivrosDoPedido);
// REGISTRAR DEVOLUÇÃO
router.post('/', verificarPermissao('devolucao:gerenciar'), devolucaoController.registrarDevolucao);
// LISTAR HISTÓRICO DE DEVOLUÇÕES
router.get('/', verificarPermissao('devolucao:gerenciar'), devolucaoController.listarDevolucoes);

module.exports = router;