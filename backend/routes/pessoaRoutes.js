const express = require('express');
const router = express.Router();
const pessoaController = require('../controllers/pessoaController');

// CRUD de Pessoas

router.get('/abrirCrudPessoa', pessoaController.abrirCrudPessoa);
router.get('/', pessoaController.listarPessoas);

router.post('/', pessoaController.criarPessoa);
router.post('/cadastroCliente', pessoaController.cadastrarCliente);

// Informações da pessoa conectada
router.get('/minhasInformacoes', pessoaController.minhasInformacoes);
router.put('/minhasInformacoes', pessoaController.atualizarMinhasInformacoes);

// Rotas que utilizam parâmetros devem ficar depois
router.get('/:id', pessoaController.obterPessoa);
router.put('/:id', pessoaController.atualizarPessoa);
router.delete('/:id', pessoaController.deletarPessoa);

module.exports = router;