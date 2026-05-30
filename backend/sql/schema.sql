CREATE DATABASE ponto_eletronico;

\c ponto_eletronico;

CREATE TABLE empresas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cnpj VARCHAR(18) UNIQUE,
    endereco TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE funcionarios (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    matricula VARCHAR(50) NOT NULL UNIQUE,
    nome VARCHAR(100) NOT NULL,
    senha VARCHAR(100) NOT NULL, -- em produção use bcrypt
    whatsapp VARCHAR(20) NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE registros_ponto (
    id SERIAL PRIMARY KEY,
    funcionario_id INTEGER NOT NULL REFERENCES funcionarios(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('inicio_turno', 'inicio_intervalo', 'fim_intervalo', 'fim_turno')),
    data DATE NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_func_dia_tipo UNIQUE (funcionario_id, data, tipo)
);

-- Índices para performance
CREATE INDEX idx_registros_func_data ON registros_ponto(funcionario_id, data);
CREATE INDEX idx_funcionarios_empresa ON funcionarios(empresa_id);

-- Usuário admin fixo (não fica na tabela funcionarios, tratado no back-end)