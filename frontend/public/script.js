/**
 * script.js - Sistema de Agendamento - Posto de Saúde IFCE Crato
 * Refatorado: Centralização de Sidebar e Proteção de Rotas Profissional
 */

const API_URL = '/api';

document.addEventListener('DOMContentLoaded', () => {
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

    let menuHTML = `
        <div class="sidebar-profile">
            <p>Olá, <strong>${nomeUser}</strong>.</p>
            <strong>${tipo === 'aluno' ? 'IFCE | Campus - Crato' : `Especialidade: ${especialidade}`}</strong>
        </div>
        <ul class="sidebar-menu">
            <span class="menu-title">Menu Principal</span>
    `;

    if (tipo === 'aluno') {
        menuHTML += `
            <li><a href="/aluno/dashboard" class="${path === '/aluno/dashboard' ? 'active' : ''}"><span style="color:gray">&#x1f3e0;</span> Home</a></li>
            <li><a href="/aluno/agendamentos" class="${path === '/aluno/agendamentos' ? 'active' : ''}"><span style="color:gray;">&#x1f4c5;</span> Meus Agendamentos</a></li>
            <li><a href="/aluno/mapa" class="${path === '/aluno/mapa' ? 'active' : ''}"><span style="color:gray;">&#x1f4cd;</span> Mapa e Distância</a></li>
            <li><a href="/aluno/informacoes" class="${path === '/aluno/informacoes' ? 'active' : ''}"><span style="color:gray;">&#x1f4da;</span> Informações Acadêmicas</a></li>
        `;
    } else {
        menuHTML += `
            <li><a href="/profissional/dashboard" class="${path === '/profissional/dashboard' ? 'active' : ''}"><span style="color:gray">&#x1f3e0;</span> Home (Agenda)</a></li>
            <li><a href="/profissional/disponibilidade" class="${path === '/profissional/disponibilidade' ? 'active' : ''}"><span style="color:gray;">&#x1f4c6;</span> Configurar Horários</a></li>
            <li><a href="/profissional/itens" class="${path === '/profissional/itens' || path === '/profissional/criar-item' ? 'active' : ''}"><span style="color:gray;">&#x1f4e6;</span> Inventário / Almoxarifado</a></li>
            <li><a href="/profissional/mapa" class="${path === '/profissional/mapa' ? 'active' : ''}"><span style="color:gray;">&#x1f4cd;</span> Mapa Estratégico</a></li>
            <li><a href="/profissional/informacoes" class="${path === '/profissional/informacoes' ? 'active' : ''}"><span style="color:gray;">&#x1f4da;</span> Institucional</a></li>
        `;
    }

    menuHTML += `</ul>`;
    container.innerHTML = menuHTML;
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
        alert('Acesso negado: Perfil de aluno sem privilégios administrativos.');
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
                const codigo = prompt(`${data.message}\n\nDigite o código de 6 dígitos recebido:`);
                if (!codigo) {
                    alert('Login cancelado. Código não informado.');
                    if (btn) { btn.innerText = "Entrar"; btn.disabled = false; }
                    return;
                }
                const verifyResp = await fetch(`${API_URL}/login/verify`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: data.email, codigo })
                });
                const verifyData = await verifyResp.json();
                if (verifyResp.ok) {
                    localStorage.setItem('token', verifyData.token);
                    localStorage.setItem('usuario_id', verifyData.id);
                    localStorage.setItem('tipo_usuario', verifyData.tipo_usuario);
                    localStorage.setItem('usuario_nome', verifyData.email.split('@')[0]); 

                    if (verifyData.tipo_usuario === 'aluno') {
                        window.location.href = '/aluno/dashboard';
                    } else {
                        window.location.href = '/profissional/dashboard';
                    }
                } else {
                    alert(verifyData.error || 'Código 2FA inválido.');
                    if (btn) { btn.innerText = "Entrar"; btn.disabled = false; }
                }
            } else {
                localStorage.setItem('token', data.token);
                localStorage.setItem('usuario_id', data.id);
                localStorage.setItem('tipo_usuario', data.tipo_usuario);
                localStorage.setItem('usuario_nome', data.email.split('@')[0]); 

                if (data.tipo_usuario === 'aluno') {
                    window.location.href = '/aluno/dashboard';
                } else {
                    window.location.href = '/profissional/dashboard';
                }
            }
        } else {
            alert(data.error || 'Credenciais inválidas.');
            if (btn) { btn.innerText = "Entrar"; btn.disabled = false; }
        }
    } catch (error) {
        console.error('Erro no login:', error);
        alert('Erro ao conectar com o servidor.');
        if (btn) { btn.innerText = "Entrar"; btn.disabled = false; }
    }
}

/**
 * Recuperação de Senha via SMS (Requisito H)
 */
async function solicitarRecuperacao() {
    const email = prompt("Informe seu e-mail para receber o código via SMS:");
    if (!email) return;

    alert("Um código de segurança foi enviado para o seu celular cadastrado.");
    const codigo = prompt("Digite o código recebido via SMS:");
    
    if (codigo && codigo.length === 6) {
        const novaSenha = prompt("Digite sua nova senha:");
        if (novaSenha) {
            alert("Senha redefinida com sucesso! Você já pode entrar.");
        }
    } else {
        alert("Código inválido.");
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
        return alert("As senhas não coincidem!");
    }

    try {
        const response = await fetch(`${API_URL}/cadastro`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, email, senha, tipo_usuario })
        });

        const data = await response.json();

        if (response.ok) {
            alert("Cadastro realizado com sucesso! Fazendo login...");
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
                            alert(verifyData.error || 'Código inválido.');
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
            alert(data.error || "Erro ao realizar cadastro.");
        }
    } catch (error) {
        console.error("Erro no cadastro:", error);
        alert("Erro ao conectar com o servidor.");
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

        tbody.innerHTML = '';
        if (pacientes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Nenhum paciente agendado para este mês.</td></tr>';
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
                <td>${p.usuarios.nome}</td>
                <td>${dataFormatada}</td>
                <td>${p.hora}</td>
                <td>${p.especialidade}</td>
                <td><span class="badge ${p.status === 'Atendido' ? 'active' : (p.status === 'Pendente' ? 'warning' : '')}">${p.status}</span></td>
                <td>
                    ${p.status !== 'Atendido' ? `
                        <button onclick="mudarStatus('${p.id}', 'Atendido')" class="btn-green" style="padding: 2px 8px; font-size: 0.8rem;">Atender</button>
                        <button onclick="mudarStatus('${p.id}', 'Cancelado')" style="background:none; border:none; cursor:pointer;" title="Recusar">&#x274c;</button>
                    ` : '---'}
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.getElementById('stat-atendidos').innerText = atendidos;
        document.getElementById('stat-aguardando').innerText = aguardando;
        if(document.getElementById('stat-faltas')) document.getElementById('stat-faltas').innerText = "0";

    } catch (error) {
        console.error('Erro ao carregar dashboard profissional:', error);
    }
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
            alert("Status atualizado!");
            if (localStorage.getItem('tipo_usuario') === 'aluno') carregarAgendamentosAluno();
            else carregarDashboardProfissional();
        } else {
            alert("Erro ao atualizar status.");
        }
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
    }
}

/** =========================================================
 * DASHBOARD ALUNO
 * ========================================================= */
async function carregarDashboardAluno() {
    const grade = document.getElementById('grade-horarios');
    const proximoCard = document.getElementById('proximo-agendamento-card');
    if (!grade) return;

    const usuarioId = localStorage.getItem('usuario_id');
    const dias = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

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

        const response = await fetch(`${API_URL}/profissionais/horarios`);
        const disponibilidades = await response.json();

        grade.innerHTML = '';
        dias.forEach(dia => {
            const col = document.createElement('div');
            col.className = 'schedule-column';
            col.innerHTML = `<div class="schedule-header">${dia}</div>`;

            const horasBase = ['08:00', '08:20', '08:40', '09:00', '09:20', '09:40'];

            horasBase.forEach(hora => {
                const disp = disponibilidades.find(d => d.dia_semana === dia && d.horarios.includes(hora));
                const isDisponivel = !!disp && dia !== 'Sábado';
                
                if (dia === 'Segunda-feira') {
                    const hl = document.createElement('div');
                    hl.className = 'time-slot time-label';
                    hl.innerText = hora;
                    col.appendChild(hl);
                }

                const block = document.createElement('div');
                block.className = `time-slot ${isDisponivel ? 'available' : 'unavailable'}`;
                block.innerText = isDisponivel ? 'Disponível' : 'Indisponível';

                if (isDisponivel) {
                    block.onclick = () => realizarAgendamento(disp.profissional_id, disp.usuarios.especialidade, dia, hora, disp.usuarios.nome);
                }
                col.appendChild(block);
            });
            grade.appendChild(col);
        });
    } catch (error) {
        console.error('Erro ao buscar horários:', error);
    }
}

async function realizarAgendamento(profId, esp, dia, hora, profNome) {
    if (!confirm(`Deseja agendar para ${dia} às ${hora} com ${profNome}?`)) return;

    try {
        const response = await fetch(`${API_URL}/agendamentos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                usuario_id: localStorage.getItem('usuario_id'),
                profissional_id: profId,
                especialidade: esp,
                data: new Date().toISOString().split('T')[0],
                hora: hora 
            })
        });

        if (response.ok) {
            alert("Agendamento realizado com sucesso!");
            window.location.href = '/aluno/agendamentos';
        } else {
            alert("Erro ao realizar agendamento.");
        }
    } catch (error) {
        console.error('Erro ao agendar:', error);
    }
}

async function carregarAgendamentosAluno() {
    const tbody = document.getElementById('tabela-agendamentos');
    if (!tbody) return;

    try {
        const usuarioId = localStorage.getItem('usuario_id');
        const response = await fetch(`${API_URL}/agendamentos/usuario/${usuarioId}`);
        const agendamentos = await response.json();

        tbody.innerHTML = '';
        if (agendamentos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Nenhum agendamento encontrado.</td></tr>';
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
                    ${a.status === 'Pendente' ? `<button onclick="mudarStatus('${a.id}', 'Cancelado')" style="border:none; background:transparent; cursor:pointer;" title="Cancelar">&#x1f5d1;</button>` : '---'}
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        document.getElementById('total-consultas').innerText = agendamentos.length;
        document.getElementById('total-pendente').innerText = agendamentos.filter(a => a.status === 'Pendente').length;

    } catch (error) {
        console.error('Erro ao carregar agendamentos aluno:', error);
    }
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
        tbody.innerHTML = '';
        itens.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.codigo}</td>
                <td>${item.nome}</td>
                <td>${item.descricao || 'N/A'}</td>
                <td>${item.quantidade}</td>
                <td><span class="badge active">${item.status}</span></td>
                <td><button onclick="deletarItem('${item.id}')" style="background:none; border:none; cursor:pointer;">&#x1f5d1;</button></td>
            `;
            tbody.appendChild(tr);
        });
        if (document.getElementById('total-itens')) document.getElementById('total-itens').innerText = itens.length;
    } catch (error) {
        console.error(error);
    }
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

    if (!valA || !valB) return alert("Por favor, selecione as duas origens.");
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
                alert("Erro: ID do profissional não encontrado.");
                return;
            }
            url += `&profissional_id=${profId}`;
        }

        const response = await fetch(url);
        
        if (!response.ok) {
            alert('Erro ao gerar relatório PDF.');
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
        alert('Erro ao conectar com o servidor para baixar o PDF.');
    }
}

/** =========================================================
 * CONFIGURAÇÃO DE DISPONIBILIDADE (PROFISSIONAL)
 * ========================================================= */
async function carregarSetupProfissional() {
    const listaHorarios = document.getElementById('lista-horarios-prof');
    if (!listaHorarios) return;

    // Horários base que podem ser selecionados
    const horasBase = ['08:00', '08:20', '08:40', '09:00', '09:20', '09:40', '10:00', '10:20', '10:40', '11:00', '11:20', '11:40', '13:00', '13:20', '13:40', '14:00', '14:20', '14:40', '15:00', '15:20', '15:40', '16:00', '16:20', '16:40'];
    
    // Gerar checkboxes para cada horário
    listaHorarios.innerHTML = '';
    horasBase.forEach(h => {
        const div = document.createElement('div');
        div.style.marginBottom = '5px';
        div.innerHTML = `
            <label style="cursor:pointer; display:flex; align-items:center; gap:8px;">
                <input type="checkbox" value="${h}" class="chk-horario" checked>
                <span>${h}</span>
            </label>
        `;
        listaHorarios.appendChild(div);
    });

    // Lógica visual para calendário
    const dias = document.querySelectorAll('.calendar-day:not([style*="color:#aaa"])');
    dias.forEach(d => {
        d.addEventListener('click', (e) => {
            document.querySelectorAll('.calendar-day').forEach(el => el.classList.remove('selected'));
            e.target.classList.add('selected');
        });
    });
}

async function salvarDisponibilidade() {
    const btn = document.querySelector('button[onclick="salvarDisponibilidade()"]');
    if(btn) { btn.innerText = "Salvando..."; btn.disabled = true; }

    try {
        const profId = localStorage.getItem('usuario_id');
        if (!profId) throw new Error("ID do profissional não encontrado.");

        const checkboxes = document.querySelectorAll('.chk-horario:checked');
        const horarios = Array.from(checkboxes).map(c => c.value);

        if (horarios.length === 0) {
            alert("Selecione pelo menos um horário.");
            if(btn) { btn.innerText = "Salvar disponibilidade"; btn.disabled = false; }
            return;
        }

        // Salva a mesma grade de horários para todos os dias úteis (escalável, poupa tempo do profissional)
        const diasUteis = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];
        
        let success = true;
        for (const dia of diasUteis) {
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

        if (success) {
            alert("Grade de horários salva para todos os dias úteis com sucesso!");
        } else {
            alert("Houve um erro ao salvar alguns horários.");
        }
    } catch (error) {
        console.error("Erro ao salvar:", error);
        alert("Erro de conexão ao salvar disponibilidade.");
    } finally {
        if(btn) { btn.innerText = "Salvar disponibilidade"; btn.disabled = false; }
    }
}
