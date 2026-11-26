const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const session = require('express-session');

// Importa a função de consulta do banco
const { query } = require('./database');

// Importa as rotas
const cargoRoutes = require('./routes/cargoRoutes');
const generoRoutes = require('./routes/generoRoutes');
const livroRoutes = require('./routes/livroRoutes');
const pessoaRoutes = require('./routes/pessoaRoutes');
const clienteRoutes = require('./routes/clienteRoutes');
const funcionarioRoutes = require('./routes/funcionarioRoutes');
const forma_pagamentoRoutes = require('./routes/forma_pagamentoRoutes');
const loginRoutes = require('./routes/loginRoutes');
const pedidoRoutes = require('./routes/pedidoRoutes');
const estoqueRoutes = require('./routes/estoqueRoutes');
const devolucaoRoutes = require('./routes/devolucaoRoutes');

// Importa o controller de pedidos
const pedidoController = require('./controllers/pedidoController');
const app = express();

// Configuração do CORS
app.use(cors({
    origin: 'http://127.0.0.1:5500',
    credentials: true
}));

app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        maxAge: 1000 * 60 * 60
    }
}));

// Servir imagens estáticas
app.use('/imagens', express.static(path.join(__dirname, '../imagens')));
app.use('/fundos', express.static(path.join(__dirname, '../fundos')));

// Definir rotas
app.use('/cargo', cargoRoutes);
app.use('/genero', generoRoutes);
app.use('/livro', livroRoutes);
app.use('/pessoa', pessoaRoutes);
app.use('/cliente', clienteRoutes);
app.use('/funcionario', funcionarioRoutes);
app.use('/forma_pagamento', forma_pagamentoRoutes);
app.use('/login', loginRoutes);
app.use('/pedido', pedidoRoutes);
app.use('/estoque', estoqueRoutes);
app.use('/devolucao', devolucaoRoutes);

const PORT = process.env.PORT || 3001;

// Inicializa o servidor e testa o PostgreSQL
app.listen(PORT, '127.0.0.1', async () => {
    console.log(`\n=================================`);
    console.log(`🚀 Servidor executando na porta ${PORT}`);

    try {
        await query('SELECT 1');
        console.log(`✅ Banco de Dados conectado com sucesso!`);

        // Verificar pedidos expirados ao iniciar o servidor
        pedidoController.cancelarPedidosExpirados()
            .catch(error => {
                console.error('Erro na verificação inicial dos pedidos:', error);
            });

        // Verificar pedidos expirados a cada minuto
        setInterval(() => {

            pedidoController.cancelarPedidosExpirados()
                .catch(error => {
                    console.error('Erro na verificação dos pedidos expirados:', error);
                });

        }, 60 * 1000);

        console.log('⏰ Verificação automática de pedidos ativada!');

    } catch (error) {
        console.error(`❌ FALHA NA CONEXÃO COM O BANCO DE DADOS:`);
        console.error(`   Motivo: ${error.message}`);
        console.error(`👉 Ajuste o arquivo .env com a senha correta do seu PostgreSQL.`);
    }

    console.log(`=================================\n`);
});