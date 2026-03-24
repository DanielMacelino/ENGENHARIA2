/**
 * script.js - Sistema de Agendamento - Posto de Saúde
 * Lógica base de simulação e comentários sobre consumo da API.
 */

const API_URL = (typeof window.appConfig !== 'undefined') ? window.appConfig.API_BASE_URL : 'http://localhost:3000/api';

/** =========================================================
 * ROTA: POST /login
 * ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
    const formLogin = document.getElementById('form-login');
    if (formLogin) {
        formLogin.addEventListener('submit', fazerLogin);
    }
});

async function fazerLogin(event) {
    if (event) event.preventDefault();
    const email = document.getElementById('email')?.value;
    const senha = document.getElementById('senha')?.value;
    const btn = document.getElementById('btn-entrar');
    if (btn) { btn.innerText = "Carregando..."; btn.disabled = true; }

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('tipo_usuario', data.tipo_usuario);
            
            if (data.tipo_usuario === 'aluno') {
                window.location.href = '/aluno/dashboard';
            } else {
                window.location.href = '/profissional/disponibilidade';
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

/** =========================================================
 * ROTA: GET /profissionais/horarios
 * Local: /aluno/dashboard
 * ========================================================= */
async function carregarDashboardAluno() {
    const grade = document.getElementById('grade-horarios');
    if (!grade) return;

    const dias = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

    try {
        const response = await fetch(`${API_URL}/profissionais/horarios`);
        const disponibilidades = await response.json();

        grade.innerHTML = '';

        dias.forEach(dia => {
            const col = document.createElement('div');
            col.className = 'schedule-column';
            col.innerHTML = `<div class="schedule-header">${dia}</div>`;

            // Horários fixos para exibição baseados em um range comum (08:00 a 10:00)
            const horasBase = ['08:00', '08:20', '08:40', '09:00', '09:20', '09:40'];

            horasBase.forEach(hora => {
                // Procurar se algum profissional tem esse dia/hora disponível
                // Na nossa mock API simplificada por agora, ignoramos a data exata e focamos na hora
                const disp = disponibilidades.find(d => d.horarios.includes(hora));
                
                const isDisponivel = !!disp && dia !== 'Sábado';
                let classStatus = isDisponivel ? 'available' : 'unavailable';
                let labelStatus = isDisponivel ? 'Disponível' : 'Indisponível';

                if (dia === 'Segunda-feira') {
                    const hl = document.createElement('div');
                    hl.className = 'time-slot time-label';
                    hl.innerText = hora;
                    col.appendChild(hl);
                }

                const block = document.createElement('div');
                block.className = `time-slot ${classStatus}`;
                block.innerText = labelStatus;

                if (isDisponivel) {
                    block.onclick = async () => {
                        if (confirm(`Deseja agendar para ${dia} às ${hora}?`)) {
                            const resAgendar = await fetch(`${API_URL}/agendamentos`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ 
                                    profissional_id: disp.profissional_id,
                                    especialidade: disp.especialidade,
                                    data: "2025-06-12", // Mock data para o dia selecionado
                                    hora: hora 
                                })
                            });
                            if (resAgendar.ok) {
                                alert("Agendamento realizado com sucesso!");
                                window.location.href = '/aluno/agendamentos';
                            } else {
                                alert("Erro ao realizar agendamento.");
                            }
                        }
                    }
                }

                col.appendChild(block);
            });
            grade.appendChild(col);
        });

    } catch (error) {
        console.error('Erro ao buscar horários:', error);
        grade.innerHTML = '<p>Erro ao carregar horários.</p>';
    }
}

/** =========================================================
 * SIMULAÇÃO: GET /agendamentos/usuario/:id
 * Local: /aluno/agendamentos
 * ========================================================= */
async function carregarAgendamentosAluno() {
    const tbody = document.getElementById('tabela-agendamentos');
    if (!tbody) return;

    try {
        // Mock ID 1 por enquanto
        // No futuro, pegar o ID do token JWT decodificado
        // const response = await fetch(`${API_URL}/agendamentos/usuario/1`);
        
        // Como o backend ainda não tem essa rota específica para listar, 
        // mantemos o mock ou adaptamos se necessário
        const mockAgendamentos = [
            { servico: "Dentista", data: "12/03", hora: "09:20", prof: "Dr. João", status: "Confirmado", color: "#555" }
        ];

        tbody.innerHTML = '';
        mockAgendamentos.forEach(a => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${a.servico}</td>
                <td>${a.data}</td>
                <td>${a.hora}</td>
                <td>${a.prof}</td>
                <td style="color:${a.color}; font-weight:bold;">${a.status}</td>
                <td>
                    <button style="border:none; background:transparent; cursor:pointer;" title="Confirmar">&#x2705;</button>
                    <button style="border:none; background:transparent; cursor:pointer; color:red;" title="Cancelar">&#x274c;</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Erro ao carregar agendamentos:', error);
    }
}

/** =========================================================
 * SETUP PROFISSIONAL
 * Local: /profissional/disponibilidade
 * ========================================================= */
function carregarSetupProfissional() {
    const box = document.getElementById('lista-horarios-prof');
    if (!box) return;

    const horasMock = ['08:00 Hrs', '08:20 Hrs', '08:40 Hrs', '09:00 Hrs', '09:20 Hrs'];

    box.innerHTML = '';
    horasMock.forEach((h, index) => {
        const div = document.createElement('div');
        // Alternar as cores pra simular clicks
        div.className = `hour-block ${index % 2 === 0 ? 'selected' : ''}`;
        div.innerText = h;
        div.onclick = () => div.classList.toggle('selected'); // Efeito de selecao
        box.appendChild(div);
    });
}

function salvarDisponibilidade() {
    /*
    fetch(`${API_URL}/disponibilidade`, {
        method: 'POST', body: JSON.stringify({...})
    })
    */
    alert("Agenda atualizada com os horários selecionados! (Call POST /disponibilidade simulado)");
}
