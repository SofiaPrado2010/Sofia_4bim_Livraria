const express = require('express');
const router = express.Router();

const pedidoController = require('../controllers/pedidoController');
const pedidoAdminController = require('../controllers/pedidoAdminController');

const { verificarPermissao } = require('../middlewares/verificarPermissao');

// ========================================
// ROTAS ADMINISTRATIVAS
// ========================================

// Listar todos os pedidos
router.get(
    '/admin',
    verificarPermissao('pedido:visualizar'),
    pedidoAdminController.listarPedidosAdmin
);

// Consultar detalhes de qualquer pedido
router.get(
    '/admin/:id',
    verificarPermissao('pedido:visualizar'),
    pedidoAdminController.obterDetalhesPedidoAdmin
);


// ========================================
// ROTAS DOS CLIENTES
// ========================================

// Listar os pedidos do cliente
router.get('/', pedidoController.listarPedidos);

// Consultar detalhes de um pedido
router.get('/:id', pedidoController.obterDetalhesPedido);

// Registrar um pedido
router.post('/', pedidoController.criarPedido);

// Pagar um pedido
router.post('/:id/pagar', pedidoController.pagarPedido);

// Cancelar um pedido
router.patch('/:id/cancelar', pedidoController.cancelarPedido);

module.exports = router;