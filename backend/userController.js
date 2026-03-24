import jwt from "jsonwebtoken";
import PDFDocument from "pdfkit";

const JWT_SECRET = "ifce_posto_saude_secret";

const usuarios = [
    { id: "1", email: "aluno@ifce.edu.br", senha: "123456", tipo_usuario: "aluno", nome: "Aluno Teste" },
    { id: "2", email: "prof@ifce.edu.br", senha: "123456", tipo_usuario: "profissional", nome: "Dr. Profissional Teste" }
];

const itens = [
    { id: "1", nome: "Seringa", codigo: "SER001", descricao: "Seringa descartável 5ml" },
    { id: "2", nome: "Luva", codigo: "LUV001", descricao: "Luva de procedimento M" },
    { id: "3", nome: "Curativo", codigo: "CUR001", descricao: "Curativo adesivo estéril" }
];

const disponibilidades = [
    { id: "d1", profissional_id: "2", especialidade: "Geral", data: "2025-06-10", horarios: ["08:00", "08:20", "08:40", "09:00", "09:20"] },
    { id: "d2", profissional_id: "2", especialidade: "Dentista", data: "2025-06-11", horarios: ["09:00", "09:20", "09:40"] }
];

const agendamentos = [
    { id: "a1", aluno_id: "1", profissional_id: "2", especialidade: "Dentista", data: "2025-06-12", hora: "09:00", status: "Confirmado" }
];

const logsRequisicoes = [];

export const registrarLog = (metodo, rota) => {
    const agora = new Date();
    const data = agora.toISOString().split("T")[0];
    const hora = agora.toLocaleTimeString();
    logsRequisicoes.push({ metodo, rota, data, hora });
};

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

export const getItens = (req, res) => {
    return res.json(itens);
};

export const criarItem = async (req, res) => {
    const { nome, codigo, descricao } = req.body;

    if (!nome || !codigo) {
        return res.status(400).json({ error: "Nome e código são obrigatórios." });
    }

    const novo = { id: String(itens.length + 1), nome, codigo, descricao };
    itens.push(novo);

    return res.status(201).json(novo);
};

export const deleteItem = async (req, res) => {
    const { id } = req.params;
    const index = itens.findIndex(i => i.id === id);

    if (index === -1) {
        return res.status(404).json({ error: "Item não encontrado." });
    }

    itens.splice(index, 1);
    return res.json({ message: "Item removido com sucesso." });
};

export const getItems = async (req, res) => {
    const { codigo } = req.params;
    const item = itens.find(i => i.codigo === codigo);

    if (!item) {
        return res.status(404).json({ error: "Item não encontrado." });
    }

    return res.json(item);
};

export const getLogsPorData = (req, res) => {
    const { data } = req.params;
    const filtrados = logsRequisicoes.filter(l => l.data === data);
    return res.json(filtrados);
};

export const generatePDF = (req, res) => {
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=relatorio.pdf');
    doc.pipe(res);
    doc.fontSize(20).text("Relatório de Itens do Sistema", { align: 'center' });
    doc.moveDown();

    itens.forEach(item => {
        doc.fontSize(12).text(`- ${item.nome} (Código: ${item.codigo})`);
        if (item.descricao) doc.fontSize(10).text(`  Descrição: ${item.descricao}`);
        doc.moveDown(0.5);
    });

    doc.end();
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