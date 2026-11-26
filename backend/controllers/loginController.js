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
// FUNÇÃO AUXILIAR: GERAR HASH
// ========================================

const gerarHash = (valor) => {
    return crypto
        .createHash('sha256')
        .update(valor)
        .digest('hex');
};

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

        const mensagemPadrao =
            'Se o e-mail estiver cadastrado, você receberá um código de recuperação.';

        if (resultado.rows.length === 0) {
            return res.json({
                sucesso: true,
                mensagem: mensagemPadrao
            });
        }

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

        const pessoa = resultado.rows[0];

        // Gera um código numérico de seis dígitos.
        const codigo = crypto.randomInt(100000, 1000000).toString();

        const codigoHash = gerarHash(codigo);

        // Salva o código e invalida qualquer token anterior.
        await query(
            `UPDATE pessoa
             SET codigo_recuperacao_hash = $1,
                 codigo_recuperacao_expira = CURRENT_TIMESTAMP + INTERVAL '15 minutes',
                 tentativas_codigo_recuperacao = 0,
                 token_recuperacao_hash = NULL,
                 token_recuperacao_expira = NULL
             WHERE cpf_pessoa = $2`,
            [codigoHash, pessoa.cpf_pessoa]
        );

        try {
            await transporter.sendMail({
                from: `"Entre Páginas" <${process.env.EMAIL_USER}>`,
                to: pessoa.email_pessoa,
                subject: 'Código de recuperação de senha | Entre Páginas',

                text: `Olá, ${pessoa.nome_pessoa}!

Você solicitou a recuperação da sua senha no Entre Páginas.

Seu código de recuperação é: ${codigo}

Esse código é válido por 15 minutos.

Se você não solicitou essa alteração, ignore este e-mail.`,

                html: `
                    <div style="font-family: Arial, sans-serif; color: #674257; padding: 20px;">
                        <h2>Recuperação de senha</h2>

                        <p>Olá, ${pessoa.nome_pessoa}!</p>

                        <p>
                            Você solicitou a recuperação da sua senha
                            no Entre Páginas.
                        </p>

                        <p>Seu código de recuperação é:</p>

                        <div style="
                            background-color: #fff0f6;
                            color: #d8538f;
                            font-size: 30px;
                            font-weight: bold;
                            letter-spacing: 8px;
                            padding: 18px;
                            text-align: center;
                            border-radius: 12px;
                        ">
                            ${codigo}
                        </div>

                        <p>Este código é válido por 15 minutos.</p>

                        <p>
                            Se você não solicitou essa alteração,
                            ignore este e-mail.
                        </p>
                    </div>
                `
            });

        } catch (erroEmail) {

            await query(
                `UPDATE pessoa
                 SET codigo_recuperacao_hash = NULL,
                     codigo_recuperacao_expira = NULL,
                     tentativas_codigo_recuperacao = 0
                 WHERE cpf_pessoa = $1
                   AND codigo_recuperacao_hash = $2`,
                [pessoa.cpf_pessoa, codigoHash]
            );

            console.error(
                'Erro ao enviar e-mail de recuperação:',
                erroEmail.message
            );

            return res.status(500).json({
                sucesso: false,
                mensagem: 'Não foi possível enviar o código de recuperação.'
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
// VERIFICAR CÓDIGO DE RECUPERAÇÃO
// ========================================

exports.verificarCodigo = async (req, res) => {
    try {
        const { email_pessoa, codigo } = req.body;

        if (
            !email_pessoa ||
            typeof email_pessoa !== 'string' ||
            !codigo ||
            typeof codigo !== 'string' ||
            !/^\d{6}$/.test(codigo)
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Informe o e-mail e o código de seis dígitos.'
            });
        }

        const resultado = await query(
            `SELECT cpf_pessoa, codigo_recuperacao_hash,
                    tentativas_codigo_recuperacao
             FROM pessoa
             WHERE LOWER(email_pessoa) = LOWER($1)
               AND codigo_recuperacao_hash IS NOT NULL
               AND codigo_recuperacao_expira > CURRENT_TIMESTAMP
               AND tentativas_codigo_recuperacao < 5`,
            [email_pessoa.trim()]
        );

        if (resultado.rows.length === 0) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Código inválido ou expirado. Solicite um novo código.'
            });
        }

        const pessoa = resultado.rows[0];
        const codigoHash = gerarHash(codigo);

        const codigoCorreto = crypto.timingSafeEqual(
            Buffer.from(codigoHash, 'hex'),
            Buffer.from(pessoa.codigo_recuperacao_hash.trim(), 'hex')
        );

        if (!codigoCorreto) {
            await query(
                `UPDATE pessoa
                 SET tentativas_codigo_recuperacao =
                     tentativas_codigo_recuperacao + 1
                 WHERE cpf_pessoa = $1`,
                [pessoa.cpf_pessoa]
            );

            return res.status(400).json({
                sucesso: false,
                mensagem: 'Código incorreto. Confira e tente novamente.'
            });
        }

        // Gera um token temporário para a etapa de redefinição.
        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = gerarHash(token);

        await query(
            `UPDATE pessoa
             SET codigo_recuperacao_hash = NULL,
                 codigo_recuperacao_expira = NULL,
                 tentativas_codigo_recuperacao = 0,
                 token_recuperacao_hash = $1,
                 token_recuperacao_expira = CURRENT_TIMESTAMP + INTERVAL '10 minutes'
             WHERE cpf_pessoa = $2
               AND codigo_recuperacao_hash = $3
               AND codigo_recuperacao_expira > CURRENT_TIMESTAMP
               AND tentativas_codigo_recuperacao < 5`,
            [tokenHash, pessoa.cpf_pessoa, pessoa.codigo_recuperacao_hash]
        );

        return res.json({
            sucesso: true,
            mensagem: 'Código confirmado! Agora você pode cadastrar uma nova senha.',
            tokenRecuperacao: token
        });

    } catch (error) {
        console.error('Erro ao verificar código:', error);

        res.status(500).json({
            sucesso: false,
            mensagem: 'Não foi possível verificar o código.'
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
                mensagem: 'Autorização inválida ou expirada. Solicite um novo código.'
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

        const tokenHash = gerarHash(token);
        const senhaHash = await bcrypt.hash(novaSenha, 10);

        const resultado = await query(
            `UPDATE pessoa
             SET senha_pessoa = $1,
                 token_recuperacao_hash = NULL,
                 token_recuperacao_expira = NULL,
                 codigo_recuperacao_hash = NULL,
                 codigo_recuperacao_expira = NULL,
                 tentativas_codigo_recuperacao = 0
             WHERE token_recuperacao_hash = $2
               AND token_recuperacao_expira > CURRENT_TIMESTAMP
             RETURNING cpf_pessoa`,
            [senhaHash, tokenHash]
        );

        if (resultado.rows.length === 0) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Autorização inválida ou expirada. Solicite um novo código.'
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