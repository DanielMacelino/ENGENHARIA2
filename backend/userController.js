import jwt from "jsonwebtoken";
import PDFDocument from "pdfkit";
import supabase from "./supabaseClient.js";

const JWT_SECRET = "ifce_posto_saude_secret";

// Requisito H: Todos os dados mockados em arrays
const usuarios = [
    { id: "1", email: "aluno@ifce.edu.br", senha: "123456", tipo_usuario: "aluno", nome: "Aluno Teste" },
    { id: "3", email: "aluno@ifce.br", senha: "123456", tipo_usuario: "aluno", nome: "Aluno Teste" },
    { id: "2", email: "prof@ifce.edu.br", senha: "123456", tipo_usuario: "profissional", nome: "Dr. Profissional Teste" }
];

const itens = [
    { id: "1", nome: "Consulta Clínica", codigo: "CC001", descricao: "Atendimento geral" },
    { id: "2", nome: "Limpeza Dental", codigo: "LD002", descricao: "Procedimento odontológico" },
    { id: "4", nome: "Acompanhamento Psicológico", codigo: "AP003", descricao: "Sessão de terapia" }
];

// Dados Extras para manter o frontend atual funcionando (Dashboard)
const disponibilidades = [
    { profissional_id: "2", especialidade: "Geral", data: "2025-06-10", horarios: ["08:00", "08:20", "08:40", "09:00", "09:20"] },
    { profissional_id: "2", especialidade: "Dentista", data: "2025-06-11", horarios: ["09:00", "09:20", "09:40"] }
];

// Requisito E/F: Registro de logs
export const logsRequisicoes = [];

export const registrarLog = (metodo, rota) => {
    const agora = new Date();
    logsRequisicoes.push({
        data: agora.toISOString().split('T')[0],
        horario: agora.toLocaleTimeString(),
        metodo,
        rota
    });
};

// Requisito A: Rota POST /logar
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

// Requisito B: Rota GET para obter lista de itens
export const getItens = (req, res) => {
    return res.json(itens);
};

// Requisito C: Rota POST para inserir novo item
export const criarItem = async (req, res) => {
    const { nome, codigo, descricao } = req.body;
    if (!nome || !codigo) return res.status(400).json({ error: "Nome e código são obrigatórios" });

    // Inserção no Supabase para manter consistência com search/delete
    const { data, error } = await supabase.from("itens").insert([{ nome, codigo, descricao }]).select();
    
    // Fallback para o mock local (Requisito H)
    const novo = { id: data ? data[0].id : String(itens.length + 1), nome, codigo, descricao };
    itens.push(novo);

    if (error) return res.status(500).json(error);
    return res.status(201).json(novo);
};

// Requisito D: Rota DELETE para excluir um item
export const deleteItem = async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from("itens").delete().eq("id", id);
    if (error) return res.status(500).json(error);
    res.json({ message: "Item removido com sucesso" });
};

// Requisito F: Rota GET pesquisar item pelo código
export const getItems = async (req, res) => {
    const { codigo } = req.params;
    let query = supabase.from("itens").select("*");

    if (codigo) query = query.eq("codigo", codigo);

    const { data, error } = await query;
    if (error) return res.status(500).json(error);
    res.json(data);
};

// Requisito F (extra): GET logs por data
export const getLogsPorData = (req, res) => {
    const { data } = req.params; // esperado: AAAA-MM-DD
    const filtrados = logsRequisicoes.filter(l => l.data === data);
    return res.json(filtrados);
};

// Compatibilidade com o Frontend Dashboard
export const getHorariosMock = (req, res) => {
    return res.json(disponibilidades);
};

// Requisito G: Gerar PDF
export const generatePDF = (req, res) => {
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=relatorio.pdf');
    doc.pipe(res);
    doc.fontSize(20).text("Relatório de Itens do Sistema", { align: 'center' });
    doc.moveDown();

    // Listagem real dos itens no PDF
    itens.forEach(item => {
        doc.fontSize(12).text(`- ${item.nome} (Código: ${item.codigo})`);
        if(item.descricao) doc.fontSize(10).text(`  Descrição: ${item.descricao}`);
        doc.moveDown(0.5);
    });

    doc.end();
};

