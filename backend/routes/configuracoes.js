const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET todas as configurações
router.get('/', async (req, res) => {
  try {
    // Verifica se a tabela existe
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'configuracoes'
      );
    `);
    if (!tableCheck.rows[0].exists) {
      // Cria a tabela se não existir (fallback)
      await pool.query(`
        CREATE TABLE IF NOT EXISTS configuracoes (
          chave VARCHAR(50) PRIMARY KEY,
          valor TEXT NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO configuracoes (chave, valor) VALUES 
          ('logout_inicio_turno', 'false'),
          ('logout_inicio_intervalo', 'false'),
          ('logout_fim_intervalo', 'false'),
          ('logout_fim_turno', 'false')
        ON CONFLICT (chave) DO NOTHING;
      `);
    }
    const result = await pool.query('SELECT chave, valor FROM configuracoes');
    const config = {};
    result.rows.forEach(row => {
      config[row.chave] = row.valor === 'true';
    });
    res.json(config);
  } catch (err) {
    console.error('Erro ao buscar configurações:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT atualizar configuração
router.put('/:chave', async (req, res) => {
  const { chave } = req.params;
  const { valor } = req.body;
  const chavesValidas = ['logout_inicio_turno', 'logout_inicio_intervalo', 'logout_fim_intervalo', 'logout_fim_turno'];
  if (!chavesValidas.includes(chave)) {
    return res.status(400).json({ error: 'Chave inválida' });
  }
  try {
    const result = await pool.query(
      `UPDATE configuracoes 
       SET valor = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE chave = $2 
       RETURNING *`,
      [valor ? 'true' : 'false', chave]
    );
    if (result.rows.length === 0) {
      // Se não existir, insere
      await pool.query(
        `INSERT INTO configuracoes (chave, valor) VALUES ($1, $2)`,
        [chave, valor ? 'true' : 'false']
      );
    }
    res.json({ chave, valor: valor });
  } catch (err) {
    console.error('Erro ao atualizar configuração:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;