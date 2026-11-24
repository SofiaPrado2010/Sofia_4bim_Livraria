const express = require('express');
const router = express.Router();

const estoqueController = require('../controllers/estoqueController');
const { verificarPermissao } = require('../middlewares/verificarPermissao');

// LISTAR HISTÓRICO DE MOVIMENTAÇÕES
router.get(
    '/movimentacoes',
    verificarPermissao('estoque:alterar'),
    estoqueController.listarMovimentacoes
);

// REGISTRAR ENTRADA DE LIVROS
router.post(
    '/entrada',
    verificarPermissao('estoque:alterar'),
    estoqueController.registrarEntrada
);

// REGISTRAR SAÍDA MANUAL DE LIVROS
router.post(
    '/saida',
    verificarPermissao('estoque:alterar'),
    estoqueController.registrarSaida
);

module.exports = router;