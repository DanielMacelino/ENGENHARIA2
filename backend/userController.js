import jwt from "jsonwebtoken";
import PDFDocument from "pdfkit";
import crypto from "crypto";
import { supabase } from "./supabaseClient.js";
import nodemailer from "nodemailer";

const JWT_SECRET = "ifce_posto_saude_secret";
const mfaCodes = new Map(); // Store 2FA codes in memory

// Função para criptografar senha (Requisito F)
export const hashPassword = (password) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
};

// Configuração do Transportador de E-mail (Requisito H - Real)
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // true para 465, false para outras portas
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// Função para verificar senha (Requisito F)
const verifyPassword = (password, storedPassword) => {
    if (!storedPassword.includes(':')) return password === storedPassword; // Fallback para senhas antigas em texto puro
    const [salt, hash] = storedPassword.split(':');
    const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
};

const logsRequisicoes = [];

export const registrarLog = async (metodo, rota, usuario_nome = "Sistema") => {
    try {
        const agora = new Date();
        const data = agora.toISOString().split("T")[0];
        // Ignorar logs de arquivos estáticos e do próprio log para não poluir
        if (rota.includes('.') || rota.includes('/api/logs')) return;

        await supabase.from("logs").insert([{
            acao: `${metodo} ${rota}`,
            detalhes: `Acesso à rota via sistema`,
            usuario_nome: usuario_nome,
            data: data
        }]).then(({ error }) => {
            if (error && error.message.includes('column "acao"')) {
                // Fallback se a coluna 'acao' não existir (usa apenas detalhes)
                return supabase.from("logs").insert([{
                    detalhes: `${metodo} ${rota} - Acesso via Browser`,
                    usuario_nome: usuario_nome,
                    data: data
                }]);
            }
        });

    } catch (e) {
        // Silencioso para não travar a requisição principal
    }
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
        
        console.log(`[2FA] Código gerado para ${usuario.email}: ${codigo2FA}`);

        // Envio condicional de 2FA (Requisito H)
        if (usuario.email === 'dev.danielmarcelino@gmail.com') {
            // Envio Real via E-mail para Daniel
            try {
                await transporter.sendMail({
                    from: `"Agenda IFCE" <${process.env.SMTP_USER}>`,
                    to: usuario.email,
                    subject: "Seu Código de Segurança - Agenda IFCE",
                    html: `
                        <div style="font-family: sans-serif; max-width: 500px; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                            <h2 style="color: #1e6d38;">Olá, ${usuario.nome}!</h2>
                            <p>Você solicitou acesso ao sistema. Use o código abaixo para completar seu login:</p>
                            <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 2rem; font-weight: bold; letter-spacing: 5px; color: #1e6d38; border-radius: 8px;">
                                ${codigo2FA}
                            </div>
                            <p style="font-size: 0.8rem; color: #666; margin-top: 20px;">
                                Este código expira em breve. Se você não solicitou este acesso, ignore este e-mail.
                            </p>
                        </div>
                    `
                });
                console.log(`[SMTP] E-mail enviado com sucesso para ${usuario.email}`);
            } catch (e) {
                console.error("Falha ao enviar e-mail real (verifique as credenciais no .env):", e.message);
            }
        } else {
            // Outros usuários: Apenas Terminal (Simulação)
            console.log(`[MOCK 2FA] Código para acesso: ${codigo2FA} (Apenas terminal para este usuário)`);
        }

        return res.json({ 
            requires_2fa: true, 
            email: usuario.email, 
            codigo_debug: codigo2FA, // Enviando para o console do desenvolvedor facilitar o teste na Vercel
            message: "Código de 2FA gerado (Verifique o console do navegador)." 
        });
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
        } else if (tipo === 'atestado' || tipo === 'receita') {
            const { agendamento_id } = req.query;
            if (!agendamento_id) {
                return res.status(400).json({ error: "ID do agendamento é obrigatório." });
            }

            const { data: ag, error: errAg } = await supabase
                .from("agendamentos")
                .select(`
                    data, hora, especialidade, status, observacoes,
                    usuarios!agendamentos_usuario_id_fkey (nome),
                    profissional:usuarios!agendamentos_profissional_id_fkey (nome)
                `)
                .eq("id", agendamento_id)
                .single();
            
            if (errAg || !ag) {
                return res.status(404).json({ error: "Agendamento não encontrado." });
            }
            if (ag.status !== 'Atendido') {
                return res.status(400).json({ error: "Documento disponível apenas para consultas concluídas." });
            }
            dadosAgendamentos = [ag];
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
        
        let dataEmissao = new Date().toLocaleString('pt-BR');
        if ((tipo === 'atestado' || tipo === 'receita') && dadosAgendamentos && dadosAgendamentos.length > 0) {
            const ag = dadosAgendamentos[0];
            const dataFmt = ag.data ? ag.data.split('-').reverse().join('/') : 'N/A';
            dataEmissao = `${dataFmt} às ${ag.hora}`;
        }

        doc.fillColor('#ffffff')
           .fontSize(8)
           .text(`Emitido em: ${dataEmissao}`, 400, 75);

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
        } else if (tipo === 'atestado') {
            // --- ATESTADO DE COMPARECIMENTO ---
            const ag = dadosAgendamentos[0];
            doc.fontSize(20).fillColor(greenPrimary).text("ATESTADO DE COMPARECIMENTO", 50, 150, { align: 'center' });
            doc.moveDown(2);
            
            doc.fontSize(12).fillColor('#333333');
            const dataFormatada = ag.data ? ag.data.split('-').reverse().join('/') : 'N/A';
            const nomePaciente = ag.usuarios ? ag.usuarios.nome : 'N/A';
            const nomeProfissional = ag.profissional ? ag.profissional.nome : 'N/A';
            
            const textoAtestado = `Atestamos para os devidos fins que o(a) paciente ${nomePaciente} compareceu à consulta da especialidade ${ag.especialidade} no Posto de Saúde do IFCE Campus Crato no dia ${dataFormatada} às ${ag.hora}.\n\nO atendimento foi devidamente concluído pelo(a) profissional ${nomeProfissional}.`;
            
            doc.text(textoAtestado, { align: 'justify', lineGap: 6 });
            doc.moveDown(5);
            
            // Linha de assinatura
            doc.strokeColor('#cccccc').lineWidth(1).moveTo(150, doc.y).lineTo(462, doc.y).stroke();
            doc.moveDown(0.5);
            doc.fontSize(10).fillColor('#666666').text(`Assinatura Eletrônica do Posto de Saúde\nIFCE Campus Crato`, { align: 'center' });
        } else if (tipo === 'receita') {
            // --- RECEITUÁRIO DIGITAL ---
            const ag = dadosAgendamentos[0];
            doc.fontSize(20).fillColor(greenPrimary).text("RECEITUÁRIO MÉDICO", 50, 150, { align: 'center' });
            doc.moveDown(2);
            
            doc.fontSize(12).fillColor('#333333');
            const dataFormatada = ag.data ? ag.data.split('-').reverse().join('/') : 'N/A';
            const nomePaciente = ag.usuarios ? ag.usuarios.nome : 'N/A';
            const nomeProfissional = ag.profissional ? ag.profissional.nome : 'N/A';

            let prescricao = 'N/A';
            try {
                const obsJSON = JSON.parse(ag.observacoes);
                prescricao = obsJSON.prescricao || 'N/A';
            } catch (e) {
                prescricao = ag.observacoes || 'N/A';
            }
            
            doc.text(`Paciente: ${nomePaciente}`, { align: 'left', continued: false });
            doc.text(`Data: ${dataFormatada}`, { align: 'left' });
            doc.moveDown(2);
            
            doc.fontSize(14).text("PRESCRIÇÃO / ORIENTAÇÕES:", { underline: true });
            doc.moveDown(1);
            doc.fontSize(12).text(prescricao, { align: 'left', lineGap: 6 });
            
            doc.moveDown(5);
            
            // Linha de assinatura
            doc.strokeColor('#cccccc').lineWidth(1).moveTo(150, doc.y).lineTo(462, doc.y).stroke();
            doc.moveDown(0.5);
            doc.fontSize(10).fillColor('#666666').text(`Dr(a). ${nomeProfissional}\n${ag.especialidade} - IFCE Campus Crato`, { align: 'center' });

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
        // Limpar nome do arquivo de caracteres especiais
        const cleanName = req.file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
        const fileName = `${Date.now()}-${cleanName}`;
        
        console.log(`[UPLOAD] Iniciando upload para bucket: ${bucket}, arquivo: ${fileName}`);

        // 1. Upload para o Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(fileName, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: true
            });

        if (uploadError) {
            console.error("[UPLOAD ERROR] Falha no Storage:", uploadError);
            if (uploadError.message === 'bucket_not_found') {
                return res.status(500).json({ 
                    error: "Configuração do Supabase pendente.", 
                    details: `O bucket '${bucket}' não foi encontrado. Por favor, crie um bucket público chamado '${bucket}' no painel do Supabase.` 
                });
            }
            throw uploadError;
        }

        // 2. Gerar a URL pública
        const { data: publicUrlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(fileName);
        
        const publicUrl = publicUrlData.publicUrl;
        console.log(`[UPLOAD] URL gerada: ${publicUrl}`);

        // 3. Atualizar a foto no perfil do usuário
        if (usuario_id) {
            const { error: updateError } = await supabase
                .from('usuarios')
                .update({ foto_url: publicUrl })
                .eq('id', usuario_id);
            
            if (updateError) {
                console.error("[UPLOAD ERROR] Erro ao vincular ao usuário:", updateError);
            } else {
                console.log(`[UPLOAD] Foto vinculada ao usuário ${usuario_id}`);
            }
        }

        return res.status(201).json({
            message: "Imagem salva com sucesso!",
            url: publicUrl
        });

    } catch (err) {
        console.error("[UPLOAD FATAL ERROR]:", err);
        return res.status(500).json({ 
            error: "Erro ao processar imagem.", 
            details: err.message || "Erro desconhecido no servidor."
        });
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

// =====================================================
// RELATÓRIO DE MONITORAMENTO - PDF com métricas de acesso
// =====================================================
export const relatorioMonitoramento = async (req, res) => {
    try {
        const currentMonth = new Date().toISOString().slice(0, 7);
        
        // 1. Buscar logs do mês atual - Usamos select("*") para evitar erro de coluna inexistente
        const { data: logs, error } = await supabase
            .from("logs")
            .select("*")
            .gte("created_at", `${currentMonth}-01T00:00:00Z`);

        if (error) throw error;

        // 2. Análise de Rotas (Frequência)
        const rotasCount = {};
        logs.forEach(log => {
            // Tenta 'acao', senão busca 'metodo' e 'rota' ou fallback
            let rota = log.acao || (log.metodo ? `${log.metodo} ${log.rota}` : null) || "Rota não identificada";
            rotasCount[rota] = (rotasCount[rota] || 0) + 1;
        });

        // 3. Análise de Horário de Pico
        const horasCount = new Array(24).fill(0);
        logs.forEach(log => {
            const dataLog = log.created_at || log.data;
            if (dataLog) {
                const hora = new Date(dataLog).getUTCHours();
                horasCount[hora]++;
            }
        });


        const picoHora = horasCount.indexOf(Math.max(...horasCount));
        const totalAcessos = logs.length;

        // 4. Gerar PDF
        const doc = new PDFDocument({ margin: 50 });
        res.setHeader('Content-Type', 'application/pdf');
        router.post("/distancia", Controller.calcularDistancia);
        router.get("/relatorio-monitoramento", Controller.relatorioMonitoramento);
        router.get("/mural", Controller.getMensagensMural);
        router.post("/mural", Controller.salvarMensagemMural);
        res.setHeader('Content-Disposition', 'attachment; filename=relatorio_monitoramento.pdf');
        doc.pipe(res);

        const greenPrimary = '#1e6d38';

        // Cabeçalho
        doc.rect(0, 0, 612, 80).fill(greenPrimary);
        doc.fillColor('#ffffff').fontSize(18).text("RELATÓRIO DE MONITORAMENTO DE ACESSOS", 50, 30);
        doc.fontSize(10).text(`Mês de Referência: ${currentMonth} | Total de Requisições: ${totalAcessos}`, 50, 55);

        doc.moveDown(4);
        doc.fillColor('#333333');

        // Seção: Horário de Pico
        doc.fontSize(14).fillColor(greenPrimary).text("Análise de Pico de Uso", 50, 100);
        doc.moveDown(0.5);
        doc.fontSize(11).fillColor('#333').text(`O horário com maior volume de acessos no sistema é às ${picoHora}:00h.`);
        doc.moveDown(2);

        // Seção: Tabela de Rotas
        doc.fontSize(14).fillColor(greenPrimary).text("Frequência de Acesso por Rota", 50, 150);
        doc.moveDown(1);

        // Cabeçalho Tabela
        doc.fontSize(10).fillColor('#666');
        doc.text("MÉTODO / ROTA", 50, 170);
        doc.text("TOTAL DE ACESSOS", 450, 170, { align: 'right', width: 100 });
        doc.strokeColor('#eee').moveTo(50, 185).lineTo(550, 185).stroke();

        let y = 195;
        Object.entries(rotasCount)
            .sort((a, b) => b[1] - a[1]) // Mais acessados primeiro
            .slice(0, 25) // Top 25
            .forEach(([rota, count], index) => {
                if (index % 2 === 0) doc.rect(50, y - 5, 500, 20).fill('#f9f9f9');
                
                doc.fillColor('#333').fontSize(9);
                doc.text(rota, 60, y);
                doc.text(count.toString(), 450, y, { align: 'right', width: 100 });
                
                y += 20;
                if (y > 700) {
                    doc.addPage();
                    y = 50;
                }
            });

        doc.end();

    } catch (err) {
        console.error("Erro no relatório de monitoramento:", err);
        res.status(500).json({ error: "Erro ao gerar relatório." });
    }
};

// =====================================================
// MURAL DE COMUNICAÇÃO - Persistência das Mensagens
// =====================================================
export const getMensagensMural = async (req, res) => {
    try {
        const { data: mensagens, error } = await supabase
            .from("mensagens_mural")
            .select("*")
            .order("created_at", { ascending: true })
            .limit(50);

        if (error) throw error;
        return res.json(mensagens || []);
    } catch (err) {
        console.error("[MURAL ERROR]:", err);
        return res.status(500).json({ error: "Erro ao carregar histórico do mural." });
    }
};

export const salvarMensagemMural = async (req, res) => {
    const { usuario_id, nome, texto } = req.body;
    
    if (!usuario_id || !texto) return res.status(400).json({ error: "Dados incompletos." });

    try {
        const { data: novaMensagem, error } = await supabase
            .from("mensagens_mural")
            .insert([{ usuario_id, nome, texto }])
            .select()
            .single();

        if (error) throw error;
        return res.status(201).json(novaMensagem);
    } catch (err) {
        console.error("[MURAL ERROR]:", err);
        return res.status(500).json({ error: "Erro ao salvar mensagem no mural." });
    }
};