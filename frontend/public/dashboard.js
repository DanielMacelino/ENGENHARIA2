/* dashboard.js */
import { API_URL, showToast, getDistanciaHaversine } from './utils.js';
import { verificarSessao, sairDoSistema } from './auth.js';
import { initRealtime } from './realtime.js';

let originalAgendamentos = [];
let originalItens = [];
let originalLogs = [];

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
            <li><a href="/aluno/mapa" class="${path === '/aluno/mapa' ? 'active' : ''}"><i data-lucide="map-pin" style="width:18px;height:18px;"></i> Mapa e Distância</a></li>
            <li><a href="/aluno/informacoes" class="${path === '/aluno/informacoes' ? 'active' : ''}"><i data-lucide="book" style="width:18px;height:18px;"></i> Informações Acadêmicas</a></li>
        `;
    } else {
        menuHTML += `
            <li><a href="/profissional/dashboard" class="${path === '/profissional/dashboard' ? 'active' : ''}"><i data-lucide="home" style="width:18px;height:18px;"></i> Home (Agenda)</a></li>
            <li><a href="/profissional/disponibilidade" class="${path === '/profissional/disponibilidade' ? 'active' : ''}"><i data-lucide="calendar-clock" style="width:18px;height:18px;"></i> Configurar Horários</a></li>
            <li><a href="/profissional/itens" class="${path === '/profissional/itens' || path === '/profissional/criar-item' ? 'active' : ''}"><i data-lucide="package" style="width:18px;height:18px;"></i> Inventário</a></li>
            <li><a href="/profissional/estatisticas" class="${path === '/profissional/estatisticas' ? 'active' : ''}"><i data-lucide="bar-chart-2" style="width:18px;height:18px;"></i> Estatísticas Gerais</a></li>
            <li><a href="/profissional/logs" class="${path === '/profissional/logs' ? 'active' : ''}"><i data-lucide="file-text" style="width:18px;height:18px;"></i> Logs do Sistema</a></li>
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
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${p.usuarios ? p.usuarios.nome : 'N/A'}</td>
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
                        <button onclick="verProntuario('${p.observacoes || ''}')" class="btn-green" style="padding:4px 8px; font-size:0.8rem;" title="Ver Prontuário">👁️ Ver</button>
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

export async function confirmarAgendamentoSimplificado() {
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
                        <button onclick="verProntuario('${a.observacoes || ''}')" class="btn-green" style="padding:4px 8px; font-size:0.8rem;" title="Ver Resumo">👁️ Ver</button>
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

export function renderizarTabelaLogs(logs) {
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

export function filtrarLogs() {
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

export function abrirModalAtendimento(id) {
    const modal = document.createElement('div');
    modal.id = 'modal-prontuario';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px; text-align: left;">
            <h3 style="margin-bottom: 15px; color: var(--green-primary);"><i data-lucide="stethoscope" style="vertical-align: middle;"></i> Prontuário Eletrônico (PEP)</h3>
            
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

    const observacoes = JSON.stringify({ sintomas, diagnostico, prescricao });

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

export function verProntuario(textoJSON) {
    let dados = { sintomas: 'N/A', diagnostico: 'N/A', prescricao: 'N/A' };
    try {
        dados = JSON.parse(textoJSON);
    } catch (e) {
        dados.prescricao = textoJSON; // Retrocompatibilidade
    }

    const modal = document.createElement('div');
    modal.id = 'modal-prontuario';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px; text-align: left;">
            <h3 style="margin-bottom: 15px; color: var(--green-primary);"><i data-lucide="file-text" style="vertical-align: middle;"></i> Prontuário Eletrônico</h3>
            
            <div class="prontuario-view" style="background:#f9f9f9; padding:15px; border-radius:8px; margin: 15px 0; border-left: 4px solid var(--green-primary); color:#333; line-height:1.6;">
                <p><strong>Sintomas Relatados:</strong><br> ${dados.sintomas || 'N/A'}</p>
                <hr style="border:0; border-top:1px solid #eee; margin:10px 0;">
                <p><strong>Diagnóstico / Avaliação:</strong><br> ${dados.diagnostico || 'N/A'}</p>
                <hr style="border:0; border-top:1px solid #eee; margin:10px 0;">
                <p><strong>Prescrição / Orientações:</strong><br> ${(dados.prescricao || 'N/A').replace(/\n/g, '<br>')}</p>
            </div>

            <div class="modal-actions" style="justify-content: flex-end;">
                <button onclick="fecharModalProntuario()" class="btn-green">Fechar Prontuário</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    if (window.lucide) window.lucide.createIcons();
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
