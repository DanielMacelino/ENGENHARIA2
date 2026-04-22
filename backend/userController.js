import jwt from "jsonwebtoken";
import PDFDocument from "pdfkit";
import crypto from "crypto";
import { supabase } from "./supabaseClient.js";
import nodemailer from "nodemailer";

const JWT_SECRET = "ifce_posto_saude_secret";
const mfaCodes = new Map(); // Store 2FA codes in memory

// Função para criptografar senha (Requisito F)
const hashPassword = (password) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
};

// Função para verificar senha (Requisito F)
const verifyPassword = (password, storedPassword) => {
    if (!storedPassword.includes(':')) return password === storedPassword; // Fallback para senhas antigas em texto puro
    const [salt, hash] = storedPassword.split(':');
    const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
};

const logsRequisicoes = [];

export const registrarLog = (metodo, rota) => {
    const agora = new Date();
    const data = agora.toISOString().split("T")[0];
    const hora = agora.toLocaleTimeString();
    logsRequisicoes.push({ metodo, rota, data, hora });
};

// =====================================================
// REGISTRAR USUÁRIO - Novo Cadastro (Requisito F)
// =====================================================
export const registrarUsuario = async (req, res) => {
    const { nome, email, senha, tipo_usuario } = req.body;

    if (!nome || !email || !senha || !tipo_usuario) {
        return res.status(400).json({ error: "Todos os campos são obrigatórios." });
    }

    try {
        const senhaCriptografada = hashPassword(senha);

        const { data: novoUsuario, error } = await supabase
            .from("usuarios")
            .insert([{ nome, email, senha: senhaCriptografada, tipo_usuario }])
            .select()
            .single();

        if (error) {
            if (error.code === '23505') return res.status(400).json({ error: "E-mail já cadastrado." });
            return res.status(500).json({ error: error.message });
        }

        return res.status(201).json({ message: "Usuário cadastrado com sucesso!", id: novoUsuario.id });
    } catch (err) {
        return res.status(500).json({ error: "Erro ao realizar cadastro." });
    }
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
        const { data: usuario, error } = await supabase
            .from("usuarios")
            .select("*")
            .eq("email", email)
            .single();

        if (error || !usuario) {
            return res.status(401).json({ error: "Usuário não encontrado." });
        }

        // Verifica a senha criptografada (Requisito F)
        if (!verifyPassword(senha, usuario.senha)) {
            return res.status(401).json({ error: "Senha incorreta." });
        }

        // Gera código 2FA e envia por e-mail (Requisito H)
        const codigo2FA = Math.floor(100000 + Math.random() * 900000).toString();
        mfaCodes.set(usuario.email, { codigo: codigo2FA, usuario });
        
        console.log(`[2FA MOCK] Código gerado para ${usuario.email}: ${codigo2FA}`);

        // Tentativa de envio real (Mock com console para e-mails fictícios)
        try {
            // Em produção, usar transporter real do nodemailer
            // const transporter = nodemailer.createTransport({ ... });
            // await transporter.sendMail({ to: usuario.email, subject: "Código de Login", text: `Seu código: ${codigo2FA}` });
        } catch (e) {
            console.error("Erro ao enviar email, mas o código está no log para testes.", e);
        }

        return res.json({ requires_2fa: true, email: usuario.email, message: "Código de 2FA enviado para o seu e-mail." });
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
// GET AGENDAMENTOS DO USUÁRIO - Lista agendamentos do aluno
// =====================================================
export const getAgendamentosUsuario = async (req, res) => {
    const { usuario_id } = req.params;

    if (!usuario_id) {
        return res.status(400).json({ error: "ID do usuário é obrigatório." });
    }

    try {
        const { data: agendamentos, error } = await supabase
            .from("agendamentos")
            .select(`
                id,
                data,
                hora,
                especialidade,
                status,
                usuarios!agendamentos_profissional_id_fkey (
                    nome
                )
            `)
            .eq("usuario_id", usuario_id)
            .order("data", { ascending: false });

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        return res.json(agendamentos || []);
    } catch (err) {
        return res.status(500).json({ error: "Erro ao buscar agendamentos." });
    }
};

// =====================================================
// GET AGENDAMENTOS PROFISSIONAL - Lista pacientes para atender hoje
// =====================================================
export const getAgendamentosProfissional = async (req, res) => {
    const { profissional_id } = req.params;

    if (!profissional_id) {
        return res.status(400).json({ error: "ID do profissional é obrigatório." });
    }

    try {
        const hoje = new Date().toISOString().split('T')[0];

        const { data: agendamentos, error } = await supabase
            .from("agendamentos")
            .select(`
                id,
                hora,
                especialidade,
                status,
                usuarios!agendamentos_usuario_id_fkey (
                    nome
                )
            `)
            .eq("profissional_id", profissional_id)
            .eq("data", hoje)
            .order("hora", { ascending: true });

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        return res.json(agendamentos || []);
    } catch (err) {
        return res.status(500).json({ error: "Erro ao buscar agendamentos do profissional." });
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

// =====================================================
// ATUALIZAR STATUS AGENDAMENTO - Confirma, Cancela ou Atende
// =====================================================
export const atualizarStatusAgendamento = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!id || !status) {
        return res.status(400).json({ error: "ID e novo status são obrigatórios." });
    }

    try {
        const { data: atualizado, error } = await supabase
            .from("agendamentos")
            .update({ status })
            .eq("id", id)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        return res.json({ 
            message: `Status atualizado para ${status}.`, 
            agendamento: atualizado 
        });
    } catch (err) {
        return res.status(500).json({ error: "Erro ao atualizar agendamento." });
    }
};

// =====================================================
// VERIFICAR 2FA - Valida o código enviado por e-mail
// =====================================================
export const verificar2FA = (req, res) => {
    const { email, codigo } = req.body;

    if (!email || !codigo) return res.status(400).json({ error: "Email e código são obrigatórios." });

    const mfaData = mfaCodes.get(email);

    if (!mfaData || mfaData.codigo !== codigo) {
        return res.status(401).json({ error: "Código inválido ou expirado." });
    }

    const { usuario } = mfaData;

    const token = jwt.sign(
        { id: usuario.id, email: usuario.email, tipo_usuario: usuario.tipo_usuario },
        JWT_SECRET,
        { expiresIn: "1h" }
    );

    // Remove o código após o uso
    mfaCodes.delete(email);

    return res.json({ token, id: usuario.id, tipo_usuario: usuario.tipo_usuario, email: usuario.email });
};

// =====================================================
// UPLOAD IMAGEM - Salva imagem localmente (preparo para nuvem)
// =====================================================
export const uploadImagem = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo enviado." });
    }

    // A URL seria retornada pelo Supabase Storage. Aqui usamos o caminho local.
    const fileUrl = `/uploads/${req.file.filename}`;
    
    return res.status(201).json({
        message: "Imagem salva com sucesso.",
        url: fileUrl
    });
};

// =====================================================
// CALCULAR DISTÂNCIA - Distância entre dois pontos no mapa
// =====================================================
function grausParaRadianos(graus) {
    return graus * (Math.PI / 180);
}

export const calcularDistancia = (req, res) => {
    const { lat1, lon1, lat2, lon2 } = req.body;

    if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) {
        return res.status(400).json({ error: "Todas as coordenadas (lat1, lon1, lat2, lon2) são obrigatórias." });
    }

    const raioTerraKm = 6371;

    const dLat = grausParaRadianos(lat2 - lat1);
    const dLon = grausParaRadianos(lon2 - lon1);

    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(grausParaRadianos(lat1)) * Math.cos(grausParaRadianos(lat2)) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanciaKm = raioTerraKm * c;

    return res.json({ distancia_km: Number(distanciaKm.toFixed(2)) });
};