const express = require('express');
const router = express.Router();

const pedidoController = require('../controllers/pedidoController');

// Rota para listar os pedidos do cliente
router.get('/', pedidoController.listarPedidos);

// Rota para consultar os detalhes de um pedido
router.get('/:id', pedidoController.obterDetalhesPedido);

// Rota para registrar um pedido
router.post('/', pedidoController.criarPedido);

module.exports = router;