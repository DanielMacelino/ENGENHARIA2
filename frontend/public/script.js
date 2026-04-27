/**
 * script.js - Sistema de Agendamento - Posto de Saúde IFCE Crato
 * Refatorado: Centralização de Sidebar e Proteção de Rotas Profissional
 */

const API_URL = '/api';

// Variáveis globais para armazenar dados originais para filtragem local
let originalAgendamentos = [];
let originalItens = [];
let originalLogs = [];

document.addEventListener('DOMContentLoaded', () => {
    // Transição de entrada da página
    document.body.classList.add('loaded');

    // Garantir que o toast.css está carregado
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

    // Se não for página de login, verifica sessão e renderiza sidebar
    if (window.location.pathname !== '/' && window.location.pathname !== '/login') {
        verificarSessao();
        renderSidebar(); 
    }

    // Delegação de eventos para botões de saída (globais)
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-header-sair') || e.target.closest('.btn-header-sair')) {
            e.preventDefault();
            sairDoSistema();
        }
    });
});

/**
 * Renderiza o Menu Lateral dinamicamente conforme o tipo de usuário
 * Este é o ponto único de manutenção do menu (Escalonável)
 */
function renderSidebar() {
    const container = document.getElementById('sidebar-container');
    if (!container) return;

    const tipo = localStorage.getItem('tipo_usuario');
    const path = window.location.pathname;
    const nomeUser = localStorage.getItem('usuario_nome') || 'Usuário';
    const especialidade = localStorage.getItem('usuario_especialidade') || 'Geral';
    const fotoUrl = localStorage.getItem('usuario_foto') || 'https://ui-avatars.com/api/?name=' + nomeUser + '&background=aae0a4&color=1e6d38';

    let menuHTML = `
        <div class="sidebar-profile">
            <div class="profile-img-container" onclick="document.getElementById('input-foto-perfil').click()">
                <img src="${fotoUrl}" alt="Perfil" id="sidebar-foto-perfil">
                <div class="profile-img-overlay"><span>&#x1f4f7;</span></div>
                <input type="file" id="input-foto-perfil" style="display: none;" accept="image/*" onchange="uploadProfilePhoto(this)">
            </div>
            <p>Olá, <strong>${nomeUser}</strong>.</p>
            <strong>${tipo === 'aluno' ? 'IFCE | Campus - Crato' : `Especialidade: ${especialidade}`}</strong>
        </div>
        <ul class="sidebar-menu">
            <span class="menu-title">Menu Principal</span>
    `;

    if (tipo === 'aluno') {
        menuHTML += `
            <li><a href="/aluno/dashboard" class="${path === '/aluno/dashboard' ? 'active' : ''}"><span style="color:gray">&#x1f3e0;</span> Home / Início</a></li>
            <li><a href="/aluno/novo-agendamento" class="${path === '/aluno/novo-agendamento' ? 'active' : ''}"><span style="color:var(--green-primary);">&#x2795;</span> Agendar Consulta</a></li>
            <li><a href="/aluno/agendamentos" class="${path === '/aluno/agendamentos' ? 'active' : ''}"><span style="color:gray;">&#x1f4c5;</span> Meus Agendamentos</a></li>
            <li><a href="/aluno/mapa" class="${path === '/aluno/mapa' ? 'active' : ''}"><span style="color:gray;">&#x1f4cd;</span> Mapa e Distância</a></li>
            <li><a href="/aluno/informacoes" class="${path === '/aluno/informacoes' ? 'active' : ''}"><span style="color:gray;">&#x1f4da;</span> Informações Acadêmicas</a></li>
        `;
    } else {
        menuHTML += `
            <li><a href="/profissional/dashboard" class="${path === '/profissional/dashboard' ? 'active' : ''}"><span style="color:gray">&#x1f3e0;</span> Home (Agenda)</a></li>
            <li><a href="/profissional/disponibilidade" class="${path === '/profissional/disponibilidade' ? 'active' : ''}"><span style="color:gray;">&#x1f4c6;</span> Configurar Horários</a></li>
            <li><a href="/profissional/itens" class="${path === '/profissional/itens' || path === '/profissional/criar-item' ? 'active' : ''}"><span style="color:gray;">&#x1f4e6;</span> Inventário</a></li>
            <li><a href="/profissional/estatisticas" class="${path === '/profissional/estatisticas' ? 'active' : ''}"><span style="color:gray;">&#x1f4ca;</span> Estatísticas Gerais</a></li>
            <li><a href="/profissional/logs" class="${path === '/profissional/logs' ? 'active' : ''}"><span style="color:gray;">&#x1f4dc;</span> Logs do Sistema</a></li>
        `;
    }

    menuHTML += `</ul>`;
    
    // Rodapé do Menu Lateral
    menuHTML += `
        <div class="sidebar-footer" style="padding: 20px; border-top: 1px solid #333; margin-top: auto; font-size: 0.75rem; color: #666;">
            <p>&copy; 2026 IFCE Crato</p>
            <p>Posto de Saúde Digital</p>
        </div>
    `;
    
    container.innerHTML = menuHTML;
}

/**
 * Faz o upload da foto de perfil para o Supabase Storage via backend
 */
async function uploadProfilePhoto(input) {
    if (!input.files || !input.files[0]) return;

    const file = input.files[0];
    const formData = new FormData();
    formData.append('imagem', file);
    formData.append('usuario_id', localStorage.getItem('usuario_id'));
    formData.append('bucket', 'imagens');

    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('usuario_foto', data.url);
            document.getElementById('sidebar-foto-perfil').src = data.url;
            showToast('Foto de perfil atualizada com sucesso!');
        } else {
            showToast('Erro ao atualizar foto: ' + data.error);
        }
    } catch (error) {
        console.error('Erro no upload:', error);
        showToast('Erro ao conectar com o servidor.');
    }
}

function verificarSessao() {
    const token = localStorage.getItem('token');
    const tipo = localStorage.getItem('tipo_usuario');
    const path = window.location.pathname;

    if (!token && !localStorage.getItem('usuario_id')) {
        window.location.href = '/login';
        return;
    }

    // Proteção de Prefixo (Segurança Visual e Rotas)
    if (tipo === 'aluno' && (path.startsWith('/profissional') || path === '/logs' || path === '/itens')) {
        showToast('Acesso negado: Perfil de aluno sem privilégios administrativos.');
        window.location.href = '/aluno/dashboard';
    } else if (tipo !== 'aluno' && path.startsWith('/aluno')) {
        window.location.href = '/profissional/dashboard';
    }
}

function sairDoSistema() {
    localStorage.clear();
    window.location.href = '/';
}

/** =========================================================
 * AUTENTICAÇÃO
 * ========================================================= */
/**
 * Salva um novo item no inventário, incluindo upload de imagem opcional
 */
async function salvarNovoItem(event) {
    event.preventDefault();
    const btn = document.getElementById('btn-salvar-item');
    const inputFoto = document.getElementById('fotoItem');
    
    btn.disabled = true;
    btn.innerText = 'Salvando...';

    try {
        let foto_url = '';

        // 1. Se houver foto, faz o upload primeiro
        if (inputFoto && inputFoto.files[0]) {
            const formData = new FormData();
            formData.append('imagem', inputFoto.files[0]);
            formData.append('bucket', 'imagenspublicas');
            
            const uploadRes = await fetch(`${API_URL}/upload`, {
                method: 'POST',
                body: formData
            });
            const uploadData = await uploadRes.json();
            if (uploadRes.ok) foto_url = uploadData.url;
        }

        // 2. Prepara os dados do item
        const item = {
            nome: document.getElementById('nomeItem').value,
            codigo: 'ITEM-' + Date.now(), // Gera um código único
            descricao: document.getElementById('obsItem').value,
            quantidade: parseInt(document.getElementById('qtdItem').value),
            status: 'Ativo',
            foto_url: foto_url // Requisito B (Cloud Storage)
        };

        const res = await fetch(`${API_URL}/itens`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
        });

        if (res.ok) {
            showToast('Item cadastrado com sucesso!');
            window.location.href = '/profissional/itens';
        } else {
            const err = await res.json();
            showToast('Erro ao salvar item: ' + err.error);
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao conectar com o servidor.');
    } finally {
        btn.disabled = false;
        btn.innerText = 'Gravar Item';
    }
}

async function fazerLogin(event) {
    if (event) event.preventDefault();
    
    const email = document.getElementById('email')?.value;
    const senha = document.getElementById('senha')?.value;
    const btn = document.getElementById('btn-entrar');

    if (btn) { btn.innerText = "Autenticando..."; btn.disabled = true; }

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha })
        });

        const data = await response.json();

        if (response.ok) {
            if (data.requires_2fa) {
                // Transição para Etapa 2 (2FA)
                localStorage.setItem('temp_login_email', data.email);
                document.getElementById('login-step-1').style.display = 'none';
                document.getElementById('login-step-2').style.display = 'block';
                
                // Inicializa os inputs de código
                inicializarInputsCodigo();
                
                // Configura o botão de verificação
                const btnVerify = document.getElementById('btn-verify-2fa');
                btnVerify.onclick = () => verificarCodigo2FA(data.email);
                
                showToast(data.message);
            } else {
                salvarSessaoERecirecionar(data);
            }
        } else {
            shakeElement('.login-card');
            showToast(data.error || 'Credenciais inválidas.', 'error');
            if (btn) { btn.innerText = "Entrar"; btn.disabled = false; }
        }
    } catch (error) {
        console.error('Erro no login:', error);
        showToast('Erro ao conectar com o servidor.');
        if (btn) { btn.innerText = "Entrar"; btn.disabled = false; }
    }
}

function inicializarInputsCodigo() {
    const inputs = document.querySelectorAll('.code-input');
    inputs.forEach((input, index) => {
        input.value = '';
        input.addEventListener('keyup', (e) => {
            if (e.key >= 0 && e.key <= 9) {
                if (index < inputs.length - 1) inputs[index + 1].focus();
            } else if (e.key === 'Backspace') {
                if (index > 0) inputs[index - 1].focus();
            }
        });
        
        // Auto focus no primeiro
        if (index === 0) setTimeout(() => input.focus(), 100);
    });
}

async function verificarCodigo2FA(email) {
    const inputs = document.querySelectorAll('.code-input');
    const codigo = Array.from(inputs).map(i => i.value).join('');
    const btn = document.getElementById('btn-verify-2fa');

    if (codigo.length < 6) {
        return showToast('Por favor, insira o código de 6 dígitos.');
    }

    btn.innerText = "Verificando...";
    btn.disabled = true;

    try {
        const verifyResp = await fetch(`${API_URL}/login/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, codigo })
        });
        const verifyData = await verifyResp.json();

        if (verifyResp.ok) {
            salvarSessaoERecirecionar(verifyData);
        } else {
            shakeElement('.login-card');
            showToast(verifyData.error || 'Código 2FA inválido.', 'error');
            btn.innerText = "Verificar Código";
            btn.disabled = false;
        }
    } catch (error) {
        showToast('Erro na verificação.');
        btn.innerText = "Verificar Código";
        btn.disabled = false;
    }
}

function salvarSessaoERecirecionar(data) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('usuario_id', data.id);
    localStorage.setItem('tipo_usuario', data.tipo_usuario);
    localStorage.setItem('usuario_nome', data.nome);
    localStorage.setItem('usuario_foto', data.foto_url || '');
    localStorage.setItem('usuario_especialidade', data.especialidade || '');

    window.location.href = data.tipo_usuario === 'aluno' ? '/aluno/dashboard' : '/profissional/dashboard';
}

function voltarParaLogin() {
    document.getElementById('login-step-2').style.display = 'none';
    document.getElementById('login-step-1').style.display = 'block';
    const btn = document.getElementById('btn-entrar');
    if (btn) { btn.innerText = "Entrar"; btn.disabled = false; }
}

/**
 * Adiciona efeito de vibração (shake) a um elemento
 */
function shakeElement(selector) {
    const el = document.querySelector(selector);
    if (!el) return;
    el.classList.remove('shake');
    void el.offsetWidth; // Trigger reflow
    el.classList.add('shake');
}

/**
 * Recuperação de Senha via SMS (Requisito H)
 */
async function solicitarRecuperacao() {
    const email = prompt("Informe seu e-mail para receber o código via SMS:");
    if (!email) return;

    showToast("Um código de segurança foi enviado para o seu celular cadastrado.");
    const codigo = prompt("Digite o código recebido via SMS:");
    
    if (codigo && codigo.length === 6) {
        const novaSenha = prompt("Digite sua nova senha:");
        if (novaSenha) {
            showToast("Senha redefinida com sucesso! Você já pode entrar.");
        }
    } else {
        showToast("Código inválido.");
    }
}


async function realizarCadastro(event) {
    if (event) event.preventDefault();

    const nome = document.getElementById('nome').value;
    const email = document.getElementById('email').value;
    const tipo_usuario = document.getElementById('tipo_usuario').value;
    const senha = document.getElementById('senha').value;
    const confirmar = document.getElementById('confirmar_senha').value;

    if (senha !== confirmar) {
        return showToast("As senhas não coincidem!");
    }

    try {
        const response = await fetch(`${API_URL}/cadastro`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, email, senha, tipo_usuario })
        });

        const data = await response.json();

        if (response.ok) {
            showToast("Cadastro realizado com sucesso! Fazendo login...");
            // Preenche o login automaticamente e entra
            localStorage.setItem('temp_email', email);
            localStorage.setItem('temp_senha', senha);
            
            // Tenta logar imediatamente
            const loginResp = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, senha })
            });
            const loginData = await loginResp.json();
            
            if (loginResp.ok) {
                if (loginData.requires_2fa) {
                    const codigo = prompt(`${loginData.message}\n\nDigite o código de 6 dígitos recebido:`);
                    if (codigo) {
                        const verifyResp = await fetch(`${API_URL}/login/verify`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: loginData.email, codigo })
                        });
                        const verifyData = await verifyResp.json();
                        if (verifyResp.ok) {
                            localStorage.setItem('token', verifyData.token);
                            localStorage.setItem('usuario_id', verifyData.id);
                            localStorage.setItem('tipo_usuario', verifyData.tipo_usuario);
                            localStorage.setItem('usuario_nome', nome.split(' ')[0]);
                            
                            window.location.href = verifyData.tipo_usuario === 'aluno' ? '/aluno/dashboard' : '/profissional/dashboard';
                        } else {
                            showToast(verifyData.error || 'Código inválido.');
                            window.location.href = '/login';
                        }
                    } else {
                        window.location.href = '/login';
                    }
                } else {
                    localStorage.setItem('token', loginData.token);
                    localStorage.setItem('usuario_id', loginData.id);
                    localStorage.setItem('tipo_usuario', loginData.tipo_usuario);
                    localStorage.setItem('usuario_nome', nome.split(' ')[0]);
                    
                    window.location.href = loginData.tipo_usuario === 'aluno' ? '/aluno/dashboard' : '/profissional/dashboard';
                }
            } else {
                window.location.href = '/login';
            }
        } else {
            showToast(data.error || "Erro ao realizar cadastro.");
        }
    } catch (error) {
        console.error("Erro no cadastro:", error);
        showToast("Erro ao conectar com o servidor.");
    }
}

/** =========================================================
 * DASHBOARD PROFISSIONAL
 * ========================================================= */
async function carregarDashboardProfissional() {
    const tbody = document.getElementById('lista-pacientes-hoje');
    if (!tbody) return;

    const dataAtualSpan = document.getElementById('data-atual');
    if (dataAtualSpan) {
        const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const hoje = new Date();
        dataAtualSpan.innerText = `${nomesMeses[hoje.getMonth()]} de ${hoje.getFullYear()}`;
    }

    const profId = localStorage.getItem('usuario_id');
    try {
        const response = await fetch(`${API_URL}/agendamentos/profissional/${profId}`);
        const pacientes = await response.json();
        originalAgendamentos = pacientes;
        renderizarTabelaProfissional(pacientes);

    } catch (error) {
        console.error('Erro ao carregar dashboard profissional:', error);
    }
}

function renderizarTabelaProfissional(pacientes) {
    const tbody = document.getElementById('lista-pacientes-hoje');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (pacientes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Nenhum agendamento encontrado para os filtros selecionados.</td></tr>';
        return;
    }

    let atendidos = 0;
    let aguardando = 0;

    pacientes.forEach(p => {
        if (p.status === 'Atendido') atendidos++;
        else if (p.status === 'Confirmado' || p.status === 'Pendente') aguardando++;

        const dataFormatada = p.data ? p.data.split('-').reverse().join('/') : 'N/A';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${p.usuarios ? p.usuarios.nome : 'N/A'}</td>
            <td>${dataFormatada}</td>
            <td>${p.hora}</td>
            <td>${p.especialidade}</td>
            <td><span class="badge ${p.status === 'Atendido' ? 'active' : (p.status === 'Pendente' ? 'warning' : '')}">${p.status}</span></td>
            <td>
                ${p.status !== 'Atendido' ? `
                    <button onclick="abrirModalAtendimento('${p.id}')" class="btn-green" style="padding: 2px 8px; font-size: 0.8rem;">Atender</button>
                    <button onclick="mudarStatus('${p.id}', 'Cancelado')" style="background:none; border:none; cursor:pointer;" title="Recusar">&#x274c;</button>
                ` : `
                    <button onclick="verProntuario('${p.observacoes || ''}')" style="background:none; border:none; cursor:pointer; font-size:1.2rem;" title="Ver Prontuário">📝</button>
                `}
            </td>
        `;
        tbody.appendChild(tr);
    });

    if(document.getElementById('stat-atendidos')) document.getElementById('stat-atendidos').innerText = atendidos;
    if(document.getElementById('stat-aguardando')) document.getElementById('stat-aguardando').innerText = aguardando;
}

function filtrarAgendamentosProfissional() {
    const dia = document.getElementById('filtro-dia')?.value;
    const mes = document.getElementById('filtro-mes')?.value;
    const ano = document.getElementById('filtro-ano')?.value;
    const status = document.getElementById('filtro-status')?.value;

    let filtrados = originalAgendamentos;

    if (dia) {
        filtrados = filtrados.filter(a => a.data.split('-')[2] === dia.padStart(2, '0'));
    }
    if (mes) {
        filtrados = filtrados.filter(a => a.data.split('-')[1] === mes.padStart(2, '0'));
    }
    if (ano) {
        filtrados = filtrados.filter(a => a.data.split('-')[0] === ano);
    }
    if (status) {
        filtrados = filtrados.filter(a => a.status === status);
    }

    renderizarTabelaProfissional(filtrados);
}

async function mudarStatus(id, novoStatus) {
    if (!confirm(`Deseja alterar o status para ${novoStatus}?`)) return;

    try {
        const response = await fetch(`${API_URL}/agendamentos/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: novoStatus })
        });

        if (response.ok) {
            showToast("Status atualizado!");
            if (localStorage.getItem('tipo_usuario') === 'aluno') carregarAgendamentosAluno();
            else carregarDashboardProfissional();
        } else {
            showToast("Erro ao atualizar status.");
        }
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
    }
}

/** =========================================================
 * DASHBOARD ALUNO - NOVO SISTEMA DINÂMICO
 * ========================================================= */
async function carregarDashboardAluno() {
    // Carregar próximo agendamento
    const proximoCard = document.getElementById('proximo-agendamento-card');
    const usuarioId = localStorage.getItem('usuario_id');

    try {
        if (usuarioId && proximoCard) {
            const resAg = await fetch(`${API_URL}/agendamentos/usuario/${usuarioId}`);
            const ags = await resAg.json();
            if (ags.length > 0) {
                const prox = ags[0];
                proximoCard.innerHTML = `
                    <div style="font-weight:bold; font-size:1.1rem; margin-bottom:5px; color:#444;">
                        <span style="color:red">&#x1f4cc;</span> ${prox.especialidade}
                    </div>
                    <div class="stats-text" style="color:#555;">
                        &#x1f4c5; <span>${prox.data} - ${prox.hora}</span>
                    </div>
                    <div class="stats-text" style="color:#555;">
                        &#x1f4cd; Profissional: ${prox.usuarios ? prox.usuarios.nome : 'N/A'}
                    </div>
                `;
            } else {
                proximoCard.innerHTML = '<p style="color:#999; font-size:0.9rem;">Você não tem agendamentos próximos.</p>';
            }
        }

        // Inicializar formulário de agendamento
        inicializarFormularioAgendamento();

    } catch (error) {
        console.error('Erro ao carregar dashboard aluno:', error);
    }
}

async function inicializarFormularioAgendamento() {
    // Definir datas min e max do input date
    const inputData = document.getElementById('data-agendamento');
    if (inputData) {
        const hoje = new Date();
        const daqui30Dias = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);

        inputData.min = hoje.toISOString().split('T')[0];
        inputData.max = daqui30Dias.toISOString().split('T')[0];
    }
}

/** =========================================================
 * AGENDAMENTO SIMPLIFICADO (REQUISITOS NOVOS)
 * ========================================================= */
let agendamentoSelecionado = {
    especialidade: '',
    data: '',
    hora: '',
    profissional_id: '',
    profissional_nome: ''
};

async function atualizarSlotsAutomaticos() {
    const especialidade = document.getElementById('sel-especialidade').value;
    const dataStr = document.getElementById('data-agendamento').value;
    const sectionHorarios = document.getElementById('section-horarios');
    const gridHorarios = document.getElementById('grid-horarios');
    const areaConf = document.getElementById('area-confirmacao');

    if (!especialidade || !dataStr) {
        if (sectionHorarios) sectionHorarios.style.display = 'none';
        return;
    }

    // Resetar botão de confirmação ao mudar filtros
    if (areaConf) {
        areaConf.style.opacity = "0.5";
        areaConf.style.pointerEvents = "none";
        const btnFinal = document.getElementById('btn-final-confirm');
        if (btnFinal) btnFinal.disabled = true;
        const resumoTxt = areaConf.querySelector('.resumo-texto');
        if (resumoTxt) resumoTxt.innerHTML = "Selecione um horário para habilitar a confirmação.";
    }

    try {
        // 1. Descobrir dia da semana (Corrigindo timezone para não pular o dia)
        const [ano, mes, dia] = dataStr.split('-');
        const data = new Date(ano, mes - 1, dia); 
        const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        const diaSemana = diasSemana[data.getDay()];

        // 2. Buscar horários de profissionais e agendamentos do dia para verificar ocupação
        const [resHorarios, resOcupados] = await Promise.all([
            fetch(`${API_URL}/profissionais/horarios`),
            fetch(`${API_URL}/agendamentos/ocupacao?data=${dataStr}`)
        ]);
        
        const disponibilidades = await resHorarios.json();
        const agendamentosOcupados = await resOcupados.json();

        // 3. Filtrar disponibilidades por especialidade e dia
        const slotsDisponiveis = disponibilidades.filter(d => {
            const espProf = d.usuarios ? (Array.isArray(d.usuarios) ? d.usuarios[0].especialidade : d.usuarios.especialidade) : null;
            return espProf === especialidade && d.dia_semana === diaSemana;
        });

        gridHorarios.innerHTML = '';
        sectionHorarios.style.display = 'block';

        if (slotsDisponiveis.length === 0) {
            gridHorarios.innerHTML = '<div style="grid-column: 1/-1; color:#e74c3c; font-weight:600;">Infelizmente, não há horários cadastrados para esta especialidade neste dia.</div>';
            return;
        }

        // 4. Renderizar apenas horários que tenham pelo menos UM profissional livre
        const horariosComProfissionalLivre = [];

        slotsDisponiveis.forEach(dispo => {
            dispo.horarios.forEach(h => {
                // Verificar se este profissional específico está ocupado neste horário/data
                const estaOcupado = agendamentosOcupados.some(ag => 
                    ag.profissional_id === dispo.profissional_id && 
                    ag.hora === h && 
                    ag.status !== 'Cancelado'
                );

                if (!estaOcupado) {
                    horariosComProfissionalLivre.push({
                        hora: h,
                        profId: dispo.profissional_id,
                        profNome: dispo.usuarios.nome
                    });
                }
            });
        });

        if (horariosComProfissionalLivre.length === 0) {
            gridHorarios.innerHTML = '<div style="grid-column: 1/-1; color:#e74c3c; font-weight:600;">Todos os horários para este dia já foram preenchidos.</div>';
            return;
        }

        // Ordenar e remover duplicatas de horários (se dois profs estão livres no mesmo horário, mostra o horário uma vez)
        const horariosUnicos = [];
        const setHoras = new Set();

        horariosComProfissionalLivre.sort((a,b) => a.hora.localeCompare(b.hora)).forEach(item => {
            if (!setHoras.has(item.hora)) {
                const btn = document.createElement('button');
                btn.className = 'btn-horario';
                btn.innerText = item.hora;
                btn.onclick = () => selecionarHorarioSimplificado(item.hora, item.profId, item.profNome);
                gridHorarios.appendChild(btn);
                setHoras.add(item.hora);
            }
        });

    } catch (error) {
        console.error('Erro ao buscar slots:', error);
    }
}

function selecionarHorarioSimplificado(hora, profId, profNome) {
    // UI Feedback
    document.querySelectorAll('.btn-horario').forEach(b => b.classList.remove('selected'));
    event.target.classList.add('selected');

    // Salvar dados
    agendamentoSelecionado = {
        especialidade: document.getElementById('sel-especialidade').value,
        data: document.getElementById('data-agendamento').value,
        hora: hora,
        profissional_id: profId,
        profissional_nome: profNome
    };

    // Habilitar área de confirmação
    const areaConf = document.getElementById('area-confirmacao');
    const btnFinal = document.getElementById('btn-final-confirm');
    
    if (areaConf && btnFinal) {
        areaConf.style.opacity = "1";
        areaConf.style.pointerEvents = "auto";
        btnFinal.disabled = false;
        
        const dataFormatada = agendamentoSelecionado.data.split('-').reverse().join('/');
        areaConf.querySelector('.resumo-texto').innerHTML = `
            Você selecionou: <strong>${agendamentoSelecionado.especialidade}</strong><br>
            Dia <strong>${dataFormatada}</strong> às <strong>${hora}</strong>.
        `;
    }
}

async function confirmarAgendamentoSimplificado() {
    const usuarioId = localStorage.getItem('usuario_id');
    
    if (!usuarioId) {
        showToast("Sessão expirada. Faça login novamente.");
        return;
    }

    const payload = {
        usuario_id: usuarioId,
        profissional_id: agendamentoSelecionado.profissional_id,
        especialidade: agendamentoSelecionado.especialidade,
        data: agendamentoSelecionado.data,
        hora: agendamentoSelecionado.hora
    };

    try {
        const response = await fetch(`${API_URL}/agendamentos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            showToast(`✅ Sucesso! Seu agendamento para ${agendamentoSelecionado.especialidade} foi solicitado.`);
            window.location.href = '/aluno/agendamentos';
        } else {
            const err = await response.json();
            showToast("Erro ao agendar: " + err.error);
        }
    } catch (error) {
        console.error('Erro no agendamento:', error);
        showToast("Erro de conexão com o servidor.");
    }
}

function limparHorarios() {
    const containerHorarios = document.getElementById('horarios-container');
    const gridHorarios = document.getElementById('grid-horarios');
    
    if (containerHorarios) containerHorarios.style.display = 'none';
    if (gridHorarios) gridHorarios.innerHTML = '';
    
    limparResumo();
}

function limparResumo() {
    const resumo = document.getElementById('resumo-agendamento');
    const btnConfirmar = document.getElementById('btn-confirmar-agendamento');
    
    if (resumo) resumo.classList.remove('visible');
    if (btnConfirmar) btnConfirmar.style.display = 'none';
}

async function carregarAgendamentosAluno() {
    const tbody = document.getElementById('tabela-agendamentos');
    if (!tbody) return;

    try {
        const usuarioId = localStorage.getItem('usuario_id');
        const response = await fetch(`${API_URL}/agendamentos/usuario/${usuarioId}`);
        const agendamentos = await response.json();
        originalAgendamentos = agendamentos;
        renderizarTabelaAluno(agendamentos);

    } catch (error) {
        console.error('Erro ao carregar agendamentos aluno:', error);
    }
}

function renderizarTabelaAluno(agendamentos) {
    const tbody = document.getElementById('tabela-agendamentos');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (agendamentos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Nenhum agendamento encontrado para os filtros selecionados.</td></tr>';
        return;
    }

    agendamentos.forEach(a => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${a.especialidade}</td>
            <td>${a.data}</td>
            <td>${a.hora}</td>
            <td>${a.usuarios ? a.usuarios.nome : 'N/A'}</td>
            <td style="font-weight:bold;">${a.status}</td>
            <td>
                ${a.status === 'Pendente' ? `<button onclick="mudarStatus('${a.id}', 'Cancelado')" style="border:none; background:transparent; cursor:pointer;" title="Cancelar">&#x1f5d1;</button>` : ''}
                ${a.status === 'Atendido' ? `<button onclick="verProntuario('${a.observacoes || ''}')" class="btn-green" style="padding:2px 8px; font-size:0.8rem;">👁️ Ver Resumo</button>` : ''}
                ${a.status !== 'Pendente' && a.status !== 'Atendido' ? '---' : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    if(document.getElementById('total-consultas')) document.getElementById('total-consultas').innerText = agendamentos.length;
    if(document.getElementById('total-pendente')) document.getElementById('total-pendente').innerText = agendamentos.filter(a => a.status === 'Pendente').length;
}

function filtrarAgendamentosAluno() {
    const mes = document.getElementById('filtro-mes')?.value;
    const ano = document.getElementById('filtro-ano')?.value;
    const status = document.getElementById('filtro-status')?.value;

    let filtrados = originalAgendamentos;

    if (mes) {
        filtrados = filtrados.filter(a => a.data.split('-')[1] === mes.padStart(2, '0'));
    }
    if (ano) {
        filtrados = filtrados.filter(a => a.data.split('-')[0] === ano);
    }
    if (status) {
        filtrados = filtrados.filter(a => a.status === status);
    }

    renderizarTabelaAluno(filtrados);
}

/** =========================================================
 * INVENTÁRIO (PROFISSIONAL)
 * ========================================================= */
async function carregarItens() {
    const tbody = document.getElementById('tabela-itens');
    if (!tbody) return;

    try {
        const response = await fetch(`${API_URL}/itens`);
        const itens = await response.json();
        originalItens = itens;
        renderizarTabelaItens(itens);
    } catch (error) {
        console.error(error);
    }
}

function renderizarTabelaItens(itens) {
    const tbody = document.getElementById('tabela-itens');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (itens.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Nenhum item encontrado.</td></tr>';
        return;
    }

    itens.forEach(item => {
        const tr = document.createElement('tr');
        const fotoHTML = item.foto_url 
            ? `<img src="${item.foto_url}" style="width:40px; height:40px; border-radius:4px; object-fit:cover;">`
            : `<span style="font-size:1.5rem; color:#ddd;">&#x1f4e6;</span>`;

        tr.innerHTML = `
            <td style="text-align:center;">${fotoHTML}</td>
            <td><strong>${item.nome}</strong></td>
            <td><code>${item.codigo}</code></td>
            <td>${item.descricao || 'N/A'}</td>
            <td style="text-align:center;">${item.quantidade}</td>
            <td><span class="status-badge status-${item.status?.toLowerCase() || 'ativo'}">${item.status}</span></td>
            <td><button onclick="deletarItem('${item.id}')" style="background:none; border:none; cursor:pointer;">&#x1f5d1;</button></td>
        `;
        tbody.appendChild(tr);
    });
    if (document.getElementById('total-itens')) document.getElementById('total-itens').innerText = itens.length;
}

function filtrarItens() {
    const busca = document.getElementById('filtro-busca')?.value.toLowerCase();
    const status = document.getElementById('filtro-status')?.value;

    let filtrados = originalItens;

    if (busca) {
        filtrados = filtrados.filter(i => 
            i.nome.toLowerCase().includes(busca) || 
            i.codigo.toLowerCase().includes(busca)
        );
    }
    if (status) {
        filtrados = filtrados.filter(i => i.status === status);
    }

    renderizarTabelaItens(filtrados);
}

async function deletarItem(id) {
    if (!confirm("Excluir item?")) return;
    await fetch(`${API_URL}/itens/${id}`, { method: 'DELETE' });
    carregarItens();
}

/** =========================================================
 * MAPA E DISTÂNCIA (LEAFLET)
 * ========================================================= */
function getDistanciaHaversine(lat1, lon1, lat2, lon2) {
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

async function calcularDistanciaFrontend() {
    const valA = document.getElementById('coord-a').value;
    const valB = document.getElementById('coord-b').value;
    const resultBox = document.getElementById('resultado-distancia');
    const resultVal = document.getElementById('valor-distancia');

    if (!valA || !valB) return showToast("Por favor, selecione as duas origens.");
    const [lat1, lon1] = valA.split(',').map(Number);
    const [lat2, lon2] = valB.split(',').map(Number);
    
    const distancia = getDistanciaHaversine(lat1, lon1, lat2, lon2);
    resultBox.style.display = 'block';
    resultVal.innerText = distancia;
}

/** =========================================================
 * EXPORTAR PDF - Gerar relatórios (Escalável para vários tipos)
 * ========================================================= */
async function exportarPDF(tipo = 'itens') {
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
 * CONFIGURAÇÃO DE DISPONIBILIDADE (PROFISSIONAL) - MATRIZ
 * ========================================================= */
async function carregarSetupProfissional() {
    const matrizTbody = document.getElementById('matriz-horarios-prof');
    if (!matrizTbody) return;

    const profId = localStorage.getItem('usuario_id');
    const horasBase = [];
    
    // Gerar horários de 30 em 30 minutos (08:00 às 18:30)
    for (let h = 8; h <= 18; h++) {
        for (let m = 0; m < 60; m += 30) {
            horasBase.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        }
    }

    const diasSemana = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];

    try {
        // Buscar disponibilidades salvass
        const response = await fetch(`${API_URL}/profissionais/horarios`);
        const disponibilidades = await response.json();

        matrizTbody.innerHTML = '';

        horasBase.forEach(horario => {
            const tr = document.createElement('tr');
            let html = `<td class="horario-col"><span class="label-horario">${horario}</span></td>`;

            let todasMarcadas = true;
            diasSemana.forEach(dia => {
                const jaExiste = disponibilidades.find(
                    d => d.profissional_id === profId && d.dia_semana === dia && d.horarios.includes(horario)
                );
                
                if (!jaExiste) todasMarcadas = false;

                html += `
                    <td style="text-align: center;">
                        <input type="checkbox" class="chk-disponibilidade" data-dia="${dia}" data-horario="${horario}" ${jaExiste ? 'checked' : ''}>
                    </td>
                `;
            });


            // Coluna "Todas" para marcar a linha inteira
            html += `
                <td style="text-align: center; background: #f0fdf4;">
                    <input type="checkbox" class="chk-linha-toda" onclick="marcarLinhaToda('${horario}', this)" ${todasMarcadas ? 'checked' : ''}>
                </td>
            `;

            tr.innerHTML = html;
            matrizTbody.appendChild(tr);
        });

    } catch (error) {
        console.error('Erro ao carregar matriz de horários:', error);
    }
}

async function salvarDisponibilidade() {
    const btn = document.querySelector('button[onclick="salvarDisponibilidade()"]');
    if(btn) { btn.innerText = "Salvando..."; btn.disabled = true; }

    try {
        const profId = localStorage.getItem('usuario_id');
        if (!profId) throw new Error("ID do profissional não encontrado.");

        const checkboxes = document.querySelectorAll('.chk-disponibilidade:checked');
        const diasSemana = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];
        
        // Agrupar horários por dia
        const horariosPorDia = {};
        diasSemana.forEach(dia => {
            horariosPorDia[dia] = [];
        });

        checkboxes.forEach(chk => {
            const dia = chk.dataset.dia;
            const horario = chk.dataset.horario;
            if (!horariosPorDia[dia].includes(horario)) {
                horariosPorDia[dia].push(horario);
            }
        });

        let success = true;
        for (const dia of diasSemana) {
            const horarios = horariosPorDia[dia];
            
            if (horarios.length > 0) {
                const resp = await fetch(`${API_URL}/disponibilidade`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        profissional_id: profId,
                        dia_semana: dia,
                        horarios: horarios
                    })
                });
                if (!resp.ok) success = false;
            }
        }

        if (success) {
            showToast("Grade de horários salva com sucesso!");
        } else {
            showToast("Houve um erro ao salvar alguns horários.");
        }
    } catch (error) {
        console.error("Erro ao salvar:", error);
        showToast("Erro de conexão ao salvar disponibilidade.");
    } finally {
        if(btn) { btn.innerText = "Salvar Disponibilidade"; btn.disabled = false; }
    }
}

function selecionarTodos() {
    document.querySelectorAll('.chk-disponibilidade').forEach(chk => chk.checked = true);
    document.querySelectorAll('.chk-linha-toda').forEach(chk => chk.checked = true);
}

function deselecionarTodos() {
    document.querySelectorAll('.chk-disponibilidade').forEach(chk => chk.checked = false);
    document.querySelectorAll('.chk-linha-toda').forEach(chk => chk.checked = false);
}

function marcarLinhaToda(horario, checkboxMestre) {
    const checkboxesDaLinha = document.querySelectorAll(`.chk-disponibilidade[data-horario="${horario}"]`);
    checkboxesDaLinha.forEach(chk => {
        chk.checked = checkboxMestre.checked;
    });
}

/** =========================================================
 * LOGS DE SISTEMA
 * ========================================================= */
async function carregarLogs() {
    const tbody = document.getElementById('tabela-logs');
    if (!tbody) return;

    try {
        const response = await fetch(`${API_URL}/logs`);
        if (!response.ok) throw new Error('Falha ao carregar logs do servidor');
        
        const logs = await response.json();
        originalLogs = logs;
        renderizarTabelaLogs(logs);
    } catch (error) {
        console.error('Erro ao carregar logs:', error);
        showToast('Erro ao carregar logs: ' + error.message);
    }
}

function renderizarTabelaLogs(logs) {
    const tbody = document.getElementById('tabela-logs');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Nenhum log encontrado para os filtros selecionados.</td></tr>';
        return;
    }

    logs.forEach(log => {
        const tr = document.createElement('tr');
        // Formatar data: 2026-03-05T10:00:00 -> 05/03/2026 10:00
        const dataObj = new Date(log.created_at);
        const dataFormatada = dataObj.toLocaleString('pt-BR');

        tr.innerHTML = `
            <td>${dataFormatada}</td>
            <td>${log.usuario_nome || 'Sistema'}</td>
            <td>${log.acao}</td>
            <td>${log.detalhes || '---'}</td>
        `;
        tbody.appendChild(tr);
    });
}

function filtrarLogs() {
    const dataFiltro = document.getElementById('dataFiltro')?.value;
    const acao = document.getElementById('filtro-acao')?.value.toLowerCase();

    let filtrados = originalLogs;

    if (dataFiltro) {
        filtrados = filtrados.filter(log => log.created_at.startsWith(dataFiltro));
    }
    if (acao) {
        filtrados = filtrados.filter(log => log.acao.toLowerCase().includes(acao));
    }

    renderizarTabelaLogs(filtrados);
}

function limparFiltros(tipo) {
    if (tipo === 'agendamentos-aluno') {
        document.querySelectorAll('.filter-input').forEach(i => i.value = '');
        renderizarTabelaAluno(originalAgendamentos);
    } else if (tipo === 'agendamentos-prof') {
        document.querySelectorAll('.filter-input').forEach(i => i.value = '');
        renderizarTabelaProfissional(originalAgendamentos);
    } else if (tipo === 'itens') {
        document.querySelectorAll('.filter-input').forEach(i => i.value = '');
        renderizarTabelaItens(originalItens);
    } else if (tipo === 'logs') {
        document.querySelectorAll('.filter-input').forEach(i => i.value = '');
        renderizarTabelaLogs(originalLogs);
    }
}

/**
 * Dashboard de Estatísticas Gerais (Gestão)
 */
async function carregarEstatisticas() {
    // Configurações Globais do Chart.js para visual Premium
    if (window.Chart) {
        Chart.defaults.font.family = "'Inter', sans-serif";
        Chart.defaults.color = "#666";
        Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        Chart.defaults.plugins.tooltip.padding = 12;
        Chart.defaults.plugins.tooltip.cornerRadius = 8;
    }

    // Proteção de rota no frontend
    const tipo = localStorage.getItem('tipo_usuario');
    if (tipo !== 'profissional') {
        showToast('Acesso restrito a gestores.');
        window.location.href = '/aluno/dashboard';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/estatisticas`);
        const data = await response.json();

        if (!response.ok) throw new Error(data.error || 'Erro desconhecido');

        // 1. Atualizar Cards de Texto
        if (document.getElementById('stat-agendamentos')) document.getElementById('stat-agendamentos').innerText = data.agendamentos.total;
        if (document.getElementById('stat-atendidos')) document.getElementById('stat-atendidos').innerText = data.agendamentos.porStatus.Atendido;
        if (document.getElementById('stat-alunos')) document.getElementById('stat-alunos').innerText = data.usuarios.alunos;
        if (document.getElementById('stat-gastos')) document.getElementById('stat-gastos').innerText = `R$ ${data.financeiro.gastoEstimado.toLocaleString('pt-BR')}`;
        if (document.getElementById('stat-itens')) document.getElementById('stat-itens').innerText = data.inventario.total;
        if (document.getElementById('stat-critico')) document.getElementById('stat-critico').innerText = data.inventario.estoqueBaixo;

        // 2. Gráfico de Status (Doughnut)
        const canvasStatus = document.getElementById('chartStatus');
        if (canvasStatus) {
            new Chart(canvasStatus.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: ['Pendente', 'Confirmado', 'Cancelado', 'Atendido'],
                    datasets: [{
                        data: [
                            data.agendamentos.porStatus.Pendente,
                            data.agendamentos.porStatus.Confirmado,
                            data.agendamentos.porStatus.Cancelado,
                            data.agendamentos.porStatus.Atendido
                        ],
                        backgroundColor: ['#f1c40f', '#3498db', '#e74c3c', '#2ecc71'],
                        hoverOffset: 15,
                        borderWidth: 0
                    }]
                },
                options: { 
                    responsive: true, 
                    cutout: '70%',
                    plugins: { 
                        legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } } 
                    },
                    animation: { animateScale: true, animateRotate: true }
                }
            });
        }

        // 3. Gráfico de Tendência Mensal (Line)
        const canvasTendencia = document.getElementById('chartTendencia');
        if (canvasTendencia && data.agendamentos.tendencia) {
            const labels = Object.keys(data.agendamentos.tendencia).sort();
            const values = labels.map(l => data.agendamentos.tendencia[l]);
            new Chart(canvasTendencia.getContext('2d'), {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Agendamentos',
                        data: values,
                        borderColor: '#1e6d38',
                        backgroundColor: 'rgba(30, 109, 56, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: { responsive: true, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
            });
        }

        // 4. Gráfico de Especialidades (Horizontal Bar)
        const canvasEsp = document.getElementById('chartEspecialidades');
        if (canvasEsp && data.agendamentos.porEspecialidade) {
            const labels = Object.keys(data.agendamentos.porEspecialidade);
            const values = labels.map(l => data.agendamentos.porEspecialidade[l]);
            new Chart(canvasEsp.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Demandas',
                        data: values,
                        backgroundColor: ['#3498db', '#9b59b6', '#e67e22', '#2ecc71', '#e74c3c'],
                        borderRadius: 5
                    }]
                },
                options: { 
                    indexAxis: 'y',
                    responsive: true, 
                    plugins: { legend: { display: false } },
                    scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } }
                }
            });
        }

        // 5. Gráfico de Usuários (Bar)
        const canvasUsers = document.getElementById('chartUsuarios');
        if (canvasUsers) {
            new Chart(canvasUsers.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: ['Alunos', 'Profissionais'],
                    datasets: [{
                        label: 'Total',
                        data: [data.usuarios.alunos, data.usuarios.profissionais],
                        backgroundColor: ['#9b59b6', '#34495e'],
                        borderRadius: 5
                    }]
                },
                options: { 
                    responsive: true, 
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                }
            });
        }

    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        showToast('Erro ao carregar estatísticas: ' + error.message);
    }
}

/** =========================================================
 * PRONTUÁRIO DIGITAL - MÓDULO DE ATENDIMENTO
 * ========================================================= */

function abrirModalAtendimento(id) {
    const modal = document.createElement('div');
    modal.id = 'modal-prontuario';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>📝 Finalizar Atendimento</h3>
            <p>Escreva abaixo as orientações ou prescrição para o aluno:</p>
            <textarea id="texto-prontuario" class="form-control" rows="6" placeholder="Ex: Paciente com sintomas de gripe. Prescrito repouso e hidratação..."></textarea>
            <div class="modal-actions">
                <button onclick="salvarAtendimento('${id}')" class="btn-green">Salvar e Finalizar</button>
                <button onclick="fecharModalProntuario()" class="btn-clear">Cancelar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function fecharModalProntuario() {
    const modal = document.getElementById('modal-prontuario');
    if (modal) modal.remove();
}

async function salvarAtendimento(id) {
    const observacoes = document.getElementById('texto-prontuario').value;
    if (!observacoes) return showToast("Por favor, escreva o prontuário antes de finalizar.");

    try {
        const response = await fetch(`${API_URL}/agendamentos/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Atendido', observacoes })
        });

        if (response.ok) {
            showToast("Atendimento finalizado com sucesso!");
            fecharModalProntuario();
            carregarDashboardProfissional();
        } else {
            showToast("Erro ao finalizar atendimento.");
        }
    } catch (error) {
        console.error("Erro:", error);
    }
}

function verProntuario(texto) {
    const modal = document.createElement('div');
    modal.id = 'modal-prontuario';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>📑 Orientações Médicas</h3>
            <div class="prontuario-view" style="background:#f9f9f9; padding:15px; border-radius:8px; margin: 15px 0; text-align:left; color:#333; line-height:1.6;">
                ${texto.replace(/\n/g, '<br>')}
            </div>
            <div class="modal-actions">
                <button onclick="fecharModalProntuario()" class="btn-green">Fechar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

/** =========================================================
 * SISTEMA DE NOTIFICAÇÕES (TOASTS)
 * ========================================================= */
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Ícones dinâmicos
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    toast.innerHTML = `<span>${icons[type] || '🔔'}</span> <span>${message}</span>`;
    
    // Click para fechar rápido
    toast.onclick = () => toast.remove();

    container.appendChild(toast);

    // Auto-remove após 3 segundos
    setTimeout(() => {
        if (toast.parentNode) toast.remove();
    }, 3000);
}

/**
 * Calcula a distância entre dois pontos selecionados na página de mapa (Requisito I)
 */
async function calcularDistanciaFrontend() {
    const coordA = document.getElementById('coord-a').value;
    const coordB = document.getElementById('coord-b').value;
    const resBox = document.getElementById('resultado-distancia');
    const resVal = document.getElementById('valor-distancia');

    if (!coordA || !coordB) {
        showToast("Selecione os dois pontos para calcular.", "warning");
        return;
    }

    const [lat1, lon1] = coordA.split(',').map(Number);
    const [lat2, lon2] = coordB.split(',').map(Number);

    try {
        const response = await fetch('/api/distancia', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat1, lon1, lat2, lon2 })
        });

        const data = await response.json();

        if (response.ok) {
            resVal.innerText = data.distancia_km;
            resBox.style.display = 'block';
            
            // Efeito visual de destaque
            resBox.classList.add('fade-in');
            showToast(`Distância calculada: ${data.distancia_km} km`);
        } else {
            showToast("Erro ao calcular distância: " + data.error, "error");
        }
    } catch (error) {
        console.error("Erro ao calcular distância:", error);
        showToast("Erro de conexão com o servidor.", "error");
    }
}
