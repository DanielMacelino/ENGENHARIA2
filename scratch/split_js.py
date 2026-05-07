import os

js_path = r"c:\Users\Daniel\Documents\ENGENHARIA2\ENGENHARIA2\frontend\public\script.js"
out_dir = r"c:\Users\Daniel\Documents\ENGENHARIA2\ENGENHARIA2\frontend\public"

with open(js_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

def write_js(name, ranges, imports="", exports=[]):
    with open(os.path.join(out_dir, name), "w", encoding="utf-8") as f:
        f.write(f"/* {name} */\n")
        if imports:
            f.write(imports + "\n\n")
        for start, end in ranges:
            f.writelines(lines[start-1:end])
        if exports:
            f.write("\n\n// Exposing functions to global scope for inline HTML handlers\n")
            for exp in exports:
                f.write(f"window.{exp} = {exp};\n")

# utils.js
# Globals (1-12), shakeElement (343-352), showToast (1442-1475), exportarPDF (982-1019), getDistanciaHaversine (952-965)
write_js("utils.js", [(1, 12), (343, 352), (1442, 1475), (982, 1019), (952, 965)], 
         exports=["showToast", "shakeElement", "exportarPDF", "getDistanciaHaversine"])

# auth.js
# verificarSessao, sairDoSistema (138-160), fazerLogin... (225-341), solicitarRecuperacao (354-372), realizarCadastro (374-453)
imports_auth = "import { API_URL, showToast, shakeElement } from './utils.js';"
write_js("auth.js", [(138, 160), (225, 341), (354, 372), (374, 453)], imports=imports_auth,
         exports=["fazerLogin", "verificarCodigo2FA", "voltarParaLogin", "solicitarRecuperacao", "realizarCadastro", "sairDoSistema", "verificarSessao"])

# dashboard.js
# The rest of the functions
imports_dashboard = "import { API_URL, showToast, getDistanciaHaversine } from './utils.js';\nimport { verificarSessao, sairDoSistema } from './auth.js';"
# document ready (13-44) -> main.js
# renderSidebar, uploadProfilePhoto (46-136)
# salvarNovoItem (161-223)
# carregarDashboardProfissional ... (455-950)
# calcularDistanciaFrontend (967-980)
# setupProfissional ... (1021-1232)
# estatisticas (1234-1372)
# prontuario (1374-1440)
# calcularDistanciaFrontend (1477-1518)
ranges_dashboard = [(46, 136), (161, 223), (455, 950), (967, 980), (1021, 1232), (1234, 1372), (1374, 1440), (1477, 1518)]
exports_dashboard = [
    "renderSidebar", "uploadProfilePhoto", "salvarNovoItem", "carregarDashboardProfissional", "filtrarAgendamentosProfissional",
    "mudarStatus", "carregarDashboardAluno", "atualizarSlotsAutomaticos", "selecionarHorarioSimplificado", 
    "confirmarAgendamentoSimplificado", "carregarAgendamentosAluno", "filtrarAgendamentosAluno", "carregarItens",
    "filtrarItens", "deletarItem", "calcularDistanciaFrontend", "carregarSetupProfissional", "salvarDisponibilidade",
    "selecionarTodos", "deselecionarTodos", "marcarLinhaToda", "carregarLogs", "filtrarLogs", "limparFiltros",
    "carregarEstatisticas", "abrirModalAtendimento", "fecharModalProntuario", "salvarAtendimento", "verProntuario"
]
write_js("dashboard.js", ranges_dashboard, imports=imports_dashboard, exports=exports_dashboard)

# main.js (Entry point for modules, with document ready listener)
main_js_content = """import { verificarSessao, sairDoSistema, fazerLogin } from './auth.js';
import { renderSidebar } from './dashboard.js';
// Make all exports available globally
import './utils.js';
import './auth.js';
import './dashboard.js';

// Globals from original file
window.originalAgendamentos = [];
window.originalItens = [];
window.originalLogs = [];

document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('loaded');

    if (!document.querySelector('link[href*="toast.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/public/toast.css';
        document.head.appendChild(link);
    }

    const formLogin = document.getElementById('form-login');
    if (formLogin) {
        formLogin.addEventListener('submit', fazerLogin);
        return; 
    }

    if (window.location.pathname !== '/' && window.location.pathname !== '/login') {
        verificarSessao();
        renderSidebar(); 
    }

    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-header-sair') || e.target.closest('.btn-header-sair')) {
            e.preventDefault();
            sairDoSistema();
        }
    });
});
"""

with open(os.path.join(out_dir, "main.js"), "w", encoding="utf-8") as f:
    f.write(main_js_content)

print("JS split completed.")
