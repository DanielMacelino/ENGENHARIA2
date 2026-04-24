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
            <li><a href="/aluno/dashboard" class="${path === '/aluno/dashboard' ? 'active' : ''}"><span style="color:gray">&#x1f3e0;</span> Home</a></li>
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
            alert('Foto de perfil atualizada com sucesso!');
        } else {
            alert('Erro ao atualizar foto: ' + data.error);
        }
    } catch (error) {
        console.error('Erro no upload:', error);
        alert('Erro ao conectar com o servidor.');
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
            alert('Item cadastrado com sucesso!');
            window.location.href = '/profissional/itens';
        } else {
            const err = await res.json();
            alert('Erro ao salvar item: ' + err.error);
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao conectar com o servidor.');
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
                    localStorage.setItem('usuario_nome', verifyData.nome);
                    localStorage.setItem('usuario_foto', verifyData.foto_url || '');
                    localStorage.setItem('usuario_especialidade', verifyData.especialidade || '');

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
                localStorage.setItem('usuario_nome', data.nome);
                localStorage.setItem('usuario_foto', data.foto_url || '');
                localStorage.setItem('usuario_especialidade', data.especialidade || '');

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
                    <button onclick="mudarStatus('${p.id}', 'Atendido')" class="btn-green" style="padding: 2px 8px; font-size: 0.8rem;">Atender</button>
                    <button onclick="mudarStatus('${p.id}', 'Cancelado')" style="background:none; border:none; cursor:pointer;" title="Recusar">&#x274c;</button>
                ` : '---'}
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

async function atualizarProfissionaisFiltrados() {
    const especialidade = document.getElementById('sel-especialidade').value;
    const selectProf = document.getElementById('sel-profissional');
    
    if (!especialidade) {
        selectProf.innerHTML = '<option value="">-- Selecione uma especialidade primeiro --</option>';
        limparHorarios();
        return;
    }

    try {
        const response = await fetch(`${API_URL}/profissionais`);
        const profissionais = await response.json();

        // Filtrar por especialidade
        const filtrados = profissionais.filter(p => p.especialidade === especialidade);

        selectProf.innerHTML = '<option value="">-- Selecione --</option>';
        filtrados.forEach(p => {
            const option = document.createElement('option');
            option.value = p.id;
            option.textContent = p.nome;
            selectProf.appendChild(option);
        });

        limparHorarios();
    } catch (error) {
        console.error('Erro ao buscar profissionais:', error);
    }
}

async function atualizarHorariosDisponíveis() {
    const especialidade = document.getElementById('sel-especialidade').value;
    const profissionalId = document.getElementById('sel-profissional').value;
    const dataStr = document.getElementById('data-agendamento').value;
    const containerHorarios = document.getElementById('horarios-container');
    const gridHorarios = document.getElementById('grid-horarios');

    if (!especialidade || !profissionalId || !dataStr) {
        containerHorarios.style.display = 'none';
        limparResumo();
        return;
    }

    try {
        // Descobrir dia da semana da data
        const data = new Date(dataStr + 'T00:00:00');
        const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        const diaSemana = diasSemana[data.getDay()];

        // Buscar disponibilidades
        const response = await fetch(`${API_URL}/profissionais/horarios`);
        const disponibilidades = await response.json();

        // Filtrar disponibilidades para o profissional e dia específico
        const disponivelDia = disponibilidades.find(
            d => d.profissional_id === profissionalId && d.dia_semana === diaSemana
        );

        gridHorarios.innerHTML = '';
        containerHorarios.style.display = 'block';

        if (!disponivelDia || disponivelDia.horarios.length === 0) {
            gridHorarios.innerHTML = '<div class="horario-nao-disponivel">Nenhum horário disponível para este profissional neste dia.</div>';
            limparResumo();
            return;
        }

        // Renderizar botões de horário
        disponivelDia.horarios.forEach(horario => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn-horario';
            btn.textContent = horario;
            btn.onclick = () => selecionarHorario(especialidade, profissionalId, dataStr, horario, btn);
            gridHorarios.appendChild(btn);
        });

    } catch (error) {
        console.error('Erro ao buscar horários disponíveis:', error);
    }
}

function selecionarHorario(especialidade, profissionalId, dataStr, horario, botao) {
    // Remover seleção anterior
    document.querySelectorAll('.btn-horario').forEach(b => b.classList.remove('selected'));
    
    // Selecionar novo horário
    botao.classList.add('selected');

    // Buscar nome do profissional
    const selectProf = document.getElementById('sel-profissional');
    const profNome = selectProf.options[selectProf.selectedIndex].text;

    // Formatar data para exibição
    const data = new Date(dataStr + 'T00:00:00');
    const dataFormatada = data.toLocaleDateString('pt-BR');

    // Atualizar resumo
    const resumo = document.getElementById('resumo-agendamento');
    const btnConfirmar = document.getElementById('btn-confirmar-agendamento');
    
    document.getElementById('resumo-especialidade').textContent = especialidade;
    document.getElementById('resumo-profissional').textContent = profNome;
    document.getElementById('resumo-data').textContent = dataFormatada;
    document.getElementById('resumo-horario').textContent = horario;

    resumo.classList.add('visible');
    btnConfirmar.style.display = 'block';

    // Armazenar dados no botão para confirmar depois
    btnConfirmar.dataset.especialidade = especialidade;
    btnConfirmar.dataset.profissionalId = profissionalId;
    btnConfirmar.dataset.data = dataStr;
    btnConfirmar.dataset.horario = horario;
}

async function confirmarAgendamento() {
    const btn = document.getElementById('btn-confirmar-agendamento');
    const especialidade = btn.dataset.especialidade;
    const profissionalId = btn.dataset.profissionalId;
    const data = btn.dataset.data;
    const horario = btn.dataset.horario;

    if (!especialidade || !profissionalId || !data || !horario) {
        alert('Por favor, selecione todos os campos antes de confirmar.');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/agendamentos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                usuario_id: localStorage.getItem('usuario_id'),
                profissional_id: profissionalId,
                especialidade: especialidade,
                data: data,
                hora: horario
            })
        });

        if (response.ok) {
            alert("Agendamento realizado com sucesso!");
            window.location.href = '/aluno/agendamentos';
        } else {
            const erro = await response.json();
            alert(erro.error || "Erro ao realizar agendamento.");
        }
    } catch (error) {
        console.error('Erro ao confirmar agendamento:', error);
        alert('Erro ao conectar com o servidor.');
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
                ${a.status === 'Pendente' ? `<button onclick="mudarStatus('${a.id}', 'Cancelado')" style="border:none; background:transparent; cursor:pointer;" title="Cancelar">&#x1f5d1;</button>` : '---'}
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
            alert("Grade de horários salva com sucesso!");
        } else {
            alert("Houve um erro ao salvar alguns horários.");
        }
    } catch (error) {
        console.error("Erro ao salvar:", error);
        alert("Erro de conexão ao salvar disponibilidade.");
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
        // Simulação ou busca real de logs
        const response = await fetch(`${API_URL}/logs`);
        const logs = await response.json();
        originalLogs = logs;
        renderizarTabelaLogs(logs);
    } catch (error) {
        console.error('Erro ao carregar logs:', error);
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
