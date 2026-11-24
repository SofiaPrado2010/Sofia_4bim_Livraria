const express = require('express');
const router = express.Router();
const pessoaController = require('../controllers/pessoaController');
const { verificarPermissao } = require('../middlewares/verificarPermissao');

// Rotas administrativas
router.get('/abrirCrudPessoa', verificarPermissao('pessoa:consultar'), pessoaController.abrirCrudPessoa);
router.get('/', verificarPermissao('pessoa:consultar'), pessoaController.listarPessoas);
router.post('/', verificarPermissao('pessoa:gerenciar'), pessoaController.criarPessoa);
router.get('/:id', verificarPermissao('pessoa:consultar'),pessoaController.obterPessoa);
router.put('/:id', verificarPermissao('pessoa:gerenciar'), pessoaController.atualizarPessoa);
router.delete('/:id', verificarPermissao('pessoa:gerenciar'), pessoaController.deletarPessoa);
// Cadastro público de clientes
router.post('/cadastroCliente', pessoaController.cadastrarCliente);
// Informações da própria conta
router.get('/minhasInformacoes', pessoaController.minhasInformacoes);
router.put('/minhasInformacoes', pessoaController.atualizarMinhasInformacoes);

module.exports = router;