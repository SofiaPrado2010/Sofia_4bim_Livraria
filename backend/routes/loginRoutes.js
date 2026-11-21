
const express = require('express');
const router = express.Router();

const loginController = require('../controllers/loginController');

// Login e sessão
router.post('/', loginController.realizarLogin);
router.get('/sessao', loginController.verificarSessao);
router.post('/sair', loginController.sair);

// Recuperação de senha
router.post('/recuperar-senha', loginController.solicitarRecuperacao);
router.post('/redefinir-senha', loginController.redefinirSenha);

module.exports = router;