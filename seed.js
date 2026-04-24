import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

const hashPassword = (password) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
};

async function seed() {
    console.log("🚀 Iniciando semeadura de dados...");

    const passwordHash = hashPassword("123456");

    // 1. Criar Usuários (Profissionais e Alunos)
    const usuarios = [
        { nome: "Dr. Ricardo Silva", email: "ricardo@email.com", senha: passwordHash, tipo_usuario: "profissional", especialidade: "Cardiologia" },
        { nome: "Dra. Ana Costa", email: "ana@email.com", senha: passwordHash, tipo_usuario: "profissional", especialidade: "Pediatria" },
        { nome: "Dr. Marcos Souza", email: "marcos@email.com", senha: passwordHash, tipo_usuario: "profissional", especialidade: "Clínico Geral" },
        { nome: "Maria Silva", email: "maria@email.com", senha: passwordHash, tipo_usuario: "aluno" },
        { nome: "João Santos", email: "joao@email.com", senha: passwordHash, tipo_usuario: "aluno" },
        { nome: "Ana Oliveira", email: "ana.aluna@email.com", senha: passwordHash, tipo_usuario: "aluno" }
    ];

    console.log("👥 Inserindo usuários...");
    const { data: usersData, error: usersError } = await supabase.from('usuarios').upsert(usuarios, { onConflict: 'email' }).select();
    if (usersError) console.error("Erro ao inserir usuários:", usersError);

    // 2. Criar Itens (Inventário)
    const itens = [
        { nome: "Termômetro Digital", codigo: "MED001", descricao: "Termômetro infravermelho de alta precisão", quantidade: 15, status: "Ativo" },
        { nome: "Estetoscópio Littmann", codigo: "MED002", descricao: "Estetoscópio Classic III Black Edition", quantidade: 5, status: "Ativo" },
        { nome: "Esfigmomanômetro", codigo: "MED003", descricao: "Aparelho de pressão manual com manguito", quantidade: 8, status: "Ativo" },
        { nome: "Balança Digital", codigo: "MED004", descricao: "Balança antropométrica digital até 200kg", quantidade: 2, status: "Manutenção" },
        { nome: "Kit Primeiros Socorros", codigo: "KIT001", descricao: "Maleta completa para emergências", quantidade: 10, status: "Ativo" },
        { nome: "Oxímetro de Pulso", codigo: "MED005", descricao: "Oxímetro de dedo digital", quantidade: 12, status: "Ativo" },
        { nome: "Nebulizador", codigo: "MED006", descricao: "Nebulizador de rede portátil", quantidade: 4, status: "Inativo" }
    ];

    console.log("📦 Inserindo itens...");
    const { error: itensError } = await supabase.from('itens').upsert(itens, { onConflict: 'codigo' });
    if (itensError) console.error("Erro ao inserir itens:", itensError);

    // 3. Criar Disponibilidades para os Profissionais
    if (usersData) {
        const profs = usersData.filter(u => u.tipo_usuario === 'profissional');
        const disponibilidades = [];
        const dias = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];
        const horarios = ["08:00", "09:00", "10:00", "14:00", "15:00", "16:00"];

        profs.forEach(p => {
            dias.forEach(dia => {
                disponibilidades.push({
                    profissional_id: p.id,
                    dia_semana: dia,
                    horarios: horarios
                });
            });
        });

        console.log("📅 Inserindo disponibilidades...");
        const { error: dispError } = await supabase.from('disponibilidades').upsert(disponibilidades, { onConflict: 'profissional_id,dia_semana' });
        if (dispError) console.error("Erro ao inserir disponibilidades:", dispError);

        // 4. Criar Agendamentos
        const alunos = usersData.filter(u => u.tipo_usuario === 'aluno');
        const agendamentos = [];
        const statusList = ["Pendente", "Confirmado", "Atendido", "Cancelado"];
        
        // Gerar agendamentos para o mês atual
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');

        for (let i = 0; i < 20; i++) {
            const randomAluno = alunos[Math.floor(Math.random() * alunos.length)];
            const randomProf = profs[Math.floor(Math.random() * profs.length)];
            const dia = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
            const hora = horarios[Math.floor(Math.random() * horarios.length)];
            const status = statusList[Math.floor(Math.random() * statusList.length)];

            agendamentos.push({
                usuario_id: randomAluno.id,
                profissional_id: randomProf.id,
                especialidade: randomProf.especialidade,
                data: `${ano}-${mes}-${dia}`,
                hora: hora,
                status: status
            });
        }

        console.log("📝 Inserindo agendamentos...");
        const { error: agError } = await supabase.from('agendamentos').insert(agendamentos);
        if (agError) console.error("Erro ao inserir agendamentos:", agError);
    }

    // 5. Criar Logs
    const logs = [
        { acao: "Login", usuario_nome: "Dr. Ricardo Silva", detalhes: "Acesso ao painel administrativo", created_at: new Date().toISOString() },
        { acao: "Criação de Item", usuario_nome: "Dra. Ana Costa", detalhes: "Cadastrou novo Oxímetro", created_at: new Date().toISOString() },
        { acao: "Alteração de Status", usuario_nome: "Sistema", detalhes: "Agendamento marcado como Atendido", created_at: new Date().toISOString() }
    ];

    console.log("📜 Inserindo logs...");
    const { error: logsError } = await supabase.from('logs').insert(logs);
    if (logsError) console.error("Erro ao inserir logs:", logsError);

    console.log("✅ Semeadura concluída!");
}

seed();
