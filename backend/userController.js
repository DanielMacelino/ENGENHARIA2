import jwt from "jsonwebtoken";
import PDFDocument from "pdfkit";
import { supabase } from "./src/config/supabaseClient.js";

const JWT_SECRET = "ifce_posto_saude_secret";

const logsRequisicoes = [];

export const registrarLog = (metodo, rota) => {
    const agora = new Date();
    const data = agora.toISOString().split("T")[0];
    const hora = agora.toLocaleTimeString();
    logsRequisicoes.push({ metodo, rota, data, hora });
};

// =====================================================
// LOGIN - Busca usuário no Supabase
// =====================================================
export const login = async (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({ error: "Email e senha são obrigatórios." });
    }

    try {
        const { data: usuarios, error } = await supabase
            .from("usuarios")
            .select("*")
            .eq("email", email)
            .eq("senha", senha)
            .single();

        if (error || !usuarios) {
            return res.status(401).json({ error: "Credenciais inválidas." });
        }

        const token = jwt.sign(
            { id: usuarios.id, email: usuarios.email, tipo_usuario: usuarios.tipo_usuario },
            JWT_SECRET,
            { expiresIn: "1h" }
        );

        return res.json({ token, tipo_usuario: usuarios.tipo_usuario });
    } catch (err) {
        return res.status(500).json({ error: "Erro ao fazer login." });
    }
};

// =====================================================
// GET ITENS - Lista todos os itens do Supabase
// =====================================================
export const getItens = async (req, res) => {
    try {
        const { data: itens, error } = await supabase
            .from("itens")
            .select("*");

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        return res.json(itens);
    } catch (err) {
        return res.status(500).json({ error: "Erro ao buscar itens." });
    }
};

// =====================================================
// CRIAR ITEM - Insere novo item no Supabase
// =====================================================
export const criarItem = async (req, res) => {
    const { nome, codigo, descricao } = req.body;

    if (!nome || !codigo) {
        return res.status(400).json({ error: "Nome e código são obrigatórios." });
    }

    try {
        const { data: novoItem, error } = await supabase
            .from("itens")
            .insert([{ nome, codigo, descricao, quantidade: 1, status: "Disponível" }])
            .select()
            .single();

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        return res.status(201).json(novoItem);
    } catch (err) {
        return res.status(500).json({ error: "Erro ao criar item." });
    }
};

// =====================================================
// DELETE ITEM - Remove item do Supabase
// =====================================================
export const deleteItem = async (req, res) => {
    const { id } = req.params;

    try {
        const { error } = await supabase
            .from("itens")
            .delete()
            .eq("id", id);

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        return res.json({ message: "Item removido com sucesso." });
    } catch (err) {
        return res.status(500).json({ error: "Erro ao deletar item." });
    }
};

// =====================================================
// GET ITEM POR CÓDIGO - Busca item por código
// =====================================================
export const getItems = async (req, res) => {
    const { codigo } = req.params;

    try {
        const { data: item, error } = await supabase
            .from("itens")
            .select("*")
            .eq("codigo", codigo)
            .single();

        if (error || !item) {
            return res.status(404).json({ error: "Item não encontrado." });
        }

        return res.json(item);
    } catch (err) {
        return res.status(500).json({ error: "Erro ao buscar item." });
    }
};

// =====================================================
// GET LOGS POR DATA - Busca logs de uma data específica
// =====================================================
export const getLogsPorData = async (req, res) => {
    const { data } = req.params;

    try {
        const { data: logs, error } = await supabase
            .from("logs")
            .select("*")
            .eq("data", data);

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        return res.json(logs || []);
    } catch (err) {
        return res.status(500).json({ error: "Erro ao buscar logs." });
    }
};

// =====================================================
// GENERATE PDF - Gera relatório em PDF dos itens
// =====================================================
export const generatePDF = async (req, res) => {
    try {
        const { data: itens, error } = await supabase
            .from("itens")
            .select("*");

        if (error) {
            return res.status(500).json({ error: error.message });
        }

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
    } catch (err) {
        return res.status(500).json({ error: "Erro ao gerar PDF." });
    }
};

// =====================================================
// GET HORÁRIOS - Lista disponibilidades dos profissionais
// =====================================================
export const getHorarios = async (req, res) => {
    const { especialidade } = req.query;

    try {
        let query = supabase
            .from("disponibilidades")
            .select(`
                id,
                profissional_id,
                dia_semana,
                horarios,
                usuarios (
                    id,
                    nome,
                    especialidade
                )
            `);

        // Se filtrar por especialidade, join com usuarios
        if (especialidade) {
            const { data: profissionais, error: errProf } = await supabase
                .from("usuarios")
                .select("id")
                .eq("especialidade", especialidade);

            if (errProf) return res.status(500).json({ error: errProf.message });

            const profIds = profissionais.map(p => p.id);
            query = query.in("profissional_id", profIds);
        }

        const { data: disponibilidades, error } = await query;

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        return res.json(disponibilidades);
    } catch (err) {
        return res.status(500).json({ error: "Erro ao buscar horários." });
    }
};

// =====================================================
// CRIAR AGENDAMENTO - Marca nova consulta
// =====================================================
export const criarAgendamento = async (req, res) => {
    const { usuario_id, profissional_id, data, hora, especialidade } = req.body;

    if (!usuario_id || !profissional_id || !data || !hora || !especialidade) {
        return res.status(400).json({ error: "Todos os campos são obrigatórios." });
    }

    try {
        const { data: novoAgendamento, error } = await supabase
            .from("agendamentos")
            .insert([{
                usuario_id,
                profissional_id,
                especialidade,
                data,
                hora,
                status: "Pendente"
            }])
            .select()
            .single();

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        return res.status(201).json({ 
            message: "Agendamento criado com sucesso.", 
            agendamento: novoAgendamento 
        });
    } catch (err) {
        return res.status(500).json({ error: "Erro ao criar agendamento." });
    }
};

// =====================================================
// SALVAR DISPONIBILIDADE - Define horários do profissional
// =====================================================
export const salvarDisponibilidade = async (req, res) => {
    const { profissional_id, dia_semana, horarios } = req.body;

    if (!profissional_id || !dia_semana || !horarios || !horarios.length) {
        return res.status(400).json({ error: "Profissional, dia da semana e horários são obrigatórios." });
    }

    try {
        // Tenta atualizar se já existe
        const { data: existing, error: errCheck } = await supabase
            .from("disponibilidades")
            .select("id")
            .eq("profissional_id", profissional_id)
            .eq("dia_semana", dia_semana)
            .single();

        let resultado, erro;

        if (existing) {
            // Update
            ({ data: resultado, error: erro } = await supabase
                .from("disponibilidades")
                .update({ horarios })
                .eq("profissional_id", profissional_id)
                .eq("dia_semana", dia_semana)
                .select()
                .single());
        } else {
            // Insert
            ({ data: resultado, error: erro } = await supabase
                .from("disponibilidades")
                .insert([{ profissional_id, dia_semana, horarios }])
                .select()
                .single());
        }

        if (erro) {
            return res.status(500).json({ error: erro.message });
        }

        return res.status(201).json({ 
            message: "Disponibilidade salva com sucesso.", 
            disponibilidade: resultado 
        });
    } catch (err) {
        return res.status(500).json({ error: "Erro ao salvar disponibilidade." });
    }
};