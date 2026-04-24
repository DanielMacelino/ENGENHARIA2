import { supabase } from "../supabaseClient.js";
import crypto from "crypto";

const hashPassword = (password) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
};

export async function seedDatabase() {
    console.log("🚀 Iniciando semeadura de dados...");

    const passwordHash = hashPassword("123456");

    // 1. Criar Usuários (Profissionais e Alunos)
    const usuarios = [
        { nome: "Daniel Marcelino", email: "daniel@email.com", senha: passwordHash, tipo_usuario: "profissional", especialidade: "Administrador" },
        { nome: "Vitoria", email: "vitoria@email.com", senha: passwordHash, tipo_usuario: "profissional", especialidade: "Enfermeira Chefe" },
        { nome: "Alexandre", email: "alexandre@email.com", senha: passwordHash, tipo_usuario: "profissional", especialidade: "Médico Geral" },
        { nome: "Dr. Ricardo Silva", email: "ricardo@email.com", senha: passwordHash, tipo_usuario: "profissional", especialidade: "Cardiologia" },
        { nome: "Dra. Ana Costa", email: "ana@email.com", senha: passwordHash, tipo_usuario: "profissional", especialidade: "Pediatria" }
    ];

    // Gerar 100 alunos com diversidade
    const nomes = ["Lucas", "Gabriel", "Matheus", "Vitoria", "Juliana", "Felipe", "Rodrigo", "Larissa", "Beatriz", "Enzo", "Valentina", "Arthur", "Heloisa", "Gustavo", "Caio", "Luana", "Mariana", "Tiago", "Igor", "Camila"];
    const sobrenomes = ["Silva", "Santos", "Oliveira", "Souza", "Pereira", "Costa", "Ferreira", "Rodrigues", "Almeida", "Nascimento", "Lima", "Araújo", "Martins", "Carvalho", "Melo", "Barbosa", "Ribeiro", "Gomes", "Cavalcanti", "Moreira"];

    for (let i = 1; i <= 100; i++) {
        const nomeAleatorio = nomes[Math.floor(Math.random() * nomes.length)];
        const sobrenome1 = sobrenomes[Math.floor(Math.random() * sobrenomes.length)];
        const sobrenome2 = sobrenomes[Math.floor(Math.random() * sobrenomes.length)];
        const nomeCompleto = `${nomeAleatorio} ${sobrenome1} ${sobrenome2}`;
        const email = `${nomeAleatorio.toLowerCase()}.${sobrenome1.toLowerCase()}${i}@email.com`;
        
        usuarios.push({
            nome: nomeCompleto,
            email: email,
            senha: passwordHash,
            tipo_usuario: "aluno"
        });
    }

    const { data: usersData, error: usersError } = await supabase.from('usuarios').upsert(usuarios, { onConflict: 'email' }).select();
    if (usersError) throw new Error("Erro ao inserir usuários: " + usersError.message);

    // 2. Criar Itens (Inventário)
    const itens = [
        { nome: "Termômetro Digital", codigo: "MED001", descricao: "Termômetro infravermelho de alta precisão", quantidade: 15, status: "Ativo" },
        { nome: "Estetoscópio Littmann", codigo: "MED002", descricao: "Estetoscópio Classic III Black Edition", quantidade: 5, status: "Ativo" },
        { nome: "Esfigmomanômetro", codigo: "MED003", descricao: "Aparelho de pressão manual com manguito", quantidade: 8, status: "Ativo" },
        { nome: "Balança Digital", codigo: "MED004", descricao: "Balança antropométrica digital até 200kg", quantidade: 2, status: "Manutenção" },
        { nome: "Kit Primeiros Socorros", codigo: "KIT001", descricao: "Maleta completa para emergências", quantidade: 10, status: "Ativo" }
    ];

    const { error: itensError } = await supabase.from('itens').upsert(itens, { onConflict: 'codigo' });
    if (itensError) throw new Error("Erro ao inserir itens: " + itensError.message);

    // 3. Criar Disponibilidades
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

        await supabase.from('disponibilidades').upsert(disponibilidades, { onConflict: 'profissional_id,dia_semana' });

        // 4. Criar Agendamentos
        const alunos = usersData.filter(u => u.tipo_usuario === 'aluno');
        const agendamentos = [];
        const statusList = ["Pendente", "Confirmado", "Atendido", "Cancelado"];
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');

        for (let i = 0; i < 15; i++) {
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

        await supabase.from('agendamentos').insert(agendamentos);
    }

    // 5. Criar Logs
    const logs = [
        { acao: "Login", usuario_nome: "Dr. Ricardo Silva", detalhes: "Acesso ao painel administrativo", created_at: new Date().toISOString() },
        { acao: "Criação de Item", usuario_nome: "Sistema", detalhes: "Sincronização de inventário concluída", created_at: new Date().toISOString() }
    ];

    await supabase.from('logs').insert(logs);

    return true;
}
