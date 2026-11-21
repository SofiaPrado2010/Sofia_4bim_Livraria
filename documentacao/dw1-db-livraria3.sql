DROP TABLE IF EXISTS ITEM_DEVOLUCAO, DEVOLUCAO, PAGAMENTO_TEM_FORMA_PAGAMENTO, PAGAMENTO, ITEM_PEDIDO, PEDIDO, FORMA_PAGAMENTO, LIVRO, GENERO, FUNCIONARIO, CARGO, CLIENTE, PESSOA;
CREATE TABLE PESSOA(
       cpf_pessoa VARCHAR(11) PRIMARY KEY,
	   nome_pessoa VARCHAR(100) NOT NULL,
	   data_nascimento_pessoa DATE NOT NULL,
	   endereco_pessoa VARCHAR(150) NOT NULL,
	   usuario_pessoa VARCHAR(50) UNIQUE NOT NULL,
	   senha_pessoa VARCHAR(225) NOT NULL,
	   email_pessoa VARCHAR(75) UNIQUE NOT NULL 
);

CREATE TABLE CLIENTE(
       cpf_cliente VARCHAR(11) PRIMARY KEY,
	   data_cadastro DATE,
	   renda_cliente DECIMAL (10, 2),
	   FOREIGN KEY(cpf_cliente) REFERENCES PESSOA(cpf_pessoa)
);

CREATE TABLE CARGO(
       id_cargo INTEGER PRIMARY KEY,
	   nome_cargo VARCHAR(100)
);

CREATE TABLE FUNCIONARIO(
       cpf_funcionario VARCHAR(11) PRIMARY KEY,
	   id_cargo INTEGER,
	   data_contratacao DATE,
	   salario DECIMAL (10, 2),
	   porcentagem_comissao_funcionario DECIMAL(5,2),
	   FOREIGN KEY(cpf_funcionario) REFERENCES PESSOA(cpf_pessoa),
	   FOREIGN KEY(id_cargo) REFERENCES CARGO(id_cargo)
);

CREATE TABLE GENERO(
       id_genero INTEGER PRIMARY KEY,
	   nome_genero VARCHAR(100)
);

CREATE TABLE LIVRO(
       id_livro INTEGER PRIMARY KEY,
	   nome_livro VARCHAR(100),
	   autor VARCHAR(100),
	   preco_unitario DECIMAL(10,2),
	   numero_paginas INTEGER,
	   id_genero INTEGER,
	   quantidade_estoque INTEGER,
	   tipo_capa VARCHAR(10),
	   FOREIGN KEY(id_genero) REFERENCES GENERO(id_genero)
);

CREATE TABLE FORMA_PAGAMENTO(
       id_forma_pagamento INTEGER PRIMARY KEY,
	   nome_forma_pagamento VARCHAR(50)
);

CREATE TABLE PEDIDO(
       id_pedido INTEGER PRIMARY KEY,
	   cpf_pessoa VARCHAR(11),
	   data_pedido TIMESTAMP,
	   status_pedido VARCHAR(50),
	   FOREIGN KEY(cpf_pessoa) REFERENCES PESSOA(cpf_pessoa)
);

CREATE TABLE ITEM_PEDIDO(
	   id_pedido INTEGER,
	   id_livro INTEGER,
	   quantidade INTEGER CHECK(quantidade > 0),
	   preco_unitario DECIMAL(10,2) CHECK(preco_unitario >= 0),
	   PRIMARY KEY(id_pedido, id_livro),
	   FOREIGN KEY(id_pedido) REFERENCES PEDIDO(id_pedido),
	   FOREIGN KEY(id_livro) REFERENCES LIVRO(id_livro)
);

CREATE TABLE PAGAMENTO(
       id_pedido INTEGER PRIMARY KEY,
	   data_pagamento TIMESTAMP,
	   valor_total DECIMAL(10,2),
	   FOREIGN KEY(id_pedido) REFERENCES PEDIDO(id_pedido)
);

CREATE TABLE PAGAMENTO_TEM_FORMA_PAGAMENTO(
       pagamento_id_pedido INTEGER,
	   id_forma_pagamento INTEGER,
	   valor_pago DECIMAL(10,2),
	   PRIMARY KEY(pagamento_id_pedido, id_forma_pagamento),
	   FOREIGN KEY(pagamento_id_pedido) REFERENCES PAGAMENTO(id_pedido),
	   FOREIGN KEY(id_forma_pagamento) REFERENCES FORMA_PAGAMENTO(id_forma_pagamento)
);

CREATE TABLE DEVOLUCAO(
       id_devolucao INTEGER PRIMARY KEY,
	   id_pedido INTEGER,
	   data_devolucao TIMESTAMP,
	   UNIQUE(id_devolucao, id_pedido),
	   FOREIGN KEY(id_pedido) REFERENCES PEDIDO(id_pedido)
);

CREATE TABLE ITEM_DEVOLUCAO(
       id_item_devolucao INTEGER PRIMARY KEY,
	   id_devolucao INTEGER,
	   id_pedido INTEGER,
	   id_livro INTEGER,
	   quantidade_devolvida INTEGER CHECK(quantidade_devolvida > 0),
	   retorna_estoque BOOLEAN,
	   FOREIGN KEY(id_devolucao, id_pedido) REFERENCES DEVOLUCAO(id_devolucao, id_pedido),
	   FOREIGN KEY(id_pedido, id_livro) REFERENCES ITEM_PEDIDO(id_pedido, id_livro)
);

INSERT INTO PESSOA (cpf_pessoa, nome_pessoa, data_nascimento_pessoa, endereco_pessoa, usuario_pessoa, senha_pessoa, email_pessoa) 
VALUES
('10000000001', 'Ana Oliveira', '2001-03-15', 'Rua das Flores, 120', 'ana.oliveira', 'Ana@1234', 'ana@email.com'),
('10000000002', 'Bruno Santos', '1998-07-22', 'Avenida Brasil, 250', 'bruno.santos', 'Bruno@2345', 'bruno@email.com'),
('10000000003', 'Carla Mendes', '2003-11-08', 'Rua Paraná, 80', 'carla.mendes', 'Carla@3456', 'carla@email.com'),
('10000000004', 'Daniel Costa', '1995-02-19', 'Rua São Paulo, 410', 'daniel.costa', 'Daniel@4567', 'daniel@email.com'),
('10000000005', 'Eduarda Lima', '2000-09-30', 'Rua das Acácias, 55', 'eduarda.lima', 'Eduarda@5678', 'eduarda@email.com'),
('10000000006', 'Felipe Rocha', '1999-05-12', 'Avenida Paraná, 700', 'felipe.rocha', 'Felipe@6789', 'felipe@email.com'),
('10000000007', 'Gabriela Alves', '2002-01-25', 'Rua XV de Novembro, 90', 'gabriela.alves', 'Gabriela@7890', 'gabriela@email.com'),
('10000000008', 'Henrique Martins', '1997-12-03', 'Rua Mato Grosso, 150', 'henrique.martins', 'Henrique@8901', 'henrique@email.com'),
('10000000009', 'Isabela Ferreira', '2001-06-17', 'Rua Santa Catarina, 300', 'isabela.ferreira', 'Isabela@9012', 'isabela@email.com'),
('10000000010', 'João Ribeiro', '1996-04-09', 'Rua Amazonas, 45', 'joao.ribeiro', 'Joao@0123', 'joao@email.com'),

('20000000001', 'Mariana Souza', '1990-02-10', 'Rua Central, 100', 'mariana.souza', 'Mariana@1234', 'mariana@livraria.com'),
('20000000002', 'Lucas Almeida', '1988-08-14', 'Rua do Comércio, 200', 'lucas.almeida', 'Lucas@2345', 'lucas@livraria.com'),
('20000000003', 'Beatriz Carvalho', '1992-05-21', 'Rua das Palmeiras, 300', 'beatriz.carvalho', 'Beatriz@3456', 'beatriz@livraria.com'),
('20000000004', 'Rafael Gomes', '1985-10-02', 'Avenida Central, 400', 'rafael.gomes', 'Rafael@4567', 'rafael@livraria.com'),
('20000000005', 'Camila Rodrigues', '1994-03-18', 'Rua das Oliveiras, 500', 'camila.rodrigues', 'Camila@5678', 'camila@livraria.com'),
('20000000006', 'Pedro Nunes', '1989-07-07', 'Rua do Sol, 600', 'pedro.nunes', 'Pedro@6789', 'pedro@livraria.com'),
('20000000007', 'Larissa Barros', '1993-11-11', 'Rua da Paz, 700', 'larissa.barros', 'Larissa@7890', 'larissa@livraria.com'),
('20000000008', 'Thiago Mendes', '1987-01-29', 'Rua das Laranjeiras, 800', 'thiago.mendes', 'Thiago@8901', 'thiago@livraria.com'),
('20000000009', 'Amanda Freitas', '1991-09-05', 'Avenida das Nações, 900', 'amanda.freitas', 'Amanda@9012', 'amanda@livraria.com'),
('20000000010', 'Roberto Silva', '1980-12-20', 'Rua da Livraria, 1000', 'roberto.silva', 'Roberto@0123', 'roberto@livraria.com');

INSERT INTO CLIENTE (cpf_cliente, data_cadastro, renda_cliente)
VALUES
('10000000001', '2026-01-10', 2500.00),
('10000000002', '2026-01-12', 3200.00),
('10000000003', '2026-01-15', 1800.00),
('10000000004', '2026-01-18', 4500.00),
('10000000005', '2026-01-20', 2800.00),
('10000000006', '2026-01-22', 3500.00),
('10000000007', '2026-01-25', 2100.00),
('10000000008', '2026-01-27', 5000.00),
('10000000009', '2026-02-01', 3000.00),
('10000000010', '2026-02-05', 4000.00);

INSERT INTO CARGO (id_cargo, nome_cargo) 
VALUES
(1, 'Gerente'),
(2, 'Atendente'),
(3, 'Vendedor'),
(4, 'Estoquista'),
(5, 'Operador de Caixa'),
(6, 'Auxiliar Administrativo'),
(7, 'Assistente de Vendas'),
(8, 'Auxiliar de Estoque'),
(9, 'Comprador'),
(10, 'Auxiliar de Logística');

INSERT INTO FUNCIONARIO (cpf_funcionario, id_cargo, data_contratacao, salario, porcentagem_comissao_funcionario)
VALUES
('20000000001', 2, '2024-02-01', 2200.00, 0.00),
('20000000002', 3, '2024-03-15', 2400.00, 5.00),
('20000000003', 4, '2024-04-10', 2100.00, 0.00),
('20000000004', 5, '2024-05-20', 2300.00, 0.00),
('20000000005', 6, '2024-06-05', 2500.00, 0.00),
('20000000006', 7, '2024-07-12', 2200.00, 3.00),
('20000000007', 8, '2024-08-18', 2000.00, 0.00),
('20000000008', 9, '2024-09-25', 2800.00, 0.00),
('20000000009', 10, '2024-10-30', 2100.00, 0.00),
('20000000010', 1, '2023-01-10', 5000.00, 0.00);

INSERT INTO GENERO (id_genero, nome_genero)
VALUES
(1, 'Fantasia'),
(2, 'Romance'),
(3, 'Ficção Científica'),
(4, 'Distopia'),
(5, 'Mistério'),
(6, 'Terror'),
(7, 'Aventura'),
(8, 'Drama'),
(9, 'Clássico'),
(10, 'Infantojuvenil');

INSERT INTO LIVRO (id_livro, nome_livro, autor, preco_unitario, numero_paginas, id_genero, quantidade_estoque, tipo_capa) VALUES
-- Fantasia: obras de Tolkien
(1, 'O Hobbit', 'J.R.R. Tolkien', 45.00, 310, 1, 20, 'Capa dura'),
(22, 'A Sociedade do Anel', 'J.R.R. Tolkien', 59.00, 576, 1, 15, 'Capa dura'),
(23, 'As Duas Torres', 'J.R.R. Tolkien', 59.00, 464, 1, 15, 'Capa comum'),
(24, 'O Retorno do Rei', 'J.R.R. Tolkien', 62.00, 512, 1, 15, 'Capa comum'),
(25, 'O Silmarillion', 'J.R.R. Tolkien', 65.00, 496, 1, 12, 'Capa dura'),
(26, 'Contos Inacabados', 'J.R.R. Tolkien', 70.00, 576, 1, 10, 'Capa dura'),
(27, 'Os Filhos de Húrin', 'J.R.R. Tolkien', 48.00, 320, 1, 12, 'Capa dura'),

(7, 'Coraline', 'Neil Gaiman', 35.00, 224, 6, 12, 'Capa comum'),
(8, 'Extraordinário', 'R.J. Palacio', 48.00, 320, 8, 16, 'Capa comum'),
(9, 'O Código Da Vinci', 'Dan Brown', 50.00, 432, 5, 14, 'Capa comum'),
(10, 'Divergente', 'Veronica Roth', 40.00, 504, 4, 19, 'Capa comum'),
(2, 'Orgulho e Preconceito', 'Jane Austen', 39.00, 424, 2, 15, 'Capa comum'),
(3, 'Jogos Vorazes', 'Suzanne Collins', 32.00, 400, 4, 25, 'Capa comum'),

-- Fantasia Harry Potter
(6, 'Harry Potter e a Pedra Filosofal', 'J.K. Rowling', 55.00, 264, 1, 22, 'Capa dura'),
(11, 'Harry Potter e a Câmara Secreta', 'J.K. Rowling', 52.00, 288, 1, 20, 'Capa comum'),
(12, 'Harry Potter e o Prisioneiro de Azkaban', 'J.K. Rowling', 55.00, 320, 1, 20, 'Capa comum'),
(13, 'Harry Potter e o Cálice de Fogo', 'J.K. Rowling', 65.00, 480, 1, 18, 'Capa dura'),
(14, 'Harry Potter e a Ordem da Fênix', 'J.K. Rowling', 72.00, 576, 1, 18, 'Capa dura'),
(15, 'Harry Potter e o Enigma do Príncipe', 'J.K. Rowling', 68.00, 432, 1, 20, 'Capa comum'),
(16, 'Harry Potter e as Relíquias da Morte', 'J.K. Rowling', 75.00, 512, 1, 15, 'Capa dura'),

-- AVENTURA: Percy Jackson
(17, 'O Ladrão de Raios', 'Rick Riordan', 45.00, 400, 7, 20, 'Capa comum'),
(18, 'O Mar de Monstros', 'Rick Riordan', 42.00, 304, 7, 20, 'Capa comum'),
(19, 'A Maldição do Titã', 'Rick Riordan', 45.00, 336, 7, 18, 'Capa comum'),
(20, 'A Batalha do Labirinto', 'Rick Riordan', 48.00, 392, 7, 18, 'Capa comum'),
(21, 'O Último Olimpiano', 'Rick Riordan', 50.00, 384, 7, 18, 'Capa comum'),

-- FANTASIA: As Crônicas de Nárnia
(28, 'O Sobrinho do Mago', 'C.S. Lewis', 35.00, 176, 1, 20, 'Capa comum'),
(29, 'O Leão, a Feiticeira e o Guarda-Roupa', 'C.S. Lewis', 38.00, 184, 1, 20, 'Capa comum'),
(30, 'O Cavalo e Seu Menino', 'C.S. Lewis', 36.00, 208, 1, 18, 'Capa comum'),
(31, 'Príncipe Caspian', 'C.S. Lewis', 37.00, 224, 1, 18, 'Capa comum'),
(32, 'A Viagem do Peregrino da Alvorada', 'C.S. Lewis', 40.00, 240, 1, 18, 'Capa dura'),
(33, 'A Cadeira de Prata', 'C.S. Lewis', 38.00, 224, 1, 15, 'Capa dura'),
(34, 'A Última Batalha', 'C.S. Lewis', 39.00, 224, 1, 15, 'Capa dura'),

-- ROMANCE
(35, 'Melhora do que nos filmes', 'Lynn Painter', 49.00, 368, 2, 15, 'Capa comum'),
(5, 'A Culpa é das Estrelas', 'John Green', 42.00, 288, 2, 18, 'Capa comum'),

-- INFANTOJUVENIL
(38, 'Anne de Green Gables', 'L.M. Montgomery', 42.00, 336, 10, 15, 'Capa comum'),
(39, 'Anne de Avonlea', 'L.M. Montgomery', 40.00, 320, 10, 12, 'Capa comum'),
(40, 'Anne da Ilha', 'L.M. Montgomery', 43.00, 352, 10, 12, 'Capa dura'),
(41, 'Anne de Windy Poplars', 'L.M. Montgomery', 45.00, 320, 10, 10, 'Capa dura'),
(42, 'Anne e a Casa dos Sonhos', 'L.M. Montgomery', 44.00, 336, 10, 10, 'Capa comum'),
(43, 'Anne de Ingleside', 'L.M. Montgomery', 46.00, 384, 10, 10, 'Capa dura'),
(44, 'Vale do Arco-Íris', 'L.M. Montgomery', 42.00, 320, 10, 10, 'Capa comum'),
(45, 'Rilla de Ingleside', 'L.M. Montgomery', 44.00, 384, 10, 10, 'Capa dura'),
(4, 'O Pequeno Príncipe', 'Antoine de Saint-Exupéry', 28.00, 96, 10, 30, 'Capa comum'),
(70, 'Matilda', 'Roald Dahl', 35.00, 240, 10, 15, 'Capa comum'),

-- CLÁSSICOS BRASILEIROS
(46, 'Dom Casmurro', 'Machado de Assis', 32.00, 256, 9, 20, 'Capa comum'),
(47, 'Memórias Póstumas de Brás Cubas', 'Machado de Assis', 35.00, 240, 9, 18, 'Capa comum'),
(48, 'O Cortiço', 'Aluísio Azevedo', 30.00, 224, 8, 18, 'Capa comum'),
(50, 'O Guarani', 'José de Alencar', 38.00, 320, 7, 15, 'Capa comum'),
(51, 'Senhora', 'José de Alencar', 34.00, 256, 2, 15, 'Capa comum'),
(53, 'Vidas Secas', 'Graciliano Ramos', 32.00, 176, 8, 18, 'Capa comum'),
(54, 'Capitães da Areia', 'Jorge Amado', 36.00, 280, 8, 18, 'Capa comum'),
(55, 'Triste Fim de Policarpo Quaresma', 'Lima Barreto', 34.00, 288, 8, 15, 'Capa comum'),

-- FICÇÃO CIENTÍFICA
(58, 'Duna', 'Frank Herbert', 65.00, 680, 3, 12, 'Capa comum'),
(59, 'Fundação', 'Isaac Asimov', 48.00, 256, 3, 12, 'Capa comum'),

-- DISTOPIA
(60, '1984', 'George Orwell', 38.00, 336, 4, 15, 'Capa comum'),
(61, 'Fahrenheit 451', 'Ray Bradbury', 35.00, 216, 4, 15, 'Capa comum'),

-- MISTÉRIO
(62, 'Assassinato no Expresso do Oriente', 'Agatha Christie', 42.00, 240, 5, 15, 'Capa comum'),
(63, 'O Cão dos Baskerville', 'Arthur Conan Doyle', 34.00, 256, 5, 12, 'Capa comum'),

-- TERROR
(64, 'Drácula', 'Bram Stoker', 45.00, 448, 6, 12, 'Capa comum'),
(65, 'Frankenstein', 'Mary Shelley', 38.00, 280, 6, 12, 'Capa comum');

INSERT INTO FORMA_PAGAMENTO (id_forma_pagamento, nome_forma_pagamento)
VALUES
(1, 'PIX'),
(2, 'Crédito'),
(3, 'Débito');

INSERT INTO PEDIDO (id_pedido, cpf_pessoa, data_pedido, status_pedido)
VALUES
(1, '10000000001', '2026-02-10 10:30:00', 'Concluído'),
(2, '10000000002', '2026-02-11 11:15:00', 'Pendente'),
(3, '10000000003', '2026-02-12 14:20:00', 'Concluído'),
(4, '10000000004', '2026-02-13 09:45:00', 'Pendente'),
(5, '10000000005', '2026-02-14 16:10:00', 'Concluído'),
(6, '10000000006', '2026-02-15 13:30:00', 'Pendente'),
(7, '10000000007', '2026-02-16 15:00:00', 'Concluído'),
(8, '10000000008', '2026-02-17 10:20:00', 'Pendente'),
(9, '10000000009', '2026-02-18 12:40:00', 'Concluído'),
(10, '10000000010', '2026-02-19 17:25:00','Pendente');

INSERT INTO ITEM_PEDIDO (id_pedido, id_livro, quantidade, preco_unitario)
VALUES
(1, 1, 1, 45.00),
(2, 2, 1, 39.00),
(3, 3, 2, 32.00),
(4, 4, 1, 28.00),
(5, 5, 1, 42.00),
(6, 6, 2, 55.00),
(7, 7, 1, 35.00),
(8, 8, 1, 48.00),
(9, 9, 1, 50.00),
(10, 10, 2, 40.00);

INSERT INTO PAGAMENTO 
VALUES
(1, '2026-02-10 10:35:00', 45.00),
(2, '2026-02-11 11:20:00', 39.00),
(3, '2026-02-12 14:25:00', 64.00),
(4, '2026-02-13 09:50:00', 28.00),
(5, '2026-02-14 16:15:00', 42.00),
(6, '2026-02-15 13:35:00', 110.00),
(7, '2026-02-16 15:05:00', 35.00),
(8, '2026-02-17 10:25:00', 48.00),
(9, '2026-02-18 12:45:00', 50.00),
(10, '2026-02-19 17:30:00', 80.00);

INSERT INTO PAGAMENTO_TEM_FORMA_PAGAMENTO 
VALUES
(1, 1, 45.00),
(2, 2, 39.00),
(3, 1, 40.00),
(3, 2, 24.00),
(4, 3, 28.00),
(5, 1, 42.00),
(6, 2, 100.00),
(6, 1, 10.00),
(7, 3, 35.00),
(8, 1, 48.00),
(9, 2, 50.00),
(10, 3, 80.00);

INSERT INTO DEVOLUCAO 
VALUES
(1, 1, '2026-02-12 10:00:00'),
(2, 2, '2026-02-13 11:30:00'),
(3, 3, '2026-02-14 14:00:00'),
(4, 4, '2026-02-15 09:20:00'),
(5, 5, '2026-02-16 16:40:00'),
(6, 6, '2026-02-17 13:15:00'),
(7, 7, '2026-02-18 15:30:00'),
(8, 8, '2026-02-19 10:45:00'),
(9, 9, '2026-02-20 12:10:00'),
(10, 10, '2026-02-21 17:00:00');

INSERT INTO ITEM_DEVOLUCAO 
VALUES
(1, 1, 1, 1, 1, TRUE),
(2, 2, 2, 2, 1, FALSE),
(3, 3, 3, 3, 1, TRUE),
(4, 4, 4, 4, 1, TRUE),
(5, 5, 5, 5, 1, FALSE),
(6, 6, 6, 6, 1, TRUE),
(7, 7, 7, 7, 1, TRUE),
(8, 8, 8, 8, 1, FALSE),
(9, 9, 9, 9, 1, TRUE),
(10, 10, 10, 10, 1, FALSE);

ALTER TABLE pessoa
ADD COLUMN cidade_pessoa VARCHAR(100);

ALTER TABLE pessoa
ADD COLUMN estado_pessoa CHAR(2);

INSERT INTO CLIENTE (cpf_cliente, data_cadastro, renda_cliente)
VALUES
('20000000001', '2025-01-10', 2600.00);

UPDATE pessoa
SET senha_pessoa = '$2b$10$9quxnuVkFuWWZve9bPKhkeeO49GE00CPHaR66.93Cg5KB7fUWujvy'
WHERE usuario_pessoa = 'mariana.souza';

-- Geração automática do número do pedido
ALTER TABLE pedido
ALTER COLUMN id_pedido
ADD GENERATED BY DEFAULT AS IDENTITY;

-- Ajusta a sequência para continuar após os pedidos existentes
SELECT setval(
    pg_get_serial_sequence('pedido', 'id_pedido'),
    (SELECT MAX(id_pedido) FROM pedido),
    true
);

-- Dados do endereço de entrega
ALTER TABLE pedido
ADD COLUMN endereco_entrega VARCHAR(150);

ALTER TABLE pedido
ADD COLUMN cidade_entrega VARCHAR(100);

ALTER TABLE pedido
ADD COLUMN estado_entrega CHAR(2);

ALTER TABLE livro
ADD CONSTRAINT chk_livro_preco
CHECK (preco_unitario > 0);

ALTER TABLE livro
ADD CONSTRAINT chk_livro_estoque
CHECK (quantidade_estoque >= 0);

ALTER TABLE pagamento
ADD CONSTRAINT chk_pagamento_valor
CHECK (valor_total > 0);

ALTER TABLE pagamento_tem_forma_pagamento
ADD CONSTRAINT chk_pagamento_forma_valor
CHECK (valor_pago > 0);

ALTER TABLE pedido
ADD CONSTRAINT chk_pedido_status
CHECK (
    status_pedido IN (
        'Pendente',
        'Concluído',
        'Cancelado'
    )
);

ALTER TABLE pedido
ADD COLUMN chave_idempotencia UUID UNIQUE;
ALTER TABLE pedido
ADD COLUMN hash_idempotencia CHAR(64);

ALTER TABLE pessoa
ADD COLUMN token_recuperacao_hash CHAR(64),
ADD COLUMN token_recuperacao_expira TIMESTAMP;