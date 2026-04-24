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
// GET PROFISSIONAIS - Lista usuários do tipo profissional
// =====================================================
export const getProfissionais = async (req, res) => {
    try {
        const { data: profissionais, error } = await supabase
            .from("usuarios")
            .select("id, nome, especialidade, foto_url")
            .eq("tipo_usuario", "profissional");

        if (error) throw error;
        return res.json(profissionais);
    } catch (err) {
        return res.status(500).json({ error: "Erro ao buscar profissionais." });
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
// GET LOGS - Lista todos os logs (audit)
// =====================================================
export const getLogs = async (req, res) => {
    try {
        const { data: logs, error } = await supabase
            .from("logs")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(100);

        if (error) throw error;
        return res.json(logs || []);
    } catch (err) {
        return res.status(500).json({ error: "Erro ao buscar logs." });
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
// GENERATE PDF - Gera relatório em PDF escalável (itens ou agendamentos)
// =====================================================
export const generatePDF = async (req, res) => {
    try {
        const { tipo, profissional_id } = req.query;
        let dadosAgendamentos = null;
        let dadosItens = null;

        if (tipo === 'agendamentos') {
            if (!profissional_id || profissional_id === 'undefined') {
                return res.status(400).json({ error: "ID do profissional é obrigatório." });
            }
            
            const currentMonth = new Date().toISOString().slice(0, 7);
            const [year, month] = currentMonth.split('-');
            const lastDay = new Date(year, month, 0).getDate();
            const startDate = `${currentMonth}-01`;
            const endDate = `${currentMonth}-${lastDay}`;

            const { data: agendamentos, error } = await supabase
                .from("agendamentos")
                .select(`
                    id,
                    data,
                    hora,
                    especialidade,
                    status,
                    usuarios!agendamentos_usuario_id_fkey (nome)
                `)
                .eq("profissional_id", profissional_id)
                .gte("data", startDate)
                .lte("data", endDate)
                .order("data", { ascending: true })
                .order("hora", { ascending: true });

            if (error) {
                return res.status(500).json({ error: error.message });
            }
            dadosAgendamentos = agendamentos;
        } else {
            // Default: itens
            const { data: itens, error } = await supabase
                .from("itens")
                .select("*");

            if (error) {
                return res.status(500).json({ error: error.message });
            }
            dadosItens = itens;
        }

        // Configuração do Documento
        const doc = new PDFDocument({ margin: 50 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=relatorio_${tipo || 'itens'}.pdf`);
        doc.pipe(res);

        // Cores e Estilos
        const greenPrimary = '#1e6d38';
        const grayText = '#666666';

        // --- CABEÇALHO ---
        doc.rect(0, 0, 612, 100).fill(greenPrimary);
        doc.fillColor('#ffffff')
           .fontSize(18)
           .text("SISTEMA DE AGENDAMENTO - IFCE", 50, 40)
           .fontSize(10)
           .text("Relatório Gerencial do Posto de Saúde - Campus Crato", 50, 65);
        
        doc.fillColor('#ffffff')
           .fontSize(8)
           .text(`Emitido em: ${new Date().toLocaleString('pt-BR')}`, 450, 75);

        doc.moveDown(5);
        doc.fillColor('#333333');

        if (tipo === 'agendamentos') {
            // --- TÍTULO DA SEÇÃO ---
            doc.fontSize(16).fillColor(greenPrimary).text("Relatório de Agendamentos (Mês Atual)", 50, 120);
            doc.moveDown(0.5);
            doc.strokeColor(greenPrimary).lineWidth(1).moveTo(50, 140).lineTo(550, 140).stroke();
            doc.moveDown(1.5);

            if (dadosAgendamentos && dadosAgendamentos.length > 0) {
                // Cabeçalho da Tabela
                doc.fontSize(10).fillColor(grayText);
                doc.text("DATA", 50, 160);
                doc.text("HORA", 120, 160);
                doc.text("PACIENTE", 180, 160);
                doc.text("ESPECIALIDADE", 350, 160);
                doc.text("STATUS", 480, 160);
                
                doc.moveDown(0.5);
                let y = 180;

                dadosAgendamentos.forEach((a, index) => {
                    const nomePaciente = a.usuarios ? a.usuarios.nome : 'N/A';
                    const dataFormatada = a.data ? a.data.split('-').reverse().join('/') : 'N/A';

                    // Zebra striping
                    if (index % 2 === 0) {
                        doc.rect(50, y - 5, 500, 20).fill('#f9f9f9');
                    }

                    doc.fillColor('#333333').fontSize(9);
                    doc.text(dataFormatada, 50, y);
                    doc.text(a.hora, 120, y);
                    doc.text(nomePaciente, 180, y, { width: 160 });
                    doc.text(a.especialidade, 350, y);
                    doc.text(a.status, 480, y);

                    y += 20;

                    // Quebra de página automática
                    if (y > 700) {
                        doc.addPage();
                        y = 50;
                    }
                });
                
                doc.moveDown(2);
                doc.fontSize(10).fillColor(greenPrimary).text(`Total de agendamentos no período: ${dadosAgendamentos.length}`, { align: 'right' });

            } else {
                doc.fontSize(12).text("Nenhum agendamento encontrado para o profissional no mês atual.", { align: 'center' });
            }
        } else {
            // --- RELATÓRIO DE ITENS ---
            doc.fontSize(16).fillColor(greenPrimary).text("Inventário Geral de Itens", 50, 120);
            doc.moveDown(0.5);
            doc.strokeColor(greenPrimary).lineWidth(1).moveTo(50, 140).lineTo(550, 140).stroke();
            doc.moveDown(1.5);

            if (dadosItens && dadosItens.length > 0) {
                doc.fontSize(10).fillColor(grayText);
                doc.text("CÓDIGO", 50, 160);
                doc.text("ITEM / NOME", 120, 160);
                doc.text("QUANTIDADE", 350, 160);
                doc.text("STATUS", 480, 160);

                let y = 180;

                dadosItens.forEach((item, index) => {
                    if (index % 2 === 0) {
                        doc.rect(50, y - 5, 500, 25).fill('#f9f9f9');
                    }

                    doc.fillColor('#333333').fontSize(9);
                    doc.text(item.codigo, 50, y);
                    doc.text(item.nome, 120, y, { width: 220 });
                    doc.text(item.quantidade.toString(), 350, y, { align: 'center', width: 60 });
                    doc.text(item.status, 480, y);

                    y += 25;

                    if (y > 700) {
                        doc.addPage();
                        y = 50;
                    }
                });

                doc.moveDown(2);
                doc.fontSize(10).fillColor(greenPrimary).text(`Total de itens cadastrados: ${dadosItens.length}`, { align: 'right' });
            } else {
                doc.fontSize(12).text("Nenhum item cadastrado no sistema.", { align: 'center' });
            }
        }

        // Rodapé
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
            doc.switchToPage(i);
            doc.fontSize(8).fillColor('#999999').text(
                `Página ${i + 1} de ${range.count} - IFCE Campus Crato`,
                50,
                750,
                { align: 'center' }
            );
        }

        doc.end();
    } catch (err) {
        console.error("Erro interno na geração de PDF:", err);
        if (!res.headersSent) {
            return res.status(500).json({ error: "Erro ao gerar PDF.", details: err.message });
        }
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
        // --- TRAVA DE SEGURANÇA: Verificar se já existe agendamento neste horário ---
        const { data: existente, error: errCheck } = await supabase
            .from("agendamentos")
            .select("id")
            .eq("profissional_id", profissional_id)
            .eq("data", data)
            .eq("hora", hora)
            .neq("status", "Cancelado") // Ignorar os cancelados
            .maybeSingle();

        if (existente) {
            return res.status(400).json({ error: "Este horário já foi preenchido por outro aluno. Por favor, escolha outro." });
        }
        // ---------------------------------------------------------------------------
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
                observacoes,
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
        const currentMonth = new Date().toISOString().slice(0, 7);
        const [year, month] = currentMonth.split('-');
        const lastDay = new Date(year, month, 0).getDate();
        const startDate = `${currentMonth}-01`;
        const endDate = `${currentMonth}-${lastDay}`;

        const { data: agendamentos, error } = await supabase
            .from("agendamentos")
            .select(`
                id,
                data,
                hora,
                especialidade,
                status,
                observacoes,
                usuarios!agendamentos_usuario_id_fkey (
                    nome
                )
            `)
            .eq("profissional_id", profissional_id)
            .gte("data", startDate)
            .lte("data", endDate)
            .order("data", { ascending: true })
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
// GET AGENDAMENTOS POR DATA - Verifica ocupação global
// =====================================================
export const getAgendamentosPorData = async (req, res) => {
    const { data } = req.query;

    if (!data) return res.status(400).json({ error: "Data é obrigatória." });

    try {
        const { data: agendamentos, error } = await supabase
            .from("agendamentos")
            .select("profissional_id, hora, status")
            .eq("data", data)
            .neq("status", "Cancelado");

        if (error) throw error;
        return res.json(agendamentos);
    } catch (err) {
        return res.status(500).json({ error: "Erro ao buscar ocupação." });
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
    const { status, observacoes } = req.body;

    if (!id || !status) {
        return res.status(400).json({ error: "ID e novo status são obrigatórios." });
    }

    try {
        const updateData = { status };
        if (observacoes) updateData.observacoes = observacoes;

        const { data: atualizado, error } = await supabase
            .from("agendamentos")
            .update(updateData)
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

    return res.json({ 
        token, 
        id: usuario.id, 
        tipo_usuario: usuario.tipo_usuario, 
        email: usuario.email,
        nome: usuario.nome,
        foto_url: usuario.foto_url,
        especialidade: usuario.especialidade
    });
};

// =====================================================
// UPLOAD IMAGEM - Salva imagem no Supabase Storage
// =====================================================
export const uploadImagem = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo enviado." });
    }

    try {
        const { usuario_id, bucket = 'imagenspublicas' } = req.body;
        const fileName = `${Date.now()}-${req.file.originalname.replace(/\s/g, '_')}`;
        
        // 1. Upload para o Supabase Storage (Bucket dinâmico)
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(fileName, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: true
            });

        if (uploadError) throw uploadError;

        // 2. Gerar a URL pública do arquivo
        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(fileName);

        // 3. Opcional: Atualizar a foto no perfil do usuário se o ID for enviado
        if (usuario_id) {
            const { error: updateError } = await supabase
                .from('usuarios')
                .update({ foto_url: publicUrl })
                .eq('id', usuario_id);
            
            if (updateError) console.error("Erro ao vincular foto ao usuário:", updateError);
        }

        return res.status(201).json({
            message: "Imagem salva na nuvem com sucesso.",
            url: publicUrl
        });

    } catch (err) {
        console.error("Erro no upload para Supabase:", err);
        return res.status(500).json({ error: "Erro ao salvar imagem na nuvem.", details: err.message });
    }
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

// =====================================================
// GET ESTATÍSTICAS GERAIS - Dashboard de Gestão
// =====================================================
export const getEstatisticasGerais = async (req, res) => {
    try {
        console.log("[STATS] Iniciando coleta de dados profunda...");
        
        // 1. Total de Usuários por Tipo
        const { data: users, error: errUsers } = await supabase.from("usuarios").select("tipo_usuario, especialidade");
        if (errUsers) throw errUsers;

        const totalAlunos = users.filter(u => u.tipo_usuario === 'aluno').length;
        const totalProfs = users.filter(u => u.tipo_usuario === 'profissional').length;

        // 2. Agendamentos
        const { data: agendamentos, error: errAgend } = await supabase.from("agendamentos").select("status, data, especialidade");
        if (errAgend) throw errAgend;

        const statsStatus = {
            Pendente: agendamentos.filter(a => a.status === 'Pendente').length,
            Confirmado: agendamentos.filter(a => a.status === 'Confirmado').length,
            Cancelado: agendamentos.filter(a => a.status === 'Cancelado').length,
            Atendido: agendamentos.filter(a => a.status === 'Atendido').length
        };

        // Distribuição por Especialidade (Demanda)
        const especialidades = {};
        agendamentos.forEach(a => {
            especialidades[a.especialidade] = (especialidades[a.especialidade] || 0) + 1;
        });

        // Tendência Mensal (Agrupado por Mês)
        const tendenciaMensal = {};
        agendamentos.forEach(a => {
            const mes = a.data.substring(0, 7); // YYYY-MM
            tendenciaMensal[mes] = (tendenciaMensal[mes] || 0) + 1;
        });

        // 3. Inventário
        const { data: itens, error: errItens } = await supabase.from("itens").select("quantidade, nome");
        if (errItens) throw errItens;

        const totalItens = itens.length;
        const estoqueBaixo = itens.filter(i => i.quantidade < 5).length;
        const valorEstoque = itens.reduce((acc, i) => acc + (i.quantidade * 15), 0); // Valor padrão de R$ 15 por item
        
        // Gasto Estimado consolidado
        const gastoEstimado = (statsStatus.Atendido * 50) + (itens.reduce((acc, i) => acc + i.quantidade, 0) * 10);

        return res.json({
            usuarios: { total: users.length, alunos: totalAlunos, profissionais: totalProfs },
            agendamentos: { 
                total: agendamentos.length, 
                porStatus: statsStatus,
                porEspecialidade: especialidades,
                tendencia: tendenciaMensal
            },
            inventario: { total: totalItens, estoqueBaixo, valorTotal: valorEstoque },
            financeiro: { gastoEstimado }
        });
    } catch (err) {
        console.error("Erro fatal ao buscar estatísticas:", err);
        return res.status(500).json({ error: "Erro ao carregar estatísticas.", details: err.message });
    }
};