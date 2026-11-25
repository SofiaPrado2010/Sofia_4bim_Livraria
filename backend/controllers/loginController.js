const { query } = require('../database');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const permissaoController = require('../middlewares/verificarPermissao');

// ========================================
// CONFIGURAÇÃO DO ENVIO DE E-MAILS
// ========================================

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT) || 465,
    secure: process.env.EMAIL_SECURE !== 'false',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
    }
});

// ========================================
// REALIZAR LOGIN
// ========================================

exports.realizarLogin = async (req, res) => {
    try {
        const { usuario_pessoa, senha_pessoa } = req.body;

        if (!usuario_pessoa || !senha_pessoa) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Informe o usuário e a senha.'
            });
        }

        const resultado = await query(
            `SELECT cpf_pessoa, nome_pessoa, usuario_pessoa, senha_pessoa
             FROM pessoa
             WHERE usuario_pessoa = $1`,
            [usuario_pessoa]
        );

        if (resultado.rows.length === 0) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Usuário ou senha incorretos.'
            });
        }

        const pessoa = resultado.rows[0];

        const senhaCorreta = await bcrypt.compare(
            senha_pessoa,
            pessoa.senha_pessoa
        );

        if (!senhaCorreta) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Usuário ou senha incorretos.'
            });
        }

        const cliente = await query(
            `SELECT cpf_cliente
             FROM cliente
             WHERE cpf_cliente = $1`,
            [pessoa.cpf_pessoa]
        );

        const funcionario = await query(
            `SELECT cargo.nome_cargo
             FROM funcionario
             INNER JOIN cargo
             ON funcionario.id_cargo = cargo.id_cargo
             WHERE funcionario.cpf_funcionario = $1`,
            [pessoa.cpf_pessoa]
        );

        const perfis = [];

        if (cliente.rows.length > 0) {
            perfis.push('CLIENTE');
        }

        if (funcionario.rows.length > 0) {
            perfis.push('FUNCIONARIO');
        }

        req.session.usuario = {
            cpf: pessoa.cpf_pessoa,
            nome: pessoa.nome_pessoa,
            perfis: perfis,
            cargo: funcionario.rows.length > 0
                ? funcionario.rows[0].nome_cargo
                : null
        };

        res.json({
            sucesso: true,
            mensagem: 'Login realizado com sucesso!',
            usuario: {
                nome: pessoa.nome_pessoa,
                perfis: perfis,
                cargo: funcionario.rows.length > 0
                    ? funcionario.rows[0].nome_cargo
                    : null
            }
        });

    } catch (error) {
        console.error('Erro ao realizar login:', error);

        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro interno ao realizar login.'
        });
    }
};

// ========================================
// VERIFICAR SESSÃO
// ========================================

exports.verificarSessao = async (req, res) => {
    try {
        if (!req.session.usuario) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Nenhum usuário está conectado.'
            });
        }

        const usuario = req.session.usuario;

        const permissoes = usuario.perfis.includes('FUNCIONARIO')
            ? await permissaoController.obterPermissoes(usuario.cargo)
            : [];

        res.json({
            sucesso: true,
            usuario: {
                nome: usuario.nome,
                cpf: usuario.cpf,
                perfis: usuario.perfis,
                cargo: usuario.cargo,
                permissoes: permissoes
            }
        });

    } catch (error) {
        console.error('Erro ao verificar sessão:', error);

        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao verificar sessão.'
        });
    }
};

// ========================================
// SAIR DA CONTA
// ========================================

exports.sair = (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            return res.status(500).json({
                sucesso: false,
                mensagem: 'Erro ao sair da conta.'
            });
        }

        res.clearCookie('connect.sid');

        res.json({
            sucesso: true,
            mensagem: 'Logout realizado com sucesso!'
        });
    });
};

// ========================================
// SOLICITAR RECUPERAÇÃO DE SENHA
// ========================================

exports.solicitarRecuperacao = async (req, res) => {
    try {
        const { email_pessoa } = req.body;

        if (
            !email_pessoa ||
            typeof email_pessoa !== 'string' ||
            email_pessoa.length > 75 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email_pessoa.trim())
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Informe um endereço de e-mail válido.'
            });
        }

        const email = email_pessoa.trim();

        const resultado = await query(
            `SELECT cpf_pessoa, nome_pessoa, email_pessoa
             FROM pessoa
             WHERE LOWER(email_pessoa) = LOWER($1)`,
            [email]
        );

        // Resposta igual para e-mails cadastrados ou não cadastrados.
        const mensagemPadrao =
            'Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.';

        if (resultado.rows.length === 0) {
            return res.json({
                sucesso: true,
                mensagem: mensagemPadrao
            });
        }

        const pessoa = resultado.rows[0];

        // Verifica se as configurações de e-mail existem.
        if (
            !process.env.EMAIL_USER ||
            !process.env.EMAIL_APP_PASSWORD
        ) {
            console.error('Configurações de e-mail não encontradas no .env.');

            return res.status(500).json({
                sucesso: false,
                mensagem: 'O envio de e-mails está temporariamente indisponível.'
            });
        }

        // Gera um token aleatório.
        const token = crypto.randomBytes(32).toString('hex');

        // Armazena somente o hash do token.
        const tokenHash = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        // Define a validade de 15 minutos.
        await query(
            `UPDATE pessoa
             SET token_recuperacao_hash = $1,
                 token_recuperacao_expira = CURRENT_TIMESTAMP + INTERVAL '15 minutes'
             WHERE cpf_pessoa = $2`,
            [tokenHash, pessoa.cpf_pessoa]
        );

        // Monta o link de recuperação.
        const urlFrontend = (
            process.env.URL_FRONTEND ||
            'http://127.0.0.1:5500'
        ).replace(/\/+$/, '');

        const linkRecuperacao =
            `${urlFrontend}/visaoCliente/login/redefinirSenha.html?token=${token}`;

        try {
            await transporter.sendMail({
                from: `"Entre Páginas" <${process.env.EMAIL_USER}>`,
                to: pessoa.email_pessoa,
                subject: 'Recuperação de senha | Entre Páginas',

                text: `Olá, ${pessoa.nome_pessoa}!
                Você solicitou a recuperação da sua senha no Entre Páginas.
                Acesse o link abaixo para cadastrar uma nova senha:
                ${linkRecuperacao}
                Este link é válido por 15 minutos.
                Se você não solicitou essa alteração, ignore este e-mail.`,

                html: `
                    <div style="font-family: Arial, sans-serif; color: #674257; padding: 20px;">
                        <h2>Recuperação de senha</h2>

                        <p>Olá, ${pessoa.nome_pessoa}!</p>

                        <p>
                            Você solicitou a recuperação da sua senha
                            no Entre Páginas.
                        </p>

                        <p>
                            Clique no botão abaixo para cadastrar uma nova senha:
                        </p>

                        <p>
                            <a href="${linkRecuperacao}"
                               style="
                                   background-color: #d8538f;
                                   color: white;
                                   padding: 12px 20px;
                                   text-decoration: none;
                                   border-radius: 20px;
                                   display: inline-block;
                               ">
                                Redefinir minha senha
                            </a>
                        </p>

                        <p>Este link é válido por 15 minutos.</p>

                        <p>
                            Se você não solicitou essa alteração,
                            ignore este e-mail.
                        </p>
                    </div>
                `
            });

        } catch (erroEmail) {

            // Invalida o token caso o envio falhe.
            await query(
                `UPDATE pessoa
                 SET token_recuperacao_hash = NULL,
                     token_recuperacao_expira = NULL
                 WHERE cpf_pessoa = $1
                   AND token_recuperacao_hash = $2`,
                [pessoa.cpf_pessoa, tokenHash]
            );

            console.error(
                'Erro ao enviar e-mail de recuperação:',
                erroEmail.message
            );

            return res.status(500).json({
                sucesso: false,
                mensagem: 'Não foi possível enviar o e-mail de recuperação. Verifique a configuração do serviço de e-mail.'
            });
        }

        return res.json({
            sucesso: true,
            mensagem: mensagemPadrao
        });

    } catch (error) {
        console.error('Erro ao solicitar recuperação de senha:', error);

        res.status(500).json({
            sucesso: false,
            mensagem: 'Não foi possível solicitar a recuperação de senha.'
        });
    }
};

// ========================================
// REDEFINIR SENHA
// ========================================

exports.redefinirSenha = async (req, res) => {
    try {
        const { token, novaSenha } = req.body;

        if (
            !token ||
            typeof token !== 'string' ||
            !/^[a-f0-9]{64}$/.test(token)
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Link de recuperação inválido ou expirado.'
            });
        }

        if (
            !novaSenha ||
            typeof novaSenha !== 'string' ||
            novaSenha.length < 8 ||
            novaSenha.length > 72
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'A senha deve possuir entre 8 e 72 caracteres.'
            });
        }

        const tokenHash = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        const senhaHash = await bcrypt.hash(novaSenha, 10);

        // Atualiza a senha somente se o token for válido e não expirado.
        // O token é apagado no mesmo comando para impedir reutilização.
        const resultado = await query(
            `UPDATE pessoa
             SET senha_pessoa = $1,
                 token_recuperacao_hash = NULL,
                 token_recuperacao_expira = NULL
             WHERE token_recuperacao_hash = $2
               AND token_recuperacao_expira > CURRENT_TIMESTAMP
             RETURNING cpf_pessoa`,
            [senhaHash, tokenHash]
        );

        if (resultado.rows.length === 0) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Link de recuperação inválido ou expirado.'
            });
        }

        res.json({
            sucesso: true,
            mensagem: 'Senha redefinida com sucesso! Você já pode entrar na sua conta.'
        });

    } catch (error) {
        console.error('Erro ao redefinir senha:', error);

        res.status(500).json({
            sucesso: false,
            mensagem: 'Não foi possível redefinir sua senha.'
        });
    }
};