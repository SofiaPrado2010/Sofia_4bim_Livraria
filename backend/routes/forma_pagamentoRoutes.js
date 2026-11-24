const express = require('express');
const router = express.Router();
const forma_pagamentoController = require('../controllers/forma_pagamentoController');
const { verificarPermissao } = require('../middlewares/verificarPermissao');

// Consulta pública: utilizada pelos clientes no pagamento
router.get('/ativas', forma_pagamentoController.listarFormasAtivas);
// Consultas administrativas
router.get('/listar', verificarPermissao('forma_pagamento:gerenciar'), forma_pagamentoController.listarForma_pagamento);
router.get('/:id', verificarPermissao('forma_pagamento:gerenciar'), forma_pagamentoController.obterForma_pagamento);
// Cadastro e alteração
router.post('/', verificarPermissao('forma_pagamento:gerenciar'), forma_pagamentoController.criarForma_pagamento);
router.put('/:id', verificarPermissao('forma_pagamento:gerenciar'), forma_pagamentoController.atualizarForma_pagamento);
// Ativação e desativação
router.put('/:id/desativar', verificarPermissao('forma_pagamento:gerenciar'), forma_pagamentoController.desativarForma_pagamento);
router.put('/:id/reativar', verificarPermissao('forma_pagamento:gerenciar'), forma_pagamentoController.reativarForma_pagamento);
// Exclusão
router.delete('/:id', verificarPermissao('forma_pagamento:gerenciar'), forma_pagamentoController.deletarForma_pagamento);

module.exports = router;