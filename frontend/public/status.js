/**
 * Module: Status do Posto de Saúde
 * Integração com IoT Virtual (Wokwi)
 * Verifica e atualiza o status do posto em tempo real
 */

// Função para verificar status do posto
export async function verificarStatusPosto() {
    try {
        const response = await fetch(`${window.appConfig?.API_BASE_URL || 'http://localhost:3000/api'}/status/posto`);
        
        if (!response.ok) {
            throw new Error(`Erro ${response.status}: Não foi possível obter o status`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("❌ Erro ao verificar status do posto:", error);
        return null;
    }
}

// Atualizar status no badge visual
export function atualizarBadgeStatus(statusData) {
    if (!statusData) return;
    
    const badge = document.getElementById('status-posto-badge');
    if (!badge) return;
    
    const icon = badge.querySelector('#status-icon');
    const text = badge.querySelector('#status-text');
    const proxima = badge.querySelector('#status-proxima');
    const detalhes = badge.querySelector('#status-detalhes');
    
    if (statusData.aberto) {
        // ABERTO - Verde
        badge.style.background = 'linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)';
        badge.style.borderLeft = '5px solid #28a745';
        badge.style.color = '#155724';
        icon.textContent = '🟢';
        icon.style.animation = 'pulse 2s infinite';
        text.textContent = '✅ ABERTO';
        proxima.textContent = `⏰ Fecha às ${statusData.proxima_mudanca}`;
        detalhes.textContent = `Horário: ${statusData.hora_atual}`;
    } else {
        // FECHADO - Vermelho
        badge.style.background = 'linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%)';
        badge.style.borderLeft = '5px solid #dc3545';
        badge.style.color = '#721c24';
        icon.textContent = '🔴';
        icon.style.animation = 'none';
        text.textContent = '❌ FECHADO';
        proxima.textContent = `🔔 Reabre às ${statusData.proxima_mudanca}`;
        detalhes.textContent = `Horário: ${statusData.hora_atual}`;
    }
}

// Enviar status para IoT (Wokwi)
export async function enviarStatusParaIoT(statusData) {
    try {
        // Simulação de envio para Wokwi
        console.log("📤 Enviando status para IoT:", {
            status: statusData.aberto ? "open" : "closed",
            led_color: statusData.aberto ? "green" : "red",
            hora: statusData.hora_atual
        });
        
        // Aqui você poderia enviar para um broker MQTT ou API do Wokwi
        // fetch('http://wokwi-simulator/api/status', { method: 'POST', body: JSON.stringify(...) })
    } catch (error) {
        console.error("Erro ao enviar status para IoT:", error);
    }
}

// Inicializar sistema de status
export function inicializarSistemaStatus() {
    // Verificar status imediatamente ao carregar
    verificarStatusPosto().then(data => {
        if (data) {
            atualizarBadgeStatus(data);
            enviarStatusParaIoT(data);
        }
    });
    
    // Atualizar a cada 30 segundos
    setInterval(() => {
        verificarStatusPosto().then(data => {
            if (data) {
                atualizarBadgeStatus(data);
                enviarStatusParaIoT(data);
            }
        });
    }, 30000);
}

// Criar e injetar o badge de status no DOM
export function criarBadgeStatus() {
    // Verificar se já existe
    if (document.getElementById('status-posto-badge')) {
        return;
    }
    
    // Criar elemento do badge
    const badge = document.createElement('div');
    badge.id = 'status-posto-badge';
    badge.className = 'status-badge-container';
    badge.innerHTML = `
        <div class="status-badge-content">
            <div class="status-badge-header">
                <span id="status-icon" style="font-size: 24px; margin-right: 10px;">🟢</span>
                <span id="status-text" style="font-weight: bold; font-size: 16px;">✅ ABERTO</span>
            </div>
            <div class="status-badge-info">
                <p id="status-proxima" style="margin: 8px 0 5px 0; font-size: 14px;">⏰ Fecha às 19:00</p>
                <p id="status-detalhes" style="margin: 0; font-size: 12px; opacity: 0.8;">Horário: 14:30</p>
            </div>
        </div>
    `;
    
    // Adicionar estilos dinâmicos
    if (!document.getElementById('style-status-badge')) {
        const style = document.createElement('style');
        style.id = 'style-status-badge';
        style.textContent = `
            .status-badge-container {
                display: flex;
                align-items: center;
                padding: 15px 20px;
                border-radius: 8px;
                margin: 20px 0;
                background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
                border-left: 5px solid #28a745;
                color: #155724;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                transition: all 0.3s ease;
            }
            
            .status-badge-content {
                flex: 1;
            }
            
            .status-badge-header {
                display: flex;
                align-items: center;
                margin-bottom: 8px;
            }
            
            .status-badge-info {
                padding-left: 34px;
            }
            
            @keyframes pulse {
                0%, 100% {
                    opacity: 1;
                }
                50% {
                    opacity: 0.6;
                }
            }
            
            @media (max-width: 768px) {
                .status-badge-container {
                    padding: 12px 15px;
                    margin: 15px 0;
                }
                
                .status-badge-header {
                    font-size: 14px;
                }
                
                #status-icon {
                    font-size: 18px;
                    margin-right: 8px;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    return badge;
}

// Injetar badge após carregamento do DOM
export function injetarBadgeNoDOM() {
    const badge = criarBadgeStatus();
    
    // Tentar injetar no topo do content-area
    const contentArea = document.querySelector('.content-area');
    if (contentArea && contentArea.firstChild) {
        contentArea.insertBefore(badge, contentArea.firstChild);
    } else {
        // Fallback: adicionar ao body
        document.body.insertBefore(badge, document.body.firstChild);
    }
    
    // Inicializar sistema de atualização
    inicializarSistemaStatus();
}

// Auto-injetar quando o documento estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injetarBadgeNoDOM);
} else {
    injectarBadgeNoDOM();
}
