import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { API_URL, showToast } from './utils.js';

let supabaseClient = null;

/**
 * Inicializa a conexão profissional via WebSockets do Supabase
 * Retorna o cliente para ser usado em módulos específicos (Chat, Mural, Agendamentos)
 */
export async function initRealtime(onAgendamentoChange) {
    if (supabaseClient) return supabaseClient;

    try {
        const response = await fetch(`${API_URL}/config`);
        const config = await response.json();

        if (!config.supabaseUrl || !config.supabaseAnonKey) {
            console.error("[REALTIME] Configuração incompleta.");
            return null;
        }

        supabaseClient = createClient(config.supabaseUrl, config.supabaseAnonKey);

        // Inscrição padrão para notificações globais de agendamentos
        if (onAgendamentoChange) {
            supabaseClient
                .channel('global-changes')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'agendamentos' },
                    (payload) => {
                        handleGlobalToast(payload);
                        if (typeof onAgendamentoChange === 'function') onAgendamentoChange(payload);
                    }
                )
                .subscribe();
        }

        console.log("[REALTIME] Conexão Socket estabelecida.");
        return supabaseClient;
    } catch (err) {
        console.error("[REALTIME] Erro crítico na conexão:", err);
        return null;
    }
}

function handleGlobalToast(payload) {
    if (payload.eventType === 'INSERT') showToast("Novo agendamento recebido!", "info");
    else if (payload.eventType === 'UPDATE') showToast("Status de agendamento atualizado.", "info");
    else if (payload.eventType === 'DELETE') showToast("Um agendamento foi removido.", "warning");
}
