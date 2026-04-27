import { supabase } from './backend/supabaseClient.js';
import crypto from 'crypto';

const hashPassword = (password) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
};

async function createDaniel() {
    const email = 'dev.danielmarcelino@gmail.com';
    const nome = 'Daniel Marcelino';
    const senha = 'senha123'; // Senha temporária
    const tipo_usuario = 'profissional';
    const especialidade = 'Engenheiro de Software / Gestor';

    console.log(`Criando usuário ${nome}...`);

    const { data: existente } = await supabase.from('usuarios').select('id').eq('email', email).single();

    if (existente) {
        console.log('Usuário já existe.');
        return;
    }

    const { data, error } = await supabase
        .from('usuarios')
        .insert([{ 
            nome, 
            email, 
            senha: hashPassword(senha), 
            tipo_usuario, 
            especialidade,
            foto_url: 'https://ui-avatars.com/api/?name=Daniel+Marcelino&background=1e6d38&color=fff'
        }])
        .select();

    if (error) {
        console.error('Erro ao criar:', error);
    } else {
        console.log('Usuário criado com sucesso!', data);
    }
}

createDaniel();
