const express = require('express');
const path = require('path');
const app = express();

const PORT = 8080;

app.use('/config.js', express.static(path.join(__dirname, 'config.js')));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Rota raiz redireciona para o login
app.get('/', (req, res) => {
    res.redirect('/login');
});

// Tela de Login
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Telas do Perfil ALUNO
app.get('/aluno/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'aluno-dashboard.html'));
});

app.get('/aluno/agendamentos', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'aluno-agendamentos.html'));
});

// Tela do Perfil PROFISSIONAL
app.get('/profissional/disponibilidade', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'profissional-disponibilidade.html'));
});

// Rota de fallback para 404
app.use((req, res) => {
    res.redirect('/login');
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log(`- Acesse http://localhost:${PORT}/login para visualizar o sistema.`);
});
