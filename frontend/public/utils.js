/* utils.js */
/**
 * script.js - Sistema de Agendamento - Posto de Saúde IFCE Crato
 * Refatorado: Centralização de Sidebar e Proteção de Rotas Profissional
 */

export const API_URL = '/api';

// Variáveis globais para armazenar dados originais para filtragem local




/**
 * Adiciona efeito de vibração (shake) a um elemento
 */
export function shakeElement(selector) {
    const el = document.querySelector(selector);
    if (!el) return;
    el.classList.remove('shake');
    void el.offsetWidth; // Trigger reflow
    el.classList.add('shake');
}
/** =========================================================
 * SISTEMA DE NOTIFICAÇÕES (TOASTS)
 * ========================================================= */
export function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Ícones dinâmicos via Lucide se disponível, senão fallback
    const icons = {
        success: '<i data-lucide="check-circle" style="color:white;width:18px;height:18px;"></i>',
        error: '<i data-lucide="alert-circle" style="color:white;width:18px;height:18px;"></i>',
        warning: '<i data-lucide="alert-triangle" style="color:white;width:18px;height:18px;"></i>',
        info: '<i data-lucide="info" style="color:white;width:18px;height:18px;"></i>'
    };

    toast.innerHTML = `<span style="display:flex;align-items:center;">${icons[type] || '<i data-lucide="bell"></i>'}</span> <span>${message}</span>`;
    
    if (window.lucide) {
        setTimeout(() => window.lucide.createIcons(), 10);
    }
    
    // Click para fechar rápido
    toast.onclick = () => toast.remove();

    container.appendChild(toast);

    // Auto-remove após 3 segundos
    setTimeout(() => {
        if (toast.parentNode) toast.remove();
    }, 3000);
}
/** =========================================================
 * EXPORTAR PDF - Gerar relatórios (Escalável para vários tipos)
 * ========================================================= */
export async function exportarPDF(tipo = 'itens', agendamento_id = null) {
    try {
        let url = `${API_URL}/relatorio?tipo=${tipo}`;
        
        // Se for relatório de agendamentos, passamos o profissional_id
        if (tipo === 'agendamentos') {
            const profId = localStorage.getItem('usuario_id');
            if (!profId || profId === 'undefined' || profId === 'null') {
                showToast("Erro: ID do profissional não encontrado.");
                return;
            }
            url += `&profissional_id=${profId}`;
        }
        
        // Se for atestado ou receita, passamos o agendamento_id
        if ((tipo === 'atestado' || tipo === 'receita') && agendamento_id) {
            url += `&agendamento_id=${agendamento_id}`;
        }

        const response = await fetch(url);
        
        if (!response.ok) {
            showToast('Erro ao gerar relatório PDF.');
            return;
        }

        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `relatorio_${tipo}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
        console.error('Erro ao baixar o PDF:', error);
        showToast('Erro ao conectar com o servidor para baixar o PDF.');
    }
}
/** =========================================================
 * MAPA E DISTÂNCIA (LEAFLET)
 * ========================================================= */
export function getDistanciaHaversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(2);
}


// Exposing functions to global scope for inline HTML handlers
window.showToast = showToast;
window.shakeElement = shakeElement;
window.exportarPDF = exportarPDF;
window.getDistanciaHaversine = getDistanciaHaversine;
