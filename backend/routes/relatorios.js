const express = require('express');
const router = express.Router();
const pool = require('../db');

// Relatório de horas trabalhadas por funcionário/período
router.get('/horas', async (req, res) => {
  const { empresa_id, funcionario_id, data_inicio, data_fim } = req.query;
  let query = `
    SELECT f.id as funcionario_id, f.nome, r.data,
           MIN(CASE WHEN r.tipo='inicio_turno' THEN r.timestamp END) as inicio_turno,
           MIN(CASE WHEN r.tipo='inicio_intervalo' THEN r.timestamp END) as inicio_intervalo,
           MIN(CASE WHEN r.tipo='fim_intervalo' THEN r.timestamp END) as fim_intervalo,
           MIN(CASE WHEN r.tipo='fim_turno' THEN r.timestamp END) as fim_turno
    FROM registros_ponto r
    JOIN funcionarios f ON r.funcionario_id = f.id
    WHERE 1=1
  `;
  const params = [];
  if (empresa_id) {
    params.push(empresa_id);
    query += ` AND f.empresa_id = $${params.length}`;
  }
  if (funcionario_id) {
    params.push(funcionario_id);
    query += ` AND f.id = $${params.length}`;
  }
  if (data_inicio) {
    params.push(data_inicio);
    query += ` AND r.data >= $${params.length}`;
  }
  if (data_fim) {
    params.push(data_fim);
    query += ` AND r.data <= $${params.length}`;
  }
  query += ` GROUP BY f.id, f.nome, r.data ORDER BY r.data DESC, f.nome`;
  try {
    const result = await pool.query(query, params);
    const relatorio = result.rows.map(row => {
      let horasTrabalhadas = null;
      if (row.inicio_turno && row.fim_turno) {
        let inicio = new Date(row.inicio_turno);
        let fim = new Date(row.fim_turno);
        let diff = (fim - inicio) / (1000 * 3600);
        if (row.inicio_intervalo && row.fim_intervalo) {
          let iniPausa = new Date(row.inicio_intervalo);
          let fimPausa = new Date(row.fim_intervalo);
          let pausa = (fimPausa - iniPausa) / (1000 * 3600);
          diff -= pausa;
        }
        horasTrabalhadas = diff.toFixed(2);
      }
      return { ...row, horas_trabalhadas: horasTrabalhadas };
    });
    res.json(relatorio);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dashboard: contagens
router.get('/dashboard', async (req, res) => {
  try {
    const totalEmpresas = await pool.query('SELECT COUNT(*) FROM empresas');
    const totalFuncionarios = await pool.query('SELECT COUNT(*) FROM funcionarios');
    const hoje = new Date().toISOString().slice(0,10);
    const batidasHoje = await pool.query('SELECT COUNT(*) FROM registros_ponto WHERE data=$1', [hoje]);
    const ultimosPontos = await pool.query(`
      SELECT r.timestamp, r.tipo, f.nome, e.nome as empresa
      FROM registros_ponto r
      JOIN funcionarios f ON r.funcionario_id = f.id
      JOIN empresas e ON f.empresa_id = e.id
      ORDER BY r.timestamp DESC LIMIT 10
    `);
    res.json({
      total_empresas: parseInt(totalEmpresas.rows[0].count),
      total_funcionarios: parseInt(totalFuncionarios.rows[0].count),
      batidas_hoje: parseInt(batidasHoje.rows[0].count),
      ultimos_pontos: ultimosPontos.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;