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

// ==========================================
// ACESSIBILIDADE: ALTO CONTRASTE E VLIBRAS
// ==========================================

// 1. Alternância de Alto Contraste
function initHighContrast() {
    // Verifica preferência anterior
    if (localStorage.getItem('highContrast') === 'true') {
        document.body.classList.add('high-contrast');
    }

    // Criar o botão Flutuante de Contraste se não existir
    if (!document.getElementById('btn-contrast')) {
        const btnContrast = document.createElement('button');
        btnContrast.id = 'btn-contrast';
        btnContrast.innerHTML = '🌓 Contraste';
        btnContrast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            z-index: 9999;
            background: var(--green-primary);
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 20px;
            cursor: pointer;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            font-weight: bold;
        `;
        
        btnContrast.onclick = () => {
            document.body.classList.toggle('high-contrast');
            const isContrast = document.body.classList.contains('high-contrast');
            localStorage.setItem('highContrast', isContrast);
        };

        document.body.appendChild(btnContrast);
    }
}

// 2. Injeção Dinâmica do VLibras
function initVLibras() {
    if (document.getElementById('vlibras-script')) return;

    // Criar container do VLibras
    const divVlibras = document.createElement('div');
    divVlibras.setAttribute('vw', '');
    divVlibras.className = 'enabled'; // Classe correta segundo a documentação
    divVlibras.innerHTML = `
        <div vw-access-button class="active"></div>
        <div vw-plugin-wrapper>
            <div class="vw-plugin-top-wrapper"></div>
        </div>
    `;
    document.body.appendChild(divVlibras);

    // Carregar o script
    const script = document.createElement('script');
    script.id = 'vlibras-script';
    script.src = 'https://vlibras.gov.br/app/vlibras-plugin.js';
    script.onload = () => {
        new window.VLibras.Widget('https://vlibras.gov.br/app');
    };
    document.body.appendChild(script);
}

// Inicializar Módulos de Acessibilidade
initHighContrast();
initVLibras();
