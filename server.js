const express = require('express');
const { Client } = require('pg');
const cors = require('cors');

// Carregar variáveis de ambiente
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false  // Obrigatório para Neon
  }
});

async function connectDatabase() {
  try {
    await client.connect();
    console.log('✅ Conectado ao PostgreSQL');
    
    // Criar tabela se não existir
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        lastname VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('📋 Tabela users verificada/criada');
    
  } catch (err) {
    console.error('❌ Erro de conexão:', err.message);
    console.error('DATABASE_URL presente:', !!process.env.DATABASE_URL);
    console.error('Tentando reconectar em 5 segundos...');
    
    setTimeout(() => {
      connectDatabase();
    }, 5000);
  }
}

// Conectar ao banco
connectDatabase();

// Rota raiz
app.get('/', (req, res) => {
  res.json({ 
    message: 'API REST Users funcionando!', 
    endpoints: {
      'GET /users': 'Listar usuários',
      'GET /users/:id': 'Buscar usuário por ID',
      'POST /users': 'Criar usuário',
      'PUT /users/:id': 'Atualizar usuário',
      'DELETE /users/:id': 'Deletar usuário'
    }
  });
});

// GET /users - Listar todos
app.get('/users', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM users ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao listar usuários:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /users/:id - Buscar por ID
app.get('/users/:id', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao buscar usuário:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /users - Criar usuário
app.post('/users', async (req, res) => {
  const { name, lastname, email } = req.body;
  
  if (!name || !lastname || !email) {
    return res.status(400).json({ 
      error: 'Campos obrigatórios: name, lastname, email' 
    });
  }
  
  try {
    const result = await client.query(
      'INSERT INTO users (name, lastname, email) VALUES ($1, $2, $3) RETURNING *',
      [name, lastname, email]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao criar usuário:', err);
    if (err.code === '23505') { // Unique violation
      res.status(400).json({ error: 'Email já existe' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// PUT /users/:id - Atualizar usuário
app.put('/users/:id', async (req, res) => {
  const { name, lastname, email } = req.body;
  
  if (!name || !lastname || !email) {
    return res.status(400).json({ 
      error: 'Campos obrigatórios: name, lastname, email' 
    });
  }
  
  try {
    const result = await client.query(
      'UPDATE users SET name = $1, lastname = $2, email = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
      [name, lastname, email, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar usuário:', err);
    if (err.code === '23505') { // Unique violation
      res.status(400).json({ error: 'Email já existe' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// DELETE /users/:id - Remover usuário
app.delete('/users/:id', async (req, res) => {
  try {
    const result = await client.query('DELETE FROM users WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    res.json({ message: 'Usuário removido com sucesso', user: result.rows[0] });
  } catch (err) {
    console.error('Erro ao deletar usuário:', err);
    res.status(500).json({ error: err.message });
  }
});

// Error handler global
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint não encontrado' });
});

app.listen(port, () => {
  console.log(`🚀 API rodando na porta ${port}`);
  console.log(`📖 Documentação: http://localhost:${port}/`);
});