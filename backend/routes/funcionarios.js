const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');

// GET todos (com nome da empresa e status/ferias/permite_hora_extra)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT f.id, f.matricula, f.nome, f.whatsapp, f.ativo, 
             f.status, f.ferias_inicio, f.ferias_fim, f.permite_hora_extra,
             f.empresa_id, e.nome as empresa_nome
      FROM funcionarios f
      JOIN empresas e ON f.empresa_id = e.id
      ORDER BY f.id
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST criar (com permite_hora_extra padrão true)
router.post('/', async (req, res) => {
  const { empresa_id, matricula, nome, senha, whatsapp, ativo, status, ferias_inicio, ferias_fim, permite_hora_extra } = req.body;
  const hashed = await bcrypt.hash(senha, 10);
  try {
    const result = await pool.query(
      `INSERT INTO funcionarios 
       (empresa_id, matricula, nome, senha, whatsapp, ativo, status, ferias_inicio, ferias_fim, permite_hora_extra)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [empresa_id, matricula, nome, hashed, whatsapp, ativo !== undefined ? ativo : true,
       status || 'ativo', ferias_inicio || null, ferias_fim || null,
       permite_hora_extra !== undefined ? permite_hora_extra : true]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT atualizar (inclui permite_hora_extra)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { empresa_id, matricula, nome, senha, whatsapp, ativo, status, ferias_inicio, ferias_fim, permite_hora_extra } = req.body;
  let query = `UPDATE funcionarios SET 
               empresa_id=$1, matricula=$2, nome=$3, whatsapp=$4, ativo=$5,
               status=$6, ferias_inicio=$7, ferias_fim=$8, permite_hora_extra=$9`;
  const params = [empresa_id, matricula, nome, whatsapp, ativo, status, ferias_inicio, ferias_fim, permite_hora_extra];
  if (senha) {
    query += `, senha=$${params.length+1}`;
    params.push(await bcrypt.hash(senha, 10));
  }
  query += ` WHERE id=$${params.length+1} RETURNING *`;
  params.push(id);
  try {
    const result = await pool.query(query, params);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Funcionário não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM funcionarios WHERE id=$1', [id]);
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;