const express = require('express');
const { Client } = require('pg');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const client = new Client({
    connectionString: process.env.DATABASE_URL
});

client.connect();

// GET /users - Listar todos
app.get('/users', async (req, res) => {
    try {
        const result = await client.query('SELECT * FROM users ORDER BY id');
        res.json(result.rows);
    } catch (err) {
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
        res.status(500).json({ error: err.message });
    }
});

// POST /users - Criar usuário
app.post('/users', async (req, res) => {
    const { name, lastname, email } = req.body;
    try {
        const result = await client.query(
            'INSERT INTO users (name, lastname, email) VALUES ($1, $2, $3) RETURNING *',
            [name, lastname, email]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /users/:id - Atualizar usuário
app.put('/users/:id', async (req, res) => {
    const { name, lastname, email } = req.body;
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
        res.status(500).json({ error: err.message });
    }
});

// DELETE /users/:id - Remover usuário
app.delete('/users/:id', async (req, res) => {
    try {
        const result = await client.query('DELETE FROM users WHERE id = $1 RETURNING *', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        res.json({ message: 'Usuário removido com sucesso' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => {
    console.log(`API rodando na porta ${port}`);
});