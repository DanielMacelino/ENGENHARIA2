import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { API_URL, showToast } from './utils.js';

let supabaseClient = null;

export async function initRealtime(onAgendamentoChange) {
    if (supabaseClient) return; // Já inicializado

    try {
        // Busca as chaves públicas da API do nosso servidor
        const response = await fetch(`${API_URL}/config`);
        const config = await response.json();

        if (!config.supabaseUrl || !config.supabaseAnonKey) {
            console.error("Configuração do Supabase ausente.");
            return;
        }

        supabaseClient = createClient(config.supabaseUrl, config.supabaseAnonKey);

        // Inscreve no canal do realtime para a tabela 'agendamentos'
        const channel = supabaseClient
            .channel('custom-all-channel')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'agendamentos' },
                (payload) => {
                    console.log('Realtime Event:', payload);
                    
                    // Exibir aviso dependendo do evento
                    if (payload.eventType === 'INSERT') {
                        showToast("Novo agendamento recebido!", "info");
                    } else if (payload.eventType === 'UPDATE') {
                        showToast("Status de agendamento atualizado.", "info");
                    } else if (payload.eventType === 'DELETE') {
                        showToast("Um agendamento foi removido.", "warning");
                    }

                    // Chama a callback para atualizar a tabela na tela
                    if (typeof onAgendamentoChange === 'function') {
                        onAgendamentoChange(payload);
                    }
                }
            )
            .subscribe();

        console.log("Supabase Realtime iniciado com sucesso.");
    } catch (err) {
        console.error("Erro ao iniciar Supabase Realtime:", err);
    }
}
