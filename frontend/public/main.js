import { verificarSessao, sairDoSistema, fazerLogin } from './auth.js';
import { renderSidebar } from './dashboard.js';
// Make all exports available globally
import './utils.js';
import './auth.js';
import './dashboard.js';
import { initRealtime } from './realtime.js';

// Globals from original file
window.originalAgendamentos = [];
window.originalItens = [];
window.originalLogs = [];

// Module scripts are deferred, so the DOM is already parsed.
document.body.classList.add('loaded');

if (window.lucide) {
    window.lucide.createIcons();
}

if (!document.querySelector('link[href*="toast.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/public/toast.css';
    document.head.appendChild(link);
}

const formLogin = document.getElementById('form-login');
if (formLogin) {
    formLogin.addEventListener('submit', fazerLogin);
} else {
    if (window.location.pathname !== '/' && window.location.pathname !== '/login') {
        verificarSessao();
        renderSidebar(); 
        
        // Iniciar WebSockets
        initRealtime((payload) => {
            const path = window.location.pathname;
            if (path === '/aluno/dashboard' && window.carregarDashboardAluno) window.carregarDashboardAluno();
            else if (path === '/aluno/agendamentos' && window.carregarAgendamentosAluno) window.carregarAgendamentosAluno();
            else if (path === '/profissional/dashboard' && window.carregarAgendaProfissional) window.carregarAgendaProfissional();
            else if (path === '/profissional/estatisticas' && window.carregarEstatisticasGerais) window.carregarEstatisticasGerais();
        });
    }
}

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-header-sair') || e.target.closest('.btn-header-sair')) {
        e.preventDefault();
        if (confirm("Deseja realmente sair do sistema?")) {
            sairDoSistema();
        }
    }
});
