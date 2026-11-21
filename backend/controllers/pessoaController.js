const { query, pool } = require('../database');
const bcrypt = require('bcrypt');
const path = require('path');

exports.abrirCrudPessoa = (req, res) => {
  const usuario = req.cookies ? req.cookies.usuarioLogado : null;
  if (usuario) {
    res.sendFile(path.join(__dirname, '../../frontend/pessoa/pessoa.html'));
  } else {
    res.redirect('/login');
  }
};

exports.listarPessoas = async (req, res) => {
  try {
    const result = await query('SELECT * FROM pessoa ORDER BY cpf_pessoa');
    res.json({ sucesso: true, pessoas: result.rows });
  } catch (error) {
    console.error('Erro ao listar pessoas:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor' });
  }
};

exports.criarPessoa = async (req, res) => {
  try {
    const { cpf_pessoa, nome_pessoa, data_nascimento_pessoa, cidade_pessoa, estado_pessoa, endereco_pessoa, senha_pessoa, email_pessoa } = req.body;

    if (!nome_pessoa || !cidade_pessoa || !estado_pessoa || !endereco_pessoa || !senha_pessoa || !email_pessoa) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Nome, email, endereço e senha são obrigatórios'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email_pessoa)) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Formato de email inválido'
      });
    }

    const result = await query(
      'INSERT INTO PESSOA (cpf_pessoa, nome_pessoa, data_nascimento_pessoa, cidade_pessoa, estado_pessoa, endereco_pessoa, senha_pessoa, email_pessoa) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [cpf_pessoa, nome_pessoa, data_nascimento_pessoa, cidade_pessoa, estado_pessoa, endereco_pessoa, senha_pessoa, email_pessoa]
    );

    res.status(201).json({ sucesso: true, pessoa: result.rows[0] });
  } catch (error) {
    console.error('Erro ao criar pessoa:', error);

    if (error.code === '23505' && error.constraint === 'pessoa_unique') {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Email já está em uso'
      });
    }

    if (error.code === '23502') {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Dados obrigatórios não fornecidos'
      });
    }

    res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor' });
  }
};

exports.obterPessoa = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ sucesso: false, mensagem: 'CPF deve ser um número válido' });
    }

    const result = await query(
      'SELECT * FROM pessoa WHERE cpf_pessoa = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ sucesso: false, mensagem: 'Pessoa não encontrada' });
    }

    res.json({ sucesso: true, pessoa: result.rows[0] });
  } catch (error) {
    console.error('Erro ao obter pessoa:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor' });
  }
};

exports.atualizarPessoa = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { nome_pessoa, data_nascimento_pessoa, cidade_pessoa, estado_pessoa, endereco_pessoa, senha_pessoa, email_pessoa } = req.body;

    if (email_pessoa) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email_pessoa)) {
        return res.status(400).json({
          sucesso: false,
          mensagem: 'Formato de email inválido'
        });
      }
    }

    const existingPersonResult = await query(
      'SELECT * FROM pessoa WHERE cpf_pessoa = $1',
      [id]
    );

    if (existingPersonResult.rows.length === 0) {
      return res.status(404).json({ sucesso: false, mensagem: 'Pessoa não encontrada' });
    }

    const currentPerson = existingPersonResult.rows[0];
    const updatedFields = {
      nome_pessoa: nome_pessoa !== undefined ? nome_pessoa : currentPerson.nome_pessoa,
      data_nascimento_pessoa: data_nascimento_pessoa !== undefined ? data_nascimento_pessoa : currentPerson.data_nascimento_pessoa,
      cidade_pessoa: cidade_pessoa !== undefined? cidade_pessoa : currentPerson.cidade_pessoa,
      estado_pessoa: estado_pessoa !== undefined? estado_pessoa: currentPerson.estado_pessoa,
      endereco_pessoa: endereco_pessoa !== undefined ? endereco_pessoa : currentPerson.endereco_pessoa,
      senha_pessoa: senha_pessoa !== undefined ? senha_pessoa : currentPerson.senha_pessoa,
      email_pessoa: email_pessoa !== undefined ? email_pessoa : currentPerson.email_pessoa
    };

    const updateResult = await query(
      'UPDATE pessoa SET nome_pessoa = $1, data_nascimento_pessoa = $2, cidade_pessoa = $3, estado_pessoa = $4, endereco_pessoa = $5, senha_pessoa = $6, email_pessoa = $7 WHERE cpf_pessoa = $8 RETURNING *',
      [updatedFields.nome_pessoa, updatedFields.data_nascimento_pessoa, updatedFields.cidade_pessoa, updatedFields.estado_pessoa, updatedFields.endereco_pessoa, updatedFields.senha_pessoa, updatedFields.email_pessoa, id]
    );

    res.json({ sucesso: true, pessoa: updateResult.rows[0] });
  } catch (error) {
    console.error('Erro ao atualizar pessoa:', error);

    if (error.code === '23505' && error.constraint === 'pessoa_unique') {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Email já está em uso por outra pessoa'
      });
    }

    res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor' });
  }
};

exports.deletarPessoa = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const existingPersonResult = await query(
      'SELECT * FROM pessoas WHERE cpf_pessoa = $1',
      [id]
    );

    if (existingPersonResult.rows.length === 0) {
      return res.status(404).json({ sucesso: false, mensagem: 'Pessoa não encontrada' });
    }

    await query(
      'DELETE FROM pessoas WHERE cpf_pessoa = $1',
      [id]
    );

    res.json({ sucesso: true, mensagem: 'Pessoa excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar pessoa:', error);

    if (error.code === '23503') {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Não é possível deletar pessoa com dependências associadas'
      });
    }

    res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor' });
  }
};

exports.obterPessoaPorEmail = async (req, res) => {
  try {
    const { email_pessoa } = req.params;

    if (!email_pessoa) {
      return res.status(400).json({ sucesso: false, mensagem: 'Email é obrigatório' });
    }

    const result = await query(
      'SELECT * FROM pessoas WHERE email_pessoa = $1',
      [email_pessoa]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ sucesso: false, mensagem: 'Pessoa não encontrada' });
    }

    res.json({ sucesso: true, pessoa: result.rows[0] });
  } catch (error) {
    console.error('Erro ao obter pessoa por email:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor' });
  }
};

exports.atualizarSenha = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { senha_atual, nova_senha } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({ sucesso: false, mensagem: 'ID deve ser um número válido' });
    }

    if (!senha_atual || !nova_senha) {
      return res.status(400).json({ sucesso: false, mensagem: 'Senha atual e nova senha são obrigatórias' });
    }

    const personResult = await query(
      'SELECT * FROM pessoa WHERE cpf_pessoa = $1',
      [id]
    );

    if (personResult.rows.length === 0) {
      return res.status(404).json({ sucesso: false, mensagem: 'Pessoa não encontrada' });
    }

    const person = personResult.rows[0];

    if (person.senha_pessoa !== senha_atual) {
      return res.status(400).json({ sucesso: false, mensagem: 'Senha atual incorreta' });
    }

    const updateResult = await query(
      'UPDATE pessoa SET senha_pessoa = $1 WHERE cpf_pessoa = $2 RETURNING cpf_pessoa, nome_pessoa, cidade_pessoa, estado_pessoa, endereco_pessoa, data_nascimento_pessoa',
      [nova_senha, id]
    );

    res.json({ sucesso: true, pessoa: updateResult.rows[0] });
  } catch (error) {
    console.error('Erro ao atualizar senha:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor' });
  }
};

exports.cadastrarCliente = async (req, res) => {
  const conexao = await pool.connect();

  try {
    const {
      cpf_pessoa,
      nome_pessoa,
      data_nascimento_pessoa,
      cidade_pessoa,
      estado_pessoa,
      endereco_pessoa,
      usuario_pessoa,
      senha_pessoa,
      email_pessoa
    } = req.body;

    // Verifica os campos obrigatórios
    if (
      !cpf_pessoa ||
      !nome_pessoa ||
      !data_nascimento_pessoa ||
      !cidade_pessoa ||
      !estado_pessoa ||
      !endereco_pessoa ||
      !usuario_pessoa ||
      !senha_pessoa ||
      !email_pessoa
    ) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Preencha todos os campos obrigatórios.'
      });
    }

    // Verifica se o CPF possui 11 números
    if (!/^\d{11}$/.test(cpf_pessoa)) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'CPF inválido.'
      });
    }

    // Verifica se o email é válido
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email_pessoa)) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Email inválido.'
      });
    }

    // Protege a senha
    const senhaCriptografada = await bcrypt.hash(senha_pessoa, 10);

    // Inicia a transação
    await conexao.query('BEGIN');

    // Cadastra a pessoa
    await conexao.query(
      `INSERT INTO pessoa
            (cpf_pessoa, nome_pessoa, data_nascimento_pessoa, cidade_pessoa, estado_pessoa,
            endereco_pessoa, usuario_pessoa, senha_pessoa, email_pessoa)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        cpf_pessoa,
        nome_pessoa,
        data_nascimento_pessoa,
        cidade_pessoa,
        estado_pessoa,
        endereco_pessoa,
        usuario_pessoa,
        senhaCriptografada,
        email_pessoa
      ]
    );

    // Cadastra o perfil de cliente
    await conexao.query(
      `INSERT INTO cliente (cpf_cliente, data_cadastro)
            VALUES ($1, CURRENT_DATE)`,
      [cpf_pessoa]
    );

    // Confirma os dois cadastros
    await conexao.query('COMMIT');

    res.status(201).json({
      sucesso: true,
      mensagem: 'Cadastro realizado com sucesso!'
    });

  } catch (error) {
    await conexao.query('ROLLBACK');

    console.error('Erro ao cadastrar cliente:', error);

    if (error.code === '23505') {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'CPF, usuário ou email já cadastrado.'
      });
    }

    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno ao realizar o cadastro.'
    });

  } finally {
    conexao.release();
  }
};

exports.minhasInformacoes = async (req, res) => {
    try {
        if (!req.session.usuario) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Usuário não está conectado.'
            });
        }

        const cpf = req.session.usuario.cpf;

        const result = await query(
            `SELECT cpf_pessoa, nome_pessoa, data_nascimento_pessoa,
                    endereco_pessoa, cidade_pessoa, estado_pessoa,
                    usuario_pessoa, email_pessoa
             FROM pessoa
             WHERE cpf_pessoa = $1`,
            [cpf]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Pessoa não encontrada.'
            });
        }

        res.json({
            sucesso: true,
            pessoa: result.rows[0]
        });

    } catch (error) {
        console.error('Erro ao buscar informações:', error);

        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro interno do servidor.'
        });
    }
};

exports.atualizarMinhasInformacoes = async (req, res) => {
    try {
        if (!req.session.usuario) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Usuário não está conectado.'
            });
        }
        
        const cpf = req.session.usuario.cpf;

        const {
            nome_pessoa,
            data_nascimento_pessoa,
            endereco_pessoa,
            cidade_pessoa,
            estado_pessoa,
            email_pessoa
        } = req.body;

        if (
            !nome_pessoa ||
            !data_nascimento_pessoa ||
            !endereco_pessoa ||
            !cidade_pessoa ||
            !estado_pessoa ||
            !email_pessoa
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Preencha todos os campos.'
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email_pessoa)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Email inválido.'
            });
        }

        const result = await query(
            `UPDATE pessoa
             SET nome_pessoa = $1,
                 data_nascimento_pessoa = $2,
                 endereco_pessoa = $3,
                 cidade_pessoa = $4,
                 estado_pessoa = $5,
                 email_pessoa = $6
             WHERE cpf_pessoa = $7
             RETURNING cpf_pessoa, nome_pessoa, data_nascimento_pessoa,
                       endereco_pessoa, cidade_pessoa, estado_pessoa,
                       usuario_pessoa, email_pessoa`,
            [
                nome_pessoa,
                data_nascimento_pessoa,
                endereco_pessoa,
                cidade_pessoa,
                estado_pessoa.toUpperCase(),
                email_pessoa,
                cpf
            ]
        );

        res.json({
            sucesso: true,
            mensagem: 'Informações atualizadas com sucesso!',
            pessoa: result.rows[0]
        });

    } catch (error) {
        console.error('Erro ao atualizar informações:', error);

        if (error.code === '23505') {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Este email já está sendo utilizado.'
            });
        }

        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro interno do servidor.'
        });
    }
};