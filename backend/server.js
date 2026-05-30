const express = require('express');
const cors = require('cors');
const pool = require('./db');
const authRoutes = require('./routes/auth');
const empresasRoutes = require('./routes/empresas');
const funcionariosRoutes = require('./routes/funcionarios');
const pontosRoutes = require('./routes/pontos');
const relatoriosRoutes = require('./routes/relatorios');

const app = express();
app.use(cors());
app.use(express.json());

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/empresas', empresasRoutes);
app.use('/api/funcionarios', funcionariosRoutes);
app.use('/api/pontos', pontosRoutes);
app.use('/api/relatorios', relatoriosRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});