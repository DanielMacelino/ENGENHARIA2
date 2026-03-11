import supabase from "../supabaseClient.js"
import jwt from "jsonwebtoken";
import PDFDocument from "pdfkit";

export async function getUsers() {
const { data, error } = await supabase
    .from("users")
    .select("*")

if (error) {
    throw error
}
return data
}

// POST /logar
export const login = async (req, res) => {
    const { email, senha } = req.body;
    // Simulação de validação (No Supabase real usa o auth.signInWithPassword)
    if (email === "aluno@ifce.br" && senha === "123456") {
        const token = jwt.sign({ email }, "SECRET_KEY", { expiresIn: '1h' });
        return res.json({ token });
    }
    res.status(401).json({ error: "Credenciais inválidas" });
};

// GET /itens e busca por código
export const getItems = async (req, res) => {
    const { codigo } = req.params;
    let query = supabase.from("itens").select("*");
    
    if (codigo) query = query.eq("codigo", codigo);

    const { data, error } = await query;
    if (error) return res.status(500).json(error);
    res.json(data);
};

// POST /itens
export const createItem = async (req, res) => {
    const { data, error } = await supabase.from("itens").insert([req.body]);
    if (error) return res.status(500).json(error);
    res.status(201).json(data);
};

// DELETE /itens/:id
export const deleteItem = async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from("itens").delete().eq("id", id);
    if (error) return res.status(500).json(error);
    res.json({ message: "Item removido com sucesso" });
};

// GET /itens/pdf
export const generatePDF = (req, res) => {
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=relatorio.pdf');
    doc.pipe(res);
    doc.fontSize(20).text("Relatório de Itens", { align: 'center' });
    doc.end();
};