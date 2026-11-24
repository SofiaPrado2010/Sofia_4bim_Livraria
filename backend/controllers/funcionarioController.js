const { query, pool } = require('../database');
const bcrypt = require('bcrypt');
const path = require('path');

// Abrir CRUD de Funcionários
exports.abrirCrudFuncionario = (req, res) => {
  const usuario = req.cookies ? req.cookies.usuarioLogado : null;

  if (usuario) {
    res.sendFile(path.join(__dirname, '../../frontend/funcionario/funcionario.html'));
  } else {
    res.redirect('/login');
  }
};

// Listar Funcionários
exports.listarFuncionarios = async (req, res) => {
  try {
    const result = await query(
      'SELECT f.cpf_funcionario, p.nome_pessoa, f.id_cargo, ' +
      'f.data_contratacao, f.salario, f.porcentagem_comissao_funcionario ' +
      'FROM funcionario f, pessoa p ' +
      'WHERE f.cpf_funcionario = p.cpf_pessoa ' +
      'ORDER BY f.cpf_funcionario'
    );

    res.json({ sucesso: true, funcionarios: result.rows });

  } catch (error) {
    console.error('Erro ao listar funcionários:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor' });
  }
};

// Obter Pessoa pelo CPF
exports.obterPessoa = async (req, res) => {
  try {
    const cpf = req.params.cpf;

    if (!cpf || cpf.length !== 11) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'CPF inválido'
      });
    }

    const result = await query(
      `SELECT cpf_pessoa, nome_pessoa, data_nascimento_pessoa,
              endereco_pessoa, usuario_pessoa, email_pessoa
       FROM pessoa
       WHERE cpf_pessoa = $1`,
      [cpf]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Pessoa não encontrada'
      });
    }

    res.json({
      sucesso: true,
      pessoa: result.rows[0]
    });

  } catch (error) {
    console.error('Erro ao obter pessoa:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno do servidor'
    });
  }
};

// Criar Funcionário
exports.criarFuncionario = async (req, res) => {
  let conexao;

  try {
    const {
      cpf_pessoa,
      nome_pessoa,
      data_nascimento_pessoa,
      endereco_pessoa,
      usuario_pessoa,
      senha_pessoa,
      email_pessoa,
      id_cargo,
      data_contratacao,
      salario,
      porcentagem_comissao_funcionario
    } = req.body;

    if (
      !cpf_pessoa ||
      cpf_pessoa.length !== 11 ||
      !id_cargo ||
      !data_contratacao ||
      salario === undefined ||
      salario === null ||
      salario === ''
    ) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Preencha todos os campos profissionais obrigatórios'
      });
    }

    conexao = await pool.connect();

    await conexao.query('BEGIN');

    // Verificar se a pessoa já está cadastrada
    const pessoaExistente = await conexao.query(
      'SELECT cpf_pessoa FROM pessoa WHERE cpf_pessoa = $1 FOR UPDATE',
      [cpf_pessoa]
    );

    // Se não existir, cadastrar os dados pessoais
    if (pessoaExistente.rows.length === 0) {

      if (
        !nome_pessoa ||
        !data_nascimento_pessoa ||
        !endereco_pessoa ||
        !usuario_pessoa ||
        !senha_pessoa ||
        !email_pessoa
      ) {
        await conexao.query('ROLLBACK');

        return res.status(400).json({
          sucesso: false,
          mensagem: 'Preencha todos os dados pessoais para cadastrar uma nova pessoa'
        });
      }

      const senhaCriptografada = await bcrypt.hash(senha_pessoa, 10);

      await conexao.query(
        `INSERT INTO pessoa
          (cpf_pessoa, nome_pessoa, data_nascimento_pessoa,
           endereco_pessoa, usuario_pessoa, senha_pessoa, email_pessoa)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          cpf_pessoa,
          nome_pessoa,
          data_nascimento_pessoa,
          endereco_pessoa,
          usuario_pessoa,
          senhaCriptografada,
          email_pessoa
        ]
      );
    }

    // Verificar se já existe um cadastro de funcionário
    const funcionarioExistente = await conexao.query(
      'SELECT cpf_funcionario FROM funcionario WHERE cpf_funcionario = $1',
      [cpf_pessoa]
    );

    if (funcionarioExistente.rows.length > 0) {
      await conexao.query('ROLLBACK');

      return res.status(400).json({
        sucesso: false,
        mensagem: 'Esta pessoa já está cadastrada como funcionário'
      });
    }

    // Cadastrar os dados profissionais
    const result = await conexao.query(
      `INSERT INTO funcionario
        (cpf_funcionario, id_cargo, data_contratacao,
         salario, porcentagem_comissao_funcionario)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        cpf_pessoa,
        id_cargo,
        data_contratacao,
        salario,
        porcentagem_comissao_funcionario || 0
      ]
    );

    await conexao.query('COMMIT');

    res.status(201).json({
      sucesso: true,
      mensagem: 'Funcionário cadastrado com sucesso!',
      funcionario: result.rows[0]
    });

  } catch (error) {
    if (conexao) {
      await conexao.query('ROLLBACK');
    }

    console.error('Erro ao criar funcionário:', error);

    if (error.code === '23505') {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'CPF, usuário ou e-mail já cadastrado'
      });
    }

    if (error.code === '23503') {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Cargo não encontrado'
      });
    }

    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno do servidor'
    });

  } finally {
    if (conexao) {
      conexao.release();
    }
  }
};

// Obter Funcionário
exports.obterFuncionario = async (req, res) => {
  try {
    const cpf = req.params.id;

    if (!cpf) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'CPF inválido'
      });
    }

    const result = await query(
      'SELECT p.cpf_pessoa, p.nome_pessoa, p.data_nascimento_pessoa, ' +
      'p.endereco_pessoa, p.usuario_pessoa, p.email_pessoa, ' +
      'f.id_cargo, f.data_contratacao, f.salario, ' +
      'f.porcentagem_comissao_funcionario ' +
      'FROM pessoa p, funcionario f ' +
      'WHERE p.cpf_pessoa = f.cpf_funcionario AND f.cpf_funcionario = $1',
      [cpf]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Funcionário não encontrado'
      });
    }

    res.json({ sucesso: true, funcionario: result.rows[0] });

  } catch (error) {
    console.error('Erro ao obter funcionário:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor' });
  }
};

// Atualizar Funcionário
exports.atualizarFuncionario = async (req, res) => {
  try {
    const cpf = req.params.id;

    const {
      id_cargo,
      data_contratacao,
      salario,
      porcentagem_comissao_funcionario
    } = req.body;

    if (!cpf) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'CPF inválido'
      });
    }

    const funcionarioAtual = await query(
      'SELECT * FROM funcionario WHERE cpf_funcionario = $1',
      [cpf]
    );

    if (funcionarioAtual.rows.length === 0) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Funcionário não encontrado'
      });
    }

    const funcionario = funcionarioAtual.rows[0];

    const cargoAtualizado = id_cargo !== undefined
      ? id_cargo
      : funcionario.id_cargo;

    const dataAtualizada = data_contratacao !== undefined
      ? data_contratacao
      : funcionario.data_contratacao;

    const salarioAtualizado = salario !== undefined
      ? salario
      : funcionario.salario;

    const comissaoAtualizada = porcentagem_comissao_funcionario !== undefined
      ? porcentagem_comissao_funcionario
      : funcionario.porcentagem_comissao_funcionario;

    const result = await query(
      `UPDATE funcionario
       SET id_cargo = $1,
           data_contratacao = $2,
           salario = $3,
           porcentagem_comissao_funcionario = $4
       WHERE cpf_funcionario = $5
       RETURNING *`,
      [
        cargoAtualizado,
        dataAtualizada,
        salarioAtualizado,
        comissaoAtualizada,
        cpf
      ]
    );

    res.json({
      sucesso: true,
      mensagem: 'Dados profissionais atualizados com sucesso!',
      funcionario: result.rows[0]
    });

  } catch (error) {
    console.error('Erro ao atualizar funcionário:', error);

    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno do servidor'
    });
  }
};

// Deletar Funcionário
exports.deletarFuncionario = async (req, res) => {
  try {
    const cpf = req.params.id;

    if (!cpf) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'CPF inválido'
      });
    }

    const existingFuncionario = await query(
      'SELECT * FROM funcionario WHERE cpf_funcionario = $1',
      [cpf]
    );

    if (existingFuncionario.rows.length === 0) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Funcionário não encontrado'
      });
    }

    await query(
      'DELETE FROM funcionario WHERE cpf_funcionario = $1',
      [cpf]
    );

    res.json({
      sucesso: true,
      mensagem: 'Funcionário excluído com sucesso'
    });

  } catch (error) {
    console.error('Erro ao deletar funcionário:', error);

    if (error.code === '23503') {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Não é possível deletar funcionário com dependências associadas'
      });
    }

    res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor' });
  }
};