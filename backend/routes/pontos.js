const express = require('express');
const router = express.Router();
const pool = require('../db');

router.post('/registrar', async (req, res) => {
  const { funcionarioId, tipo } = req.body;
  const hoje = new Date().toISOString().slice(0, 10);
  try {
    // Verificar status do funcionário
    const funcionario = await pool.query(
      `SELECT status, ferias_inicio, ferias_fim FROM funcionarios WHERE id = $1`,
      [funcionarioId]
    );
    if (funcionario.rows.length === 0) {
      return res.status(404).json({ error: 'Funcionário não encontrado' });
    }
    const { status, ferias_inicio, ferias_fim } = funcionario.rows[0];
    
    if (status === 'desligado') {
      return res.status(403).json({ error: 'Funcionário desligado da empresa. Não pode bater ponto.' });
    }
    if (status === 'ferias') {
      const hojeDate = new Date(hoje);
      if (ferias_inicio && ferias_fim) {
        const inicio = new Date(ferias_inicio);
        const fim = new Date(ferias_fim);
        if (hojeDate >= inicio && hojeDate <= fim) {
          return res.status(403).json({ error: 'Funcionário em período de férias. Não pode bater ponto.' });
        }
      } else {
        return res.status(403).json({ error: 'Funcionário está de férias (período não definido). Não pode bater ponto.' });
      }
    }
    
    // Verificar se já existe fim_turno
    const fimTurno = await pool.query(
      `SELECT id FROM registros_ponto WHERE funcionario_id=$1 AND data=$2 AND tipo='fim_turno'`,
      [funcionarioId, hoje]
    );
    if (fimTurno.rows.length > 0) {
      return res.status(400).json({ error: 'Jornada já finalizada hoje.' });
    }
    // Verificar duplicidade do tipo
    const existe = await pool.query(
      `SELECT id FROM registros_ponto WHERE funcionario_id=$1 AND data=$2 AND tipo=$3`,
      [funcionarioId, hoje, tipo]
    );
    if (existe.rows.length > 0) {
      return res.status(400).json({ error: `Batida do tipo ${tipo} já registrada hoje.` });
    }
    // Verificar ordem (código existente omitido para brevidade, mas mantenha o mesmo)
    // ... (aqui mantenha a lógica original de ordem dos tipos)
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
    
    // Inserir ponto
    const result = await pool.query(
      `INSERT INTO registros_ponto (funcionario_id, tipo, data, timestamp)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP) RETURNING *`,
      [funcionarioId, tipo, hoje]
    );
    
    // Verificar configuração de logout
    let chaveLogout = '';
    if (tipo === 'inicio_turno') chaveLogout = 'logout_inicio_turno';
    else if (tipo === 'inicio_intervalo') chaveLogout = 'logout_inicio_intervalo';
    else if (tipo === 'fim_intervalo') chaveLogout = 'logout_fim_intervalo';
    else if (tipo === 'fim_turno') chaveLogout = 'logout_fim_turno';
    
    let logout = false;
    if (chaveLogout) {
      const configResult = await pool.query('SELECT valor FROM configuracoes WHERE chave = $1', [chaveLogout]);
      if (configResult.rows.length > 0) {
        logout = configResult.rows[0].valor === 'true';
      }
    }
    
    res.status(201).json({ ponto: result.rows[0], logout });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Demais rotas (GET /funcionario/:id, GET /todos) permanecem iguais
// ... (mantenha as funções existentes)
router.get('/funcionario/:id', async (req, res) => { /* ... */ });
router.get('/todos', async (req, res) => { /* ... */ });

module.exports = router;