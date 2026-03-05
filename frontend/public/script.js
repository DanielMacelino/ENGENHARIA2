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

function fazerLogin(event) {
    if (event) event.preventDefault();
    const email = document.getElementById('email')?.value;
    const senha = document.getElementById('senha')?.value;
    const btn = document.getElementById('btn-entrar');
    if (btn) { btn.innerText = "Carregando..."; btn.disabled = true; }

    /*
    fetch(`${API_URL}/login`, {
        method: 'POST', body: JSON.stringify({ email, senha })
    }).then(...)
    */

    setTimeout(() => {
        if (email.includes('aluno')) {
            window.location.href = '/aluno/dashboard';
        } else if (email) {
            // Qualquer outro email, joga pro painel de Profissional
            window.location.href = '/profissional/disponibilidade';
        } else {
            alert('Preencha os campos!');
            if (btn) { btn.innerText = "Entrar"; btn.disabled = false; }
        }
    }, 800);
}

/** =========================================================
 * SIMULAÇÃO: GET /profissionais/horarios
 * Local: /aluno/dashboard
 * ========================================================= */
function carregarDashboardAluno() {
    const grade = document.getElementById('grade-horarios');
    if (!grade) return;

    // Colunas de segunda a sabado simuladas
    const dias = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const horariosMock = ['08:00', '08:20', '08:40', '09:00', '09:20', '09:40'];

    /*
    fetch(`${API_URL}/profissionais/horarios?especialidade=Geral`)
    */

    // Gerar visualmente
    setTimeout(() => {
        grade.innerHTML = '';

        dias.forEach(dia => {
            const col = document.createElement('div');
            col.className = 'schedule-column';
            col.innerHTML = `<div class="schedule-header">${dia}</div>`;

            horariosMock.forEach(hora => {
                // Randomizando o status
                const isDisponivel = Math.random() > 0.3;
                let classStatus = isDisponivel ? 'available' : 'unavailable';
                let labelStatus = isDisponivel ? 'Disponível' : 'Indisponível';

                // No Sabado, tudo fechado no mock
                if (dia === 'Sábado') {
                    classStatus = 'unavailable';
                    labelStatus = 'Indisponível';
                }

                // Cria o time label só na 1a coluna pra simular a imagem
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
                    block.onclick = () => {
                        if (confirm(`Deseja agendar para ${dia} às ${hora}?`)) {
                            alert("Simulado POST /agendamentos ! Redirecionando...");
                            window.location.href = '/aluno/agendamentos';
                        }
                    }
                }

                col.appendChild(block);
            });
            grade.appendChild(col);
        });
    }, 500);
}

function novoAgendamentoModal() {
    alert("Aqui abriria um Modal ou formulário rápido para chamar a rota POST /agendamentos");
}

/** =========================================================
 * SIMULAÇÃO: GET /agendamentos/usuario/:id
 * Local: /aluno/agendamentos
 * ========================================================= */
function carregarAgendamentosAluno() {
    const tbody = document.getElementById('tabela-agendamentos');
    if (!tbody) return;

    /*
    fetch(`${API_URL}/agendamentos/usuario/123`)
    */

    const mockAgendamentos = [
        { servico: "Dentista", data: "12/03", hora: "09:20", prof: "Dr. João", status: "Confirmado", color: "#555" },
        { servico: "Psicóloga", data: "15/05", hora: "14:20", prof: "Maria", status: "Pendente", color: "#f0ad4e" },
        { servico: "Dentista", data: "12/06", hora: "09:00", prof: "Dr. João", status: "Agendado", color: "#1e6d38" }
    ];

    setTimeout(() => {
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
    }, 500);
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
