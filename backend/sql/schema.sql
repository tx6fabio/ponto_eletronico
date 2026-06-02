-- =====================================================
-- SCRIPT COMPLETO DO BANCO DE DADOS
-- Sistema de Ponto Eletrônico Multi-Empresas
-- =====================================================

-- 1. Criar o banco de dados (se não existir)
-- Comente esta linha se o banco já foi criado manualmente
CREATE DATABASE ponto_eletronico;

-- Conectar ao banco (útil se executar via psql)
\c ponto_eletronico;

-- =====================================================
-- TABELA EMPRESAS
-- =====================================================
CREATE TABLE IF NOT EXISTS empresas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cnpj VARCHAR(18) UNIQUE,
    endereco TEXT,
    jornada_diaria_horas DECIMAL(5,2) DEFAULT 8.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABELA FUNCIONARIOS
-- =====================================================
CREATE TABLE IF NOT EXISTS funcionarios (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    matricula VARCHAR(50) NOT NULL UNIQUE,
    nome VARCHAR(100) NOT NULL,
    senha VARCHAR(100) NOT NULL, -- armazenar com bcrypt
    whatsapp VARCHAR(20) NOT NULL,
    ativo BOOLEAN DEFAULT true,
    status VARCHAR(20) DEFAULT 'ativo', -- 'ativo', 'ferias', 'desligado'
    ferias_inicio DATE,
    ferias_fim DATE,
    permite_hora_extra BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABELA REGISTROS_PONTO
-- =====================================================
CREATE TABLE IF NOT EXISTS registros_ponto (
    id SERIAL PRIMARY KEY,
    funcionario_id INTEGER NOT NULL REFERENCES funcionarios(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('inicio_turno', 'inicio_intervalo', 'fim_intervalo', 'fim_turno')),
    data DATE NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_func_dia_tipo UNIQUE (funcionario_id, data, tipo)
);

-- =====================================================
-- TABELA CONFIGURACOES (chave-valor)
-- =====================================================
CREATE TABLE IF NOT EXISTS configuracoes (
    chave VARCHAR(50) PRIMARY KEY,
    valor TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_registros_func_data ON registros_ponto(funcionario_id, data);
CREATE INDEX IF NOT EXISTS idx_funcionarios_empresa ON funcionarios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_funcionarios_status ON funcionarios(status);

-- =====================================================
-- DADOS INICIAIS (CONFIGURAÇÕES PADRÃO)
-- =====================================================
INSERT INTO configuracoes (chave, valor) VALUES 
    ('logout_inicio_turno', 'false'),
    ('logout_inicio_intervalo', 'false'),
    ('logout_fim_intervalo', 'false'),
    ('logout_fim_turno', 'false')
ON CONFLICT (chave) DO NOTHING;

-- =====================================================
-- ATUALIZAR EMPRESAS EXISTENTES (caso a coluna seja adicionada depois)
-- =====================================================
UPDATE empresas SET jornada_diaria_horas = 8.0 WHERE jornada_diaria_horas IS NULL;

-- =====================================================
-- ATUALIZAR FUNCIONARIOS EXISTENTES
-- =====================================================
UPDATE funcionarios SET status = 'ativo' WHERE status IS NULL;
UPDATE funcionarios SET permite_hora_extra = true WHERE permite_hora_extra IS NULL;

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================