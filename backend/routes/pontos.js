const express = require('express');
const router = express.Router();
const pool = require('../db');

// Obter pontos do funcionário no dia (ordem)
router.post('/registrar', async (req, res) => {
  const { funcionarioId, tipo } = req.body;
  const hoje = new Date().toISOString().slice(0,10);
  try {
    // Verificar se já existe fim_turno hoje
    const fimTurno = await pool.query(
      `SELECT id FROM registros_ponto WHERE funcionario_id=$1 AND data=$2 AND tipo='fim_turno'`,
      [funcionarioId, hoje]
    );
    if (fimTurno.rows.length > 0) {
      return res.status(400).json({ error: 'Jornada já finalizada hoje.' });
    }
    // Verificar duplicidade do tipo no dia
    const existe = await pool.query(
      `SELECT id FROM registros_ponto WHERE funcionario_id=$1 AND data=$2 AND tipo=$3`,
      [funcionarioId, hoje, tipo]
    );
    if (existe.rows.length > 0) {
      return res.status(400).json({ error: `Batida do tipo ${tipo} já registrada hoje.` });
    }
    // Verificar ordem
    const tiposOrdem = ['inicio_turno', 'inicio_intervalo', 'fim_intervalo', 'fim_turno'];
    const index = tiposOrdem.indexOf(tipo);
    for (let i = 0; i < index; i++) {
      const anterior = await pool.query(
        `SELECT id FROM registros_ponto WHERE funcionario_id=$1 AND data=$2 AND tipo=$3`,
        [funcionarioId, hoje, tiposOrdem[i]]
      );
      if (anterior.rows.length === 0 && tiposOrdem[i] !== 'fim_intervalo') {
        return res.status(400).json({ error: `Você precisa registrar ${tiposOrdem[i]} antes.` });
      }
      if (tiposOrdem[i] === 'fim_intervalo') {
        const inicioIntervalo = await pool.query(
          `SELECT id FROM registros_ponto WHERE funcionario_id=$1 AND data=$2 AND tipo='inicio_intervalo'`,
          [funcionarioId, hoje]
        );
        if (inicioIntervalo.rows.length === 0 && tipo !== 'inicio_intervalo') {
          return res.status(400).json({ error: `Você precisa iniciar o intervalo antes.` });
        }
      }
    }
    const result = await pool.query(
      `INSERT INTO registros_ponto (funcionario_id, tipo, data, timestamp)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP) RETURNING *`,
      [funcionarioId, tipo, hoje]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Obter pontos de um funcionário em um intervalo
router.get('/funcionario/:id', async (req, res) => {
  const { id } = req.params;
  const { inicio, fim } = req.query;
  let query = `SELECT * FROM registros_ponto WHERE funcionario_id=$1`;
  const params = [id];
  if (inicio) {
    query += ` AND data >= $2`;
    params.push(inicio);
    if (fim) {
      query += ` AND data <= $3`;
      params.push(fim);
    }
  }
  query += ` ORDER BY timestamp DESC`;
  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obter todos os registros (com nomes)
router.get('/todos', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.id, r.data, r.timestamp, r.tipo,
             f.nome as funcionario_nome, e.nome as empresa_nome
      FROM registros_ponto r
      JOIN funcionarios f ON r.funcionario_id = f.id
      JOIN empresas e ON f.empresa_id = e.id
      ORDER BY r.timestamp DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;