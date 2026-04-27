import app from "./app.js";
import { supabase } from "../supabaseClient.js";
import { hashPassword } from "../userController.js";

const PORT = process.env.PORT || 3000;

// Função para garantir que o usuário Daniel Marcelino exista
async function seedUser() {
    const email = 'dev.danielmarcelino@gmail.com';
    const { data: usuario } = await supabase.from('usuarios').select('id').eq('email', email).maybeSingle();

    if (!usuario) {
        console.log(`[SEED] Criando usuário Daniel Marcelino...`);
        await supabase.from('usuarios').insert([{
            nome: 'Daniel Marcelino',
            email: email,
            senha: hashPassword('senha123'),
            tipo_usuario: 'profissional',
            especialidade: 'Engenheiro de Software / Gestor',
            foto_url: 'https://ui-avatars.com/api/?name=Daniel+Marcelino&background=1e6d38&color=fff'
        }]);
    }
}

app.listen(PORT, async () => {
    await seedUser();
    console.log(`Servidor rodando em: http://localhost:${PORT}`);
});