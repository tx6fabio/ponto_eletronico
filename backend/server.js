const express = require('express');
const cors = require('cors');
const pool = require('./db');

// Rotas
const authRoutes = require('./routes/auth');
const empresasRoutes = require('./routes/empresas');
const funcionariosRoutes = require('./routes/funcionarios');
const pontosRoutes = require('./routes/pontos');
const relatoriosRoutes = require('./routes/relatorios');
const configuracoesRoutes = require('./routes/configuracoes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Rota raiz
app.get('/', (req, res) => {
  res.status(200).json({
    message: '🚀 API do Ponto Eletrônico está online!',
    endpoints: [
      '/api/auth/login',
      '/api/empresas',
      '/api/funcionarios',
      '/api/pontos/registrar',
      '/api/pontos/todos',
      '/api/pontos/funcionario/:id',
      '/api/relatorios/horas',
      '/api/relatorios/dashboard',
      '/api/configuracoes'
    ]
  });
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/empresas', empresasRoutes);
app.use('/api/funcionarios', funcionariosRoutes);
app.use('/api/pontos', pontosRoutes);
app.use('/api/relatorios', relatoriosRoutes);
app.use('/api/configuracoes', configuracoesRoutes);

// Middleware 404
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Middleware de erro
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});