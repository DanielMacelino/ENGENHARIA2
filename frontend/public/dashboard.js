/* dashboard.js */
import { API_URL, showToast, getDistanciaHaversine } from './utils.js';
import { verificarSessao, sairDoSistema } from './auth.js';
import { initRealtime } from './realtime.js';

let originalAgendamentos = [];
let originalItens = [];
let originalLogs = [];
let dadosEstatisticas = null; // Para exportação CSV


/**
 * Renderiza o Menu Lateral dinamicamente conforme o tipo de usuário
 * Este é o ponto único de manutenção do menu (Escalonável)
 */
export function renderSidebar() {
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
            <li><a href="/aluno/dashboard" class="${path === '/aluno/dashboard' ? 'active' : ''}"><i data-lucide="home" style="width:18px;height:18px;"></i> Home / Início</a></li>
            <li><a href="/aluno/novo-agendamento" class="${path === '/aluno/novo-agendamento' ? 'active' : ''}"><i data-lucide="plus-circle" style="width:18px;height:18px;color:var(--green-primary);"></i> Agendar Consulta</a></li>
            <li><a href="/aluno/agendamentos" class="${path === '/aluno/agendamentos' ? 'active' : ''}"><i data-lucide="calendar" style="width:18px;height:18px;"></i> Meus Agendamentos</a></li>
            <li><a href="/tutoriais" class="${path === '/tutoriais' ? 'active' : ''}"><i data-lucide="play-circle" style="width:18px;height:18px;color:var(--accent);"></i> IFCE Saúde Play</a></li>
            <li><a href="/aluno/mapa" class="${path === '/aluno/mapa' ? 'active' : ''}"><i data-lucide="map-pin" style="width:18px;height:18px;"></i> Mapa e Distância</a></li>

            <li><a href="/aluno/informacoes" class="${path === '/aluno/informacoes' ? 'active' : ''}"><i data-lucide="book" style="width:18px;height:18px;"></i> Informações Acadêmicas</a></li>
        `;
    } else {
        menuHTML += `
            <li><a href="/profissional/dashboard" class="${path === '/profissional/dashboard' ? 'active' : ''}"><i data-lucide="home" style="width:18px;height:18px;"></i> Home (Agenda)</a></li>
            <li><a href="/profissional/disponibilidade" class="${path === '/profissional/disponibilidade' ? 'active' : ''}"><i data-lucide="calendar-clock" style="width:18px;height:18px;"></i> Configurar Horários</a></li>
            <li><a href="/profissional/itens" class="${path === '/profissional/itens' || path === '/profissional/criar-item' ? 'active' : ''}"><i data-lucide="package" style="width:18px;height:18px;"></i> Inventário</a></li>
            <li><a href="/profissional/estatisticas" class="${path === '/profissional/estatisticas' ? 'active' : ''}"><i data-lucide="bar-chart-2" style="width:18px;height:18px;"></i> Estatísticas Gerais</a></li>
            <li><a href="/tutoriais" class="${path === '/tutoriais' ? 'active' : ''}"><i data-lucide="play-circle" style="width:18px;height:18px;color:var(--accent);"></i> IFCE Saúde Play</a></li>
            <li><a href="/comunicacao" class="${path === '/comunicacao' ? 'active' : ''}"><i data-lucide="message-square" style="width:18px;height:18px;color:var(--accent);"></i> Mural da Equipe <span class="badge-new">SOCKET</span></a></li>
            <li><a href="/profissional/mapa" class="${path === '/profissional/mapa' ? 'active' : ''}"><i data-lucide="map-pin" style="width:18px;height:18px;"></i> Mapa e Distância</a></li>
            <li><a href="/profissional/logs" class="${path === '/profissional/logs' ? 'active' : ''}"><i data-lucide="history" style="width:18px;height:18px;"></i> Histórico do Sistema</a></li>


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
    
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

/**
 * Faz o upload da foto de perfil para o Supabase Storage via backend
 */
export async function uploadProfilePhoto(input) {
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

/** =========================================================
 * AUTENTICAÇÃO
 * ========================================================= */
/**
 * Salva um novo item no inventário, incluindo upload de imagem opcional
 */
export async function salvarNovoItem(event) {
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
/** =========================================================
 * DASHBOARD PROFISSIONAL
 * ========================================================= */
export async function carregarDashboardProfissional() {
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

export function renderizarTabelaProfissional(pacientes) {
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

        // Parse triagem se houver
        let triagemHTML = '';
        let urgenciaCor = '';

        if (p.observacoes) {
            try {
                const obsObj = JSON.parse(p.observacoes);
                if (obsObj.triagem) {
                    const trg = obsObj.triagem;
                    if (trg.urgencia === 'Leve') { urgenciaCor = '#2ecc71'; }
                    else if (trg.urgencia === 'Moderado') { urgenciaCor = '#f1c40f'; }
                    else if (trg.urgencia === 'Grave') { urgenciaCor = '#e74c3c'; }

                    triagemHTML = `
                        <div class="triagem-indicator" style="display: inline-flex; align-items: center; gap: 4px; cursor: pointer; background: ${urgenciaCor}15; padding: 2px 8px; border-radius: 20px; border: 1px solid ${urgenciaCor}; margin-top: 4px;" onclick="mostrarTooltipTriagem('${p.id}')" title="Clique para ver a triagem completa">
                            <span style="font-weight: 700; color: ${urgenciaCor}; font-size: 0.75rem;">${trg.urgencia}</span>
                            <span style="font-size: 0.75rem;">📋</span>
                        </div>
                    `;
                }
            } catch (e) {
                // Não é JSON
            }
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div style="display:flex; flex-direction:column; gap:2px;">
                    <span style="font-weight: 600;">${p.usuarios ? p.usuarios.nome : 'N/A'}</span>
                    <div>${triagemHTML}</div>
                </div>
            </td>
            <td>${dataFormatada}</td>
            <td>${p.hora}</td>
            <td>${p.especialidade}</td>
            <td><span class="badge ${p.status === 'Atendido' ? 'active' : (p.status === 'Pendente' ? 'warning' : '')}">${p.status}</span></td>
            <td>
                ${p.status !== 'Atendido' ? `
                    <button onclick="abrirModalAtendimento('${p.id}')" class="btn-green" style="padding: 4px 8px; font-size: 0.8rem;">✅ Atender</button>
                    <button onclick="mudarStatus('${p.id}', 'Cancelado')" style="background:none; border:none; cursor:pointer; color:red;" title="Recusar">❌</button>
                ` : `
                    <div style="display:flex; gap:5px; justify-content:center;">
                        <button onclick="verProntuario('${p.id}')" class="btn-green" style="padding:4px 8px; font-size:0.8rem;" title="Ver Prontuário">👁️ Ver</button>
                        <button onclick="exportarPDF('receita', '${p.id}')" class="btn-green" style="padding:4px 8px; font-size:0.8rem; background:var(--green-dark);" title="Baixar Receita">💊 Receita</button>
                    </div>

                `}
            </td>
        `;
        tbody.appendChild(tr);
    });

    if(document.getElementById('stat-atendidos')) document.getElementById('stat-atendidos').innerText = atendidos;
    if(document.getElementById('stat-aguardando')) document.getElementById('stat-aguardando').innerText = aguardando;
}

export function filtrarAgendamentosProfissional() {
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

export async function mudarStatus(id, novoStatus) {
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
export async function carregarDashboardAluno() {
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
                    <div style="font-weight:bold; font-size:1.1rem; margin-bottom:5px; color:#444; display:flex; align-items:center; gap:8px;">
                        <i data-lucide="stethoscope" style="width:18px;height:18px;color:red;"></i> ${prox.especialidade}
                    </div>
                    <div class="stats-text" style="color:#555;">
                        <i data-lucide="calendar" style="width:16px;height:16px;"></i> <span>${prox.data} - ${prox.hora}</span>
                    </div>
                    <div class="stats-text" style="color:#555;">
                        <i data-lucide="user" style="width:16px;height:16px;"></i> Profissional: ${prox.usuarios ? prox.usuarios.nome : 'N/A'}
                    </div>
                `;
                if (window.lucide) window.lucide.createIcons();
            } else {
                proximoCard.innerHTML = `
                    <div style="display:flex; flex-direction:column; align-items:center; padding: 10px;">
                        <i data-lucide="calendar-heart" style="width: 48px; height: 48px; color: #ccc; margin-bottom: 10px;"></i>
                        <h4 style="color:#444; margin-bottom: 5px;">Tudo tranquilo por aqui</h4>
                        <p style="color:#999; font-size:0.9rem; text-align:center;">Você não tem agendamentos próximos. Agende abaixo se precisar.</p>
                    </div>
                `;
                if (window.lucide) window.lucide.createIcons();
            }
        }

        // Inicializar formulário de agendamento
        inicializarFormularioAgendamento();

    } catch (error) {
        console.error('Erro ao carregar dashboard aluno:', error);
    }
}

export async function inicializarFormularioAgendamento() {
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

export async function atualizarSlotsAutomaticos() {
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

export function selecionarHorarioSimplificado(hora, profId, profNome) {
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

export function abrirModalTriagem() {
    const modal = document.createElement('div');
    modal.id = 'modal-triagem-aluno';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 550px; text-align: left; border-top: 6px solid var(--accent); border-radius: 12px; background: white; padding: 25px; box-shadow: 0 10px 30px rgba(0,0,0,0.15);">
            <h3 style="margin-bottom: 10px; color: var(--accent); display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 1.3rem;">
                <span style="font-size: 1.5rem;">🏥</span> Triagem Pré-Consulta Inteligente
            </h3>
            <p style="font-size: 0.85rem; color: #666; margin-bottom: 20px;">
                Responda às perguntas rápidas para que o profissional de saúde entenda seu estado clínico.
            </p>
            
            <div style="margin-bottom: 15px;">
                <label style="font-weight: 700; display: block; margin-bottom: 8px; font-size: 0.95rem; color: #2c3e50;">1. Quais sintomas você está apresentando? (Selecione vários)</label>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #edf2f7;">
                    <label style="display:flex; align-items:center; gap:6px; font-size:0.9rem; cursor:pointer; color: #4a5568;">
                        <input type="checkbox" name="sintoma" value="Febre"> Febre
                    </label>
                    <label style="display:flex; align-items:center; gap:6px; font-size:0.9rem; cursor:pointer; color: #4a5568;">
                        <input type="checkbox" name="sintoma" value="Dor de cabeça"> Dor de cabeça
                    </label>
                    <label style="display:flex; align-items:center; gap:6px; font-size:0.9rem; cursor:pointer; color: #4a5568;">
                        <input type="checkbox" name="sintoma" value="Dor no corpo / Cansaço"> Dor no corpo / Cansaço
                    </label>
                    <label style="display:flex; align-items:center; gap:6px; font-size:0.9rem; cursor:pointer; color: #4a5568;">
                        <input type="checkbox" name="sintoma" value="Tosse / Coriza / Dor de garganta"> Sintomas gripais
                    </label>
                    <label style="display:flex; align-items:center; gap:6px; font-size:0.9rem; cursor:pointer; color: #4a5568;">
                        <input type="checkbox" name="sintoma" value="Tristeza / Desânimo persistente"> Tristeza / Desânimo
                    </label>
                    <label style="display:flex; align-items:center; gap:6px; font-size:0.9rem; cursor:pointer; color: #4a5568;">
                        <input type="checkbox" name="sintoma" value="Ansiedade / Estresse extremo"> Ansiedade / Estresse
                    </label>
                    <label style="display:flex; align-items:center; gap:6px; font-size:0.9rem; cursor:pointer; color: #4a5568;">
                        <input type="checkbox" name="sintoma" value="Dor de dente"> Dor de dente
                    </label>
                    <label style="display:flex; align-items:center; gap:6px; font-size:0.9rem; cursor:pointer; color: #4a5568;">
                        <input type="checkbox" name="sintoma" value="Outros sintomas"> Outros
                    </label>
                </div>
            </div>

            <div style="margin-bottom: 15px;">
                <label style="font-weight: 700; display: block; margin-bottom: 8px; font-size: 0.95rem; color: #2c3e50;">2. Há quantos dias os sintomas começaram?</label>
                <select id="triagem-duracao" class="form-control" style="padding: 10px; border-radius: 8px;">
                    <option value="Começou hoje">Começou hoje</option>
                    <option value="1 a 3 dias">1 a 3 dias</option>
                    <option value="4 a 7 dias">4 a 7 dias</option>
                    <option value="Mais de uma semana">Mais de uma semana</option>
                </select>
            </div>

            <div style="margin-bottom: 15px;">
                <label style="font-weight: 700; display: block; margin-bottom: 8px; font-size: 0.95rem; color: #2c3e50;">3. Qual é a intensidade do seu incômodo/dor?</label>
                <div style="display: flex; gap: 10px;">
                    <button type="button" class="btn-urgencia" data-urgencia="Leve" onclick="selecionarUrgenciaTriagem('Leve', this)" style="flex: 1; padding: 12px; border: 2px solid #2ecc71; border-radius: 8px; background: #f0fdf4; color: #27ae60; font-weight: 700; cursor: pointer; transition: all 0.2s;">
                        🟢 Leve
                    </button>
                    <button type="button" class="btn-urgencia" data-urgencia="Moderado" onclick="selecionarUrgenciaTriagem('Moderado', this)" style="flex: 1; padding: 12px; border: 2px solid #f1c40f; border-radius: 8px; background: #fef9e7; color: #d4ac0d; font-weight: 700; cursor: pointer; transition: all 0.2s;">
                        🟡 Moderado
                    </button>
                    <button type="button" class="btn-urgencia" data-urgencia="Grave" onclick="selecionarUrgenciaTriagem('Grave', this)" style="flex: 1; padding: 12px; border: 2px solid #e74c3c; border-radius: 8px; background: #fdf2f2; color: #c0392b; font-weight: 700; cursor: pointer; transition: all 0.2s;">
                        🔴 Grave
                    </button>
                </div>
                <input type="hidden" id="triagem-urgencia" value="Leve">
            </div>

            <div style="margin-bottom: 20px;">
                <label style="font-weight: 700; display: block; margin-bottom: 8px; font-size: 0.95rem; color: #2c3e50;">4. Descreva brevemente seus sintomas (Opcional)</label>
                <textarea id="triagem-relato" class="form-control" rows="2" placeholder="Fale em suas palavras o que está sentindo..." style="padding: 10px; border-radius: 8px; resize: none;"></textarea>
            </div>

            <div class="modal-actions" style="justify-content: flex-end; gap: 10px; display: flex; margin-top: 20px;">
                <button type="button" onclick="fecharModalTriagem()" class="btn-clear" style="padding: 10px 20px;">Cancelar</button>
                <button type="button" onclick="enviarAgendamentoComTriagem()" class="btn-green" style="padding: 10px 25px; background: var(--accent); border: none; box-shadow: 0 4px 12px var(--accent-glow);">✓ Finalizar Agendamento</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Set default selected styling
    const leveBtn = modal.querySelector('button[data-urgencia="Leve"]');
    if (leveBtn) {
        leveBtn.style.transform = 'scale(1.05)';
        leveBtn.style.boxShadow = '0 0 0 3px rgba(46, 204, 113, 0.3)';
    }

    if (window.lucide) window.lucide.createIcons();
}

export function fecharModalTriagem() {
    const modal = document.getElementById('modal-triagem-aluno');
    if (modal) modal.remove();
}

export function selecionarUrgenciaTriagem(nivel, element) {
    document.getElementById('triagem-urgencia').value = nivel;
    
    // Reset other buttons
    document.querySelectorAll('.btn-urgencia').forEach(btn => {
        btn.style.transform = 'scale(1)';
        btn.style.boxShadow = 'none';
    });
    
    // Highlight selected
    element.style.transform = 'scale(1.05)';
    let glowColor = 'rgba(46, 204, 113, 0.3)';
    if (nivel === 'Moderado') glowColor = 'rgba(241, 196, 15, 0.3)';
    if (nivel === 'Grave') glowColor = 'rgba(231, 76, 60, 0.3)';
    element.style.boxShadow = `0 0 0 3px ${glowColor}`;
}

export async function confirmarAgendamentoSimplificado() {
    const usuarioId = localStorage.getItem('usuario_id');
    if (!usuarioId) {
        showToast("Sessão expirada. Faça login novamente.");
        return;
    }
    abrirModalTriagem();
}

export async function enviarAgendamentoComTriagem() {
    const usuarioId = localStorage.getItem('usuario_id');
    
    // Coleta dados da triagem
    const sintomas = Array.from(document.querySelectorAll('input[name="sintoma"]:checked')).map(cb => cb.value);
    const duracao = document.getElementById('triagem-duracao').value;
    const urgencia = document.getElementById('triagem-urgencia').value;
    const relato = document.getElementById('triagem-relato').value.trim();

    if (sintomas.length === 0) {
        showToast("Por favor, selecione ao menos um sintoma da lista.", "warning");
        return;
    }

    const triagemJSON = {
        triagem: {
            sintomas,
            duracao,
            urgencia,
            relato: relato || "Sem relato em texto."
        }
    };

    const payload = {
        usuario_id: usuarioId,
        profissional_id: agendamentoSelecionado.profissional_id,
        especialidade: agendamentoSelecionado.especialidade,
        data: agendamentoSelecionado.data,
        hora: agendamentoSelecionado.hora,
        observacoes: JSON.stringify(triagemJSON)
    };

    const btn = document.querySelector('button[onclick="enviarAgendamentoComTriagem()"]');
    if (btn) { btn.disabled = true; btn.innerText = "Agendando..."; }

    try {
        const response = await fetch(`${API_URL}/agendamentos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            fecharModalTriagem();
            showToast(`✅ Sucesso! Seu agendamento para ${agendamentoSelecionado.especialidade} foi solicitado.`);
            window.location.href = '/aluno/agendamentos';
        } else {
            const err = await response.json();
            showToast("Erro ao agendar: " + err.error);
        }
    } catch (error) {
        console.error('Erro no agendamento:', error);
        showToast("Erro de conexão com o servidor.");
    } finally {
        if (btn) { btn.disabled = false; btn.innerText = "✓ Finalizar Agendamento"; }
    }
}

export function limparHorarios() {
    const containerHorarios = document.getElementById('horarios-container');
    const gridHorarios = document.getElementById('grid-horarios');
    
    if (containerHorarios) containerHorarios.style.display = 'none';
    if (gridHorarios) gridHorarios.innerHTML = '';
    
    limparResumo();
}

export function limparResumo() {
    const resumo = document.getElementById('resumo-agendamento');
    const btnConfirmar = document.getElementById('btn-confirmar-agendamento');
    
    if (resumo) resumo.classList.remove('visible');
    if (btnConfirmar) btnConfirmar.style.display = 'none';
}

export async function carregarAgendamentosAluno() {
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

export function renderizarTabelaAluno(agendamentos) {
    const tbody = document.getElementById('tabela-agendamentos');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (agendamentos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 40px;">
            <div style="display:flex; flex-direction:column; align-items:center; color:#666;">
                <i data-lucide="calendar-x" style="width: 48px; height: 48px; margin-bottom:15px; color:#ccc;"></i>
                <h3 style="margin-bottom:10px;">Nenhuma consulta marcada</h3>
                <p style="font-size:0.9rem;">Você ainda não possui histórico de agendamentos.</p>
            </div>
        </td></tr>`;
        if (window.lucide) window.lucide.createIcons();
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
                ${a.status === 'Pendente' ? `<button onclick="mudarStatus('${a.id}', 'Cancelado')" style="border:none; background:transparent; cursor:pointer; color: red;" title="Cancelar">❌</button>` : ''}
                ${a.status === 'Atendido' ? `
                    <div style="display:flex; gap:5px; justify-content:center;">
                        <button onclick="verProntuario('${a.id}')" class="btn-green" style="padding:4px 8px; font-size:0.8rem;" title="Ver Resumo">👁️ Ver</button>
                        <button onclick="exportarPDF('atestado', '${a.id}')" class="btn-green" style="padding:4px 8px; font-size:0.8rem; background:var(--green-dark);" title="Baixar Atestado">📄 Atestado</button>

                        <button onclick="exportarPDF('receita', '${a.id}')" class="btn-green" style="padding:4px 8px; font-size:0.8rem; background:#3498db;" title="Baixar Receita Médica">💊 Receita</button>
                    </div>
                ` : ''}
                ${a.status !== 'Pendente' && a.status !== 'Atendido' ? '---' : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    if(document.getElementById('total-consultas')) document.getElementById('total-consultas').innerText = agendamentos.length;
    if(document.getElementById('total-pendente')) document.getElementById('total-pendente').innerText = agendamentos.filter(a => a.status === 'Pendente').length;
}

export function filtrarAgendamentosAluno() {
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
export async function carregarItens() {
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

export function renderizarTabelaItens(itens) {
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

export function filtrarItens() {
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

export async function deletarItem(id) {
    if (!confirm("Excluir item?")) return;
    await fetch(`${API_URL}/itens/${id}`, { method: 'DELETE' });
    carregarItens();
}

/** =========================================================
 * CONFIGURAÇÃO DE DISPONIBILIDADE (PROFISSIONAL) - MATRIZ
 * ========================================================= */
export async function carregarSetupProfissional() {
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

export async function salvarDisponibilidade() {
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

export function selecionarTodos() {
    document.querySelectorAll('.chk-disponibilidade').forEach(chk => chk.checked = true);
    document.querySelectorAll('.chk-linha-toda').forEach(chk => chk.checked = true);
}

export function deselecionarTodos() {
    document.querySelectorAll('.chk-disponibilidade').forEach(chk => chk.checked = false);
    document.querySelectorAll('.chk-linha-toda').forEach(chk => chk.checked = false);
}

export function marcarLinhaToda(horario, checkboxMestre) {
    const checkboxesDaLinha = document.querySelectorAll(`.chk-disponibilidade[data-horario="${horario}"]`);
    checkboxesDaLinha.forEach(chk => {
        chk.checked = checkboxMestre.checked;
    });
}

/** =========================================================
 * LOGS DE SISTEMA
 * ========================================================= */
export async function carregarLogs() {
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

let autoRefreshInterval = null;

export async function carregarLogsCustom() {
    const icon = document.getElementById('icon-refresh');
    if (icon) icon.classList.add('spinning');
    
    await carregarLogs();
    
    if (icon) {
        setTimeout(() => {
            icon.classList.remove('spinning');
        }, 600);
    }
}

export function toggleAutoRefresh(checkbox) {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
    
    if (checkbox.checked) {
        showToast('Auto-atualização de logs ativada (10s)!');
        autoRefreshInterval = setInterval(() => {
            carregarLogsCustom();
        }, 10000);
    } else {
        showToast('Auto-atualização desativada.');
    }
}

export function renderizarTabelaLogs(logs) {
    const tbody = document.getElementById('tabela-logs');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">Nenhum log encontrado para os filtros selecionados.</td></tr>';
        return;
    }

    logs.forEach(log => {
        const tr = document.createElement('tr');
        // Formatar data: 2026-03-05T10:00:00 -> 05/03/2026 10:00
        const dataObj = new Date(log.created_at);
        const dataFormatada = dataObj.toLocaleString('pt-BR');

        // Mapeamento retrocompatível das colunas do banco logs
        const autor = log.usuarios?.nome || log.usuario_nome || 'Sistema';
        const acao = log.metodo || log.acao || 'Acesso';
        const detalhes = log.rota || log.detalhes || '---';

        // Definir coluna de Perfil / Especialidade
        let perfilHtml = '';
        if (log.usuarios) {
            const perfil = log.usuarios.tipo_usuario;
            const esp = log.usuarios.especialidade;
            if (perfil === 'profissional') {
                perfilHtml = `<span style="display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; color: #6366f1; background: #e0e7ff; border: 1px solid #c7d2fe;">🩺 Profissional${esp ? ' (' + esp + ')' : ''}</span>`;
            } else if (perfil === 'aluno') {
                perfilHtml = `<span style="display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; color: #0284c7; background: #e0f2fe; border: 1px solid #bae6fd;">🎓 Aluno</span>`;
            } else {
                perfilHtml = `<span style="display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; color: #475569; background: #f1f5f9; border: 1px solid #e2e8f0;">💻 Outro</span>`;
            }
        } else {
            perfilHtml = `<span style="display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; color: #475569; background: #f1f5f9; border: 1px solid #e2e8f0;">💻 Sistema</span>`;
        }

        // Definir coluna de Recurso Técnico
        let recursoHtml = '';
        const isRequestLog = ['GET', 'POST', 'PUT', 'DELETE'].includes(log.metodo) && log.rota && log.rota.startsWith('/');
        if (isRequestLog) {
            let methodBg = '#f1f5f9';
            let methodColor = '#475569';
            if (log.metodo === 'GET') { methodBg = '#ecfdf5'; methodColor = '#059669'; }
            else if (log.metodo === 'POST') { methodBg = '#eff6ff'; methodColor = '#2563eb'; }
            else if (log.metodo === 'PUT') { methodBg = '#fffbeb'; methodColor = '#d97706'; }
            else if (log.metodo === 'DELETE') { methodBg = '#fef2f2'; methodColor = '#dc2626'; }

            recursoHtml = `
                <div style="display: inline-flex; align-items: center; gap: 6px;">
                    <span style="font-family: monospace; font-size: 0.75rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: ${methodBg}; color: ${methodColor}; border: 1px solid ${methodColor}22;">
                        ${log.metodo}
                    </span>
                    <span style="font-family: monospace; font-size: 0.75rem; color: #64748b;">
                        ${log.rota}
                    </span>
                </div>
            `;
        } else {
            // É um log de auditoria personalizado rico
            recursoHtml = `
                <div style="display: inline-flex; align-items: center; gap: 6px;">
                    <span style="font-family: monospace; font-size: 0.75rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: #f8fafc; color: #0f172a; border: 1px solid #e2e8f0;">
                        AUDIT
                    </span>
                    <span style="font-family: monospace; font-size: 0.75rem; color: #94a3b8;">
                        N/A (Interface)
                    </span>
                </div>
            `;
        }

        // Escolher cor do badge conforme o tipo de ação
        let badgeColor = '#64748b'; // Cinza default
        let badgeBg = '#f1f5f9';

        if (acao.includes('Login')) {
            badgeColor = '#3b82f6';
            badgeBg = '#eff6ff';
        } else if (acao.includes('Consulta') || acao.includes('Atendimento')) {
            badgeColor = '#8b5cf6';
            badgeBg = '#f5f3ff';
        } else if (acao.includes('Excluído') || acao.includes('Cancelado') || acao.includes('DELETE')) {
            badgeColor = '#ef4444';
            badgeBg = '#fef2f2';
        } else if (acao.includes('Adicionado') || acao.includes('Cadastro') || acao.includes('Configurada') || acao.includes('Salvo') || acao.includes('POST')) {
            badgeColor = '#10b981';
            badgeBg = '#ecfdf5';
        } else if (acao.includes('Mural')) {
            badgeColor = '#f59e0b';
            badgeBg = '#fffbeb';
        }

        tr.innerHTML = `
            <td><strong style="color: #475569;">${dataFormatada}</strong></td>
            <td>
                <span class="user-pill" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 600; color: #1e293b;">
                    <i data-lucide="user" style="width: 14px; height: 14px; color: #64748b;"></i>
                    ${autor}
                </span>
            </td>
            <td>${perfilHtml}</td>
            <td>
                <span style="display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; color: ${badgeColor}; background: ${badgeBg}; border: 1px solid ${badgeColor}22;">
                    ${acao}
                </span>
            </td>
            <td style="color: #334155; font-size: 0.9rem; font-weight: 500;">${detalhes}</td>
            <td>${recursoHtml}</td>
        `;
        tbody.appendChild(tr);
    });

    if (window.lucide) {
        window.lucide.createIcons();
    }
}

export function filtrarLogs() {
    const dataFiltro = document.getElementById('dataFiltro')?.value;
    const acao = document.getElementById('filtro-acao')?.value.toLowerCase();

    let filtrados = originalLogs;

    if (dataFiltro) {
        filtrados = filtrados.filter(log => {
            const dataLog = log.created_at || log.data || '';
            return dataLog.startsWith(dataFiltro);
        });
    }
    if (acao) {
        filtrados = filtrados.filter(log => {
            const acaoText = (log.metodo || log.acao || '').toLowerCase();
            const detalhesText = (log.rota || log.detalhes || '').toLowerCase();
            const autorText = (log.usuarios?.nome || log.usuario_nome || '').toLowerCase();
            return acaoText.includes(acao) || detalhesText.includes(acao) || autorText.includes(acao);
        });
    }

    renderizarTabelaLogs(filtrados);
}

export function limparFiltros(tipo) {
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
export async function carregarEstatisticas() {
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
        dadosEstatisticas = data; // Salva para exportação CSV

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

/**
 * Exporta os dados das estatísticas para CSV (Requisito solicitado)
 */
export function exportarEstatisticasCSV() {
    if (!dadosEstatisticas) {
        showToast("Aguarde o carregamento dos dados para exportar.", "warning");
        return;
    }

    try {
        let csvContent = "\uFEFF"; // BOM para Excel reconhecer caracteres especiais (UTF-8)
        
        // 1. Cabeçalho Resumo
        csvContent += "RESUMO GERAL DO SISTEMA\n";
        csvContent += "Total de Agendamentos;Consultas Atendidas;Total de Alunos;Gasto Estimado;Itens em Estoque\n";
        csvContent += `${dadosEstatisticas.agendamentos.total};${dadosEstatisticas.agendamentos.porStatus.Atendido};${dadosEstatisticas.usuarios.alunos};${dadosEstatisticas.financeiro.gastoEstimado};${dadosEstatisticas.inventario.total}\n\n`;

        // 2. Tabela por Status
        csvContent += "DISTRIBUIÇÃO POR STATUS\n";
        csvContent += "Status;Quantidade\n";
        Object.keys(dadosEstatisticas.agendamentos.porStatus).forEach(status => {
            csvContent += `${status};${dadosEstatisticas.agendamentos.porStatus[status]}\n`;
        });
        csvContent += "\n";

        // 3. Tabela por Especialidade
        csvContent += "DEMANDA POR ESPECIALIDADE\n";
        csvContent += "Especialidade;Quantidade\n";
        Object.keys(dadosEstatisticas.agendamentos.porEspecialidade).forEach(esp => {
            csvContent += `${esp};${dadosEstatisticas.agendamentos.porEspecialidade[esp]}\n`;
        });

        // Download do arquivo
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Relatorio_Gestao_IFCE_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast("Relatório CSV gerado com sucesso!");
    } catch (error) {
        console.error("Erro ao gerar CSV:", error);
        showToast("Erro ao gerar arquivo CSV.", "error");
    }
}

/** =========================================================
 * PRONTUÁRIO DIGITAL - MÓDULO DE ATENDIMENTO
 * ========================================================= */

export function abrirModalAtendimento(id) {
    const agendamento = originalAgendamentos.find(a => a.id == id);
    let triagemBoxHTML = '';
    
    if (agendamento && agendamento.observacoes) {
        try {
            const obsObj = JSON.parse(agendamento.observacoes);
            if (obsObj.triagem) {
                const trg = obsObj.triagem;
                let urgenciaEmoji = '🟢';
                let urgenciaCor = '#2ecc71';
                if (trg.urgencia === 'Moderado') { urgenciaEmoji = '🟡'; urgenciaCor = '#f1c40f'; }
                if (trg.urgencia === 'Grave') { urgenciaEmoji = '🔴'; urgenciaCor = '#e74c3c'; }

                triagemBoxHTML = `
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 5px solid ${urgenciaCor}; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <h4 style="margin: 0 0 10px 0; color: #475569; font-size: 0.95rem; font-weight: 700; display:flex; align-items:center; gap:6px;">
                            📌 Triagem Pré-Consulta (Preenchida pelo Aluno)
                        </h4>
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; font-size:0.85rem; margin-bottom:8px; color:#64748b;">
                            <span><strong>Urgência:</strong> <span style="font-weight:700; color:${urgenciaCor};">${urgenciaEmoji} ${trg.urgencia}</span></span>
                            <span><strong>Início dos sintomas:</strong> ${trg.duracao}</span>
                        </div>
                        <p style="margin:0 0 8px 0; font-size:0.85rem; color:#475569;"><strong>Sintomas:</strong> ${trg.sintomas.join(', ')}</p>
                        <p style="margin:0; font-size:0.85rem; color:#64748b; font-style:italic;"><strong>Relato:</strong> "${trg.relato || 'Sem descrição adicional.'}"</p>
                    </div>
                `;
            }
        } catch (e) {
            // Ignora
        }
    }

    const modal = document.createElement('div');
    modal.id = 'modal-prontuario';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px; text-align: left;">
            <h3 style="margin-bottom: 15px; color: var(--green-primary);"><i data-lucide="stethoscope" style="vertical-align: middle;"></i> Prontuário Eletrônico (PEP)</h3>
            
            ${triagemBoxHTML}
            
            <div style="margin-bottom: 12px;">
                <label style="font-weight: 600; display: block; margin-bottom: 5px;">Sintomas Relatados:</label>
                <textarea id="pep-sintomas" class="form-control" rows="2" placeholder="Descreva os sintomas do paciente..."></textarea>
            </div>
            
            <div style="margin-bottom: 12px;">
                <label style="font-weight: 600; display: block; margin-bottom: 5px;">Diagnóstico / Avaliação:</label>
                <input type="text" id="pep-diagnostico" class="form-control" placeholder="CID ou avaliação clínica...">
            </div>

            <div style="margin-bottom: 20px;">
                <label style="font-weight: 600; display: block; margin-bottom: 5px;">Prescrição Médica / Orientações:</label>
                <textarea id="pep-prescricao" class="form-control" rows="4" placeholder="Medicamentos, dosagem e tempo de uso..."></textarea>
            </div>

            <div class="modal-actions" style="justify-content: flex-end;">
                <button onclick="fecharModalProntuario()" class="btn-clear">Cancelar</button>
                <button onclick="salvarAtendimento('${id}')" class="btn-green">Salvar Prontuário</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    if (window.lucide) window.lucide.createIcons();
}

export function fecharModalProntuario() {
    const modal = document.getElementById('modal-prontuario');
    if (modal) modal.remove();
}

export async function salvarAtendimento(id) {
    const sintomas = document.getElementById('pep-sintomas').value;
    const diagnostico = document.getElementById('pep-diagnostico').value;
    const prescricao = document.getElementById('pep-prescricao').value;

    if (!sintomas && !diagnostico && !prescricao) {
        return showToast("Por favor, preencha ao menos um campo do prontuário.");
    }

    const agendamento = originalAgendamentos.find(a => a.id == id);
    let triagemData = null;
    if (agendamento && agendamento.observacoes) {
        try {
            const obsObj = JSON.parse(agendamento.observacoes);
            if (obsObj.triagem) {
                triagemData = obsObj.triagem;
            }
        } catch (e) {
            // Ignora
        }
    }

    const observacoesObj = { sintomas, diagnostico, prescricao };
    if (triagemData) {
        observacoesObj.triagem = triagemData;
    }

    const observacoes = JSON.stringify(observacoesObj);

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

export function verProntuario(id) {
    const agendamento = originalAgendamentos.find(a => a.id == id);
    let textoJSON = agendamento ? agendamento.observacoes : '';
    
    let dados = { sintomas: 'N/A', diagnostico: 'N/A', prescricao: 'N/A' };
    let triagemBox = '';
    try {
        dados = JSON.parse(textoJSON);
        if (dados.triagem) {
            const trg = dados.triagem;
            let urgenciaEmoji = '🟢';
            let urgenciaCor = '#2ecc71';
            if (trg.urgencia === 'Moderado') { urgenciaEmoji = '🟡'; urgenciaCor = '#f1c40f'; }
            if (trg.urgencia === 'Grave') { urgenciaEmoji = '🔴'; urgenciaCor = '#e74c3c'; }
            
            triagemBox = `
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid ${urgenciaCor}; padding: 10px 15px; border-radius: 6px; margin-top: 15px; font-size: 0.85rem;">
                    <p style="margin:0 0 5px 0; font-weight:700; color:#475569;">📋 Ficha de Triagem Inicial do Aluno:</p>
                    <p style="margin:0 0 3px 0;"><strong>Sintomas:</strong> ${trg.sintomas.join(', ')} (Grau: <span style="color:${urgenciaCor}; font-weight:700;">${urgenciaEmoji} ${trg.urgencia}</span>)</p>
                    <p style="margin:0;"><strong>Relato:</strong> "${trg.relato || 'Sem relato adicional.'}"</p>
                </div>
            `;
        }
    } catch (e) {
        dados.prescricao = textoJSON || 'N/A'; // Retrocompatibilidade
    }

    const modal = document.createElement('div');
    modal.id = 'modal-prontuario';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px; text-align: left;">
            <h3 style="margin-bottom: 15px; color: var(--green-primary);"><i data-lucide="file-text" style="vertical-align: middle;"></i> Prontuário Eletrônico</h3>
            
            <div class="prontuario-view">
                <p><strong>Sintomas Relatados:</strong><br> ${dados.sintomas || 'N/A'}</p>
                <hr style="border:0; border-top:1px solid #eee; margin:10px 0;">
                <p><strong>Diagnóstico / Avaliação:</strong><br> ${dados.diagnostico || 'N/A'}</p>
                <hr style="border:0; border-top:1px solid #eee; margin:10px 0;">
                <p><strong>Prescrição / Orientações:</strong><br> ${(dados.prescricao || 'N/A').replace(/\n/g, '<br>')}</p>
                
                ${triagemBox}
            </div>

            <div class="modal-actions" style="justify-content: flex-end;">
                <button onclick="fecharModalProntuario()" class="btn-green">Fechar Prontuário</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    if (window.lucide) window.lucide.createIcons();
}

export function mostrarTooltipTriagem(id) {
    const agendamento = originalAgendamentos.find(a => a.id == id);
    if (!agendamento || !agendamento.observacoes) return;

    try {
        const obsObj = JSON.parse(agendamento.observacoes);
        if (!obsObj.triagem) return;
        const trg = obsObj.triagem;

        let urgenciaEmoji = '🟢';
        let urgenciaCor = '#2ecc71';
        if (trg.urgencia === 'Moderado') { urgenciaEmoji = '🟡'; urgenciaCor = '#f1c40f'; }
        if (trg.urgencia === 'Grave') { urgenciaEmoji = '🔴'; urgenciaCor = '#e74c3c'; }

        const modal = document.createElement('div');
        modal.id = 'modal-triagem-detalhes';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 450px; text-align: left; border-top: 5px solid ${urgenciaCor}; border-radius: 12px; background: white; padding: 25px; box-shadow: 0 10px 30px rgba(0,0,0,0.15);">
                <h3 style="margin-bottom: 15px; color: ${urgenciaCor}; font-weight: 700; font-size: 1.2rem; display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 1.4rem;">📋</span> Ficha de Triagem Pré-Consulta
                </h3>
                
                <div style="display:flex; flex-direction:column; gap:12px; font-size: 0.9rem; color: #2c3e50;">
                    <p style="margin: 0;"><strong>Paciente:</strong> ${agendamento.usuarios ? agendamento.usuarios.nome : 'N/A'}</p>
                    <p style="margin: 0;"><strong>Grau de Urgência:</strong> <span style="font-weight: 700; color: ${urgenciaCor};">${urgenciaEmoji} ${trg.urgencia}</span></p>
                    <p style="margin: 0;"><strong>Sintomas Relatados:</strong><br> ${trg.sintomas.join(', ')}</p>
                    <p style="margin: 0;"><strong>Tempo de Início:</strong> ${trg.duracao}</p>
                    <div style="background: #f8fafc; padding: 12px; border-radius: 8px; border-left: 4px solid #cbd5e1; margin-top: 5px;">
                        <strong>Relato do Aluno:</strong><br>
                        <span style="font-style: italic; color: #475569;">"${trg.relato || 'Sem relato adicional.'}"</span>
                    </div>
                </div>

                <div class="modal-actions" style="justify-content: flex-end; margin-top: 20px; display: flex; gap: 10px;">
                    <button onclick="document.getElementById('modal-triagem-detalhes').remove()" class="btn-green" style="background: ${urgenciaCor}; border: none; padding: 10px 20px; box-shadow: 0 4px 12px ${urgenciaCor}30;">Fechar Ficha</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        if (window.lucide) window.lucide.createIcons();
    } catch (e) {
        console.error("Erro ao mostrar triagem:", e);
    }
}

/**
 * Calcula a distância entre dois pontos selecionados na página de mapa (Requisito I)
 */
export async function calcularDistanciaFrontend() {
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


// Exposing functions to global scope for inline HTML handlers
window.renderSidebar = renderSidebar;
window.uploadProfilePhoto = uploadProfilePhoto;
window.salvarNovoItem = salvarNovoItem;
window.carregarDashboardProfissional = carregarDashboardProfissional;
window.filtrarAgendamentosProfissional = filtrarAgendamentosProfissional;
window.mudarStatus = mudarStatus;
window.carregarDashboardAluno = carregarDashboardAluno;
window.atualizarSlotsAutomaticos = atualizarSlotsAutomaticos;
window.selecionarHorarioSimplificado = selecionarHorarioSimplificado;
window.confirmarAgendamentoSimplificado = confirmarAgendamentoSimplificado;
window.carregarAgendamentosAluno = carregarAgendamentosAluno;
window.filtrarAgendamentosAluno = filtrarAgendamentosAluno;
window.carregarItens = carregarItens;
window.filtrarItens = filtrarItens;
window.deletarItem = deletarItem;
window.calcularDistanciaFrontend = calcularDistanciaFrontend;
window.carregarSetupProfissional = carregarSetupProfissional;
window.salvarDisponibilidade = salvarDisponibilidade;
window.selecionarTodos = selecionarTodos;
window.deselecionarTodos = deselecionarTodos;
window.marcarLinhaToda = marcarLinhaToda;
window.carregarLogs = carregarLogs;
window.filtrarLogs = filtrarLogs;
window.limparFiltros = limparFiltros;
window.carregarEstatisticas = carregarEstatisticas;
window.abrirModalAtendimento = abrirModalAtendimento;
window.fecharModalProntuario = fecharModalProntuario;
window.salvarAtendimento = salvarAtendimento;
window.verProntuario = verProntuario;
window.exportarEstatisticasCSV = exportarEstatisticasCSV;
window.abrirModalTriagem = abrirModalTriagem;
window.fecharModalTriagem = fecharModalTriagem;
window.selecionarUrgenciaTriagem = selecionarUrgenciaTriagem;
window.enviarAgendamentoComTriagem = enviarAgendamentoComTriagem;
window.mostrarTooltipTriagem = mostrarTooltipTriagem;
window.carregarLogsCustom = carregarLogsCustom;
window.toggleAutoRefresh = toggleAutoRefresh;


