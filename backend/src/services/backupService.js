import { supabase } from '../../supabaseClient.js';


/**
 * Converte um array de objetos para CSV
 */
function jsonToCsv(data) {
    if (!data || data.length === 0) return '';
    const headers = Object.keys(data[0]).join(';');
    const rows = data.map(obj => 
        Object.values(obj).map(val => 
            String(val).replace(/;/g, ',').replace(/\n/g, ' ')
        ).join(';')
    ).join('\n');
    return headers + '\n' + rows;
}

/**
 * Executa o backup e sobe para o Supabase Storage (Compatível com Vercel)
 */
export async function executarBackupNuvem() {
    console.log(`[BACKUP-CLOUD] Iniciando backup em ${new Date().toLocaleString('pt-BR')}...`);
    
    const tabelas = ['usuarios', 'agendamentos', 'itens', 'logs'];
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const results = [];

    try {
        for (const tabela of tabelas) {
            const { data, error: fetchError } = await supabase.from(tabela).select('*');
            
            if (fetchError) {
                console.error(`[BACKUP] Erro ao buscar dados da tabela ${tabela}:`, fetchError);
                results.push({ tabela, status: 'erro', error: fetchError.message });
                continue;
            }

            const csv = '\uFEFF' + jsonToCsv(data);
            const fileName = `${timestamp}/${tabela}_${timestamp}.csv`;

            // Upload para o bucket 'backups' do Supabase
            const { error: uploadError } = await supabase.storage
                .from('backups')
                .upload(fileName, csv, {
                    contentType: 'text/csv',
                    upsert: true
                });

            if (uploadError) {
                console.error(`[BACKUP] Erro no upload da tabela ${tabela}:`, uploadError);
                results.push({ tabela, status: 'erro', error: uploadError.message });
            } else {
                console.log(`[BACKUP] Tabela ${tabela} salva na nuvem: ${fileName}`);
                results.push({ tabela, status: 'sucesso', path: fileName });
            }
        }
        return { success: true, timestamp, details: results };
    } catch (error) {
        console.error('[BACKUP] Erro crítico:', error);
        return { success: false, error: error.message };
    }
}
