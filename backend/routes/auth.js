const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');

// Login admin fixo (em produção pode vir do banco)
router.post('/login', async (req, res) => {
  const { matricula, senha } = req.body;
  // Admin
  if (matricula === 'admin' && senha === 'admin') {
    return res.json({ tipo: 'admin', nome: 'Administrador' });
  }
  // Funcionário
  try {
    const result = await pool.query(
      'SELECT id, nome, empresa_id, matricula, senha FROM funcionarios WHERE matricula = $1 AND ativo = true',
      [matricula]
    );
    if (result.rows.length === 0) return res.status(401).json({ error: 'Credenciais inválidas' });
    const func = result.rows[0];
    const senhaValida = await bcrypt.compare(senha, func.senha);
    if (!senhaValida) return res.status(401).json({ error: 'Credenciais inválidas' });
    res.json({ tipo: 'func', funcionarioId: func.id, nome: func.nome, empresaId: func.empresa_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

module.exports = router;