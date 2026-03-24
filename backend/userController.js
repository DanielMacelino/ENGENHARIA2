import jwt from "jsonwebtoken";

const JWT_SECRET = "ifce_posto_saude_secret";

const usuarios = [
    { id: "1", email: "aluno@ifce.edu.br", senha: "123456", tipo_usuario: "aluno", nome: "Aluno Teste" },
    { id: "2", email: "prof@ifce.edu.br", senha: "123456", tipo_usuario: "profissional", nome: "Dr. Profissional Teste" }
];

const disponibilidades = [
    {
        id: "d1",
        profissional_id: "2",
        especialidade: "Geral",
        data: "2025-06-10",
        horarios: ["08:00", "08:20", "08:40", "09:00", "09:20"]
    },
    {
        id: "d2",
        profissional_id: "2",
        especialidade: "Dentista",
        data: "2025-06-11",
        horarios: ["09:00", "09:20", "09:40"]
    }
];

const agendamentos = [
    {
        id: "a1",
        aluno_id: "1",
        profissional_id: "2",
        especialidade: "Dentista",
        data: "2025-06-12",
        hora: "09:00",
        status: "Confirmado"
    }
];

// Código Principal

export const login = async (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({ error: "Email e senha são obrigatórios." });
    }

    const usuario = usuarios.find(u => u.email === email && u.senha === senha);

    if (!usuario) {
        return res.status(401).json({ error: "Credenciais inválidas." });
    }

    const token = jwt.sign(
        { id: usuario.id, email: usuario.email, tipo_usuario: usuario.tipo_usuario },
        JWT_SECRET,
        { expiresIn: "1h" }
    );

    return res.json({ token, tipo_usuario: usuario.tipo_usuario });
};

export const getHorarios = async (req, res) => {
    const { especialidade } = req.query;

    let resultado = disponibilidades;

    if (especialidade) {
        resultado = disponibilidades.filter(d => d.especialidade === especialidade);
    }

    return res.json(resultado);
};

export const criarAgendamento = async (req, res) => {
    const { profissional_id, data, hora, especialidade } = req.body;

    if (!profissional_id || !data || !hora || !especialidade) {
        return res.status(400).json({ error: "Todos os campos são obrigatórios." });
    }

    const novoAgendamento = {
        id: `a${agendamentos.length + 1}`,
        aluno_id: "1",
        profissional_id,
        especialidade,
        data,
        hora,
        status: "Pendente"
    };

    agendamentos.push(novoAgendamento);

    return res.status(201).json({ message: "Agendamento criado com sucesso.", agendamento: novoAgendamento });
};

export const salvarDisponibilidade = async (req, res) => {
    const { especialidade, data, horarios } = req.body;

    if (!especialidade || !data || !horarios || !horarios.length) {
        return res.status(400).json({ error: "Especialidade, data e horários são obrigatórios." });
    }

    const novaDisponibilidade = {
        id: `d${disponibilidades.length + 1}`,
        profissional_id: "2",
        especialidade,
        data,
        horarios
    };

    disponibilidades.push(novaDisponibilidade);

    return res.status(201).json({ message: "Disponibilidade salva com sucesso.", disponibilidade: novaDisponibilidade });
};