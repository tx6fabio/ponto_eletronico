const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET todas
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM empresas ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST criar
router.post('/', async (req, res) => {
  const { nome, cnpj, endereco, jornada_diaria_horas } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO empresas (nome, cnpj, endereco, jornada_diaria_horas) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [nome, cnpj, endereco, jornada_diaria_horas || 8.0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT atualizar
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, cnpj, endereco, jornada_diaria_horas } = req.body;
  try {
    const result = await pool.query(
      `UPDATE empresas 
       SET nome=$1, cnpj=$2, endereco=$3, jornada_diaria_horas=$4 
       WHERE id=$5 RETURNING *`,
      [nome, cnpj, endereco, jornada_diaria_horas, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Empresa não encontrada' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM empresas WHERE id=$1', [id]);
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;