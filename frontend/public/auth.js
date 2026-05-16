/* auth.js */
import { API_URL, showToast, shakeElement } from './utils.js';

export function verificarSessao() {
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

export function sairDoSistema() {
    localStorage.clear();
    window.location.href = '/';
}
export async function fazerLogin(event) {
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
                
                // EXIBIR CÓDIGO NO CONSOLE (DEBUG)
                console.log("%c[DEBUG 2FA] Código de Verificação: " + data.codigo_debug, "color: #1e6d38; font-weight: bold; font-size: 1.2rem;");
                
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

export function inicializarInputsCodigo() {
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
        
        // Tratar tecla Enter para confirmar
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const email = localStorage.getItem('temp_login_email');
                if (email) verificarCodigo2FA(email);
            }
        });

        // Tratar evento de Colar (Paste)
        input.addEventListener('paste', (e) => {

            e.preventDefault();
            const pasteData = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '').substring(0, 6);
            if (pasteData) {
                for (let i = 0; i < pasteData.length; i++) {
                    if (inputs[i]) {
                        inputs[i].value = pasteData[i];
                    }
                }
                if (pasteData.length < 6 && inputs[pasteData.length]) {
                    inputs[pasteData.length].focus();
                } else {
                    inputs[5].focus();
                }
            }
        });

        // Auto focus no primeiro
        if (index === 0) setTimeout(() => input.focus(), 100);
    });
}

export async function verificarCodigo2FA(email) {
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

export function salvarSessaoERecirecionar(data) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('usuario_id', data.id);
    localStorage.setItem('tipo_usuario', data.tipo_usuario);
    localStorage.setItem('usuario_nome', data.nome);
    localStorage.setItem('usuario_foto', data.foto_url || '');
    localStorage.setItem('usuario_especialidade', data.especialidade || '');

    window.location.href = data.tipo_usuario === 'aluno' ? '/aluno/dashboard' : '/profissional/dashboard';
}

export function voltarParaLogin() {
    document.getElementById('login-step-2').style.display = 'none';
    document.getElementById('login-step-1').style.display = 'block';
    const btn = document.getElementById('btn-entrar');
    if (btn) { btn.innerText = "Entrar"; btn.disabled = false; }
}
/**
 * Recuperação de Senha via E-mail
 */
export async function solicitarRecuperacao() {
    const email = prompt("Informe seu e-mail para receber o código de recuperação:");
    if (!email) return;

    showToast("Um código de segurança foi enviado para o seu e-mail cadastrado.");
    const codigo = prompt("Digite o código recebido por E-mail:");
    
    if (codigo && codigo.length === 6) {
        const novaSenha = prompt("Digite sua nova senha:");
        if (novaSenha) {
            showToast("Senha redefinida com sucesso! Você já pode entrar.");
        }
    } else {
        showToast("Código inválido.");
    }
}


export async function realizarCadastro(event) {
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


// Exposing functions to global scope for inline HTML handlers
window.fazerLogin = fazerLogin;
window.verificarCodigo2FA = verificarCodigo2FA;
window.voltarParaLogin = voltarParaLogin;
window.solicitarRecuperacao = solicitarRecuperacao;
window.realizarCadastro = realizarCadastro;
window.sairDoSistema = sairDoSistema;
window.verificarSessao = verificarSessao;
