import express from "express";

const router = express.Router();

/**
 * GET /api/status/posto
 * Retorna o status do posto de saúde (aberto/fechado)
 * Horário: 08:00 até 19:00
 */
router.get("/posto", (req, res) => {
    try {
        const now = new Date();
        const horaAtual = now.getHours();
        const minutoAtual = now.getMinutes();
        
        // Posto abre às 08:00 e fecha às 19:00
        const horaAbertura = 8;
        const horaFechamento = 19;
        
        const estaAberto = horaAtual >= horaAbertura && horaAtual < horaFechamento;
        
        // Formatar horário atual
        const horaFormatada = `${String(horaAtual).padStart(2, '0')}:${String(minutoAtual).padStart(2, '0')}`;
        
        // Determinar próxima mudança
        let proximaAbertura;
        let proximaFechamento;
        
        if (estaAberto) {
            proximaFechamento = horaFechamento;
            proximaAbertura = horaAbertura + 24; // Próximo dia
        } else {
            proximaAbertura = horaAbertura;
            if (horaAtual >= horaFechamento) {
                proximaFechamento = horaFechamento + 24; // Próximo dia
            } else {
                proximaFechamento = horaFechamento;
            }
        }
        
        // Formatar proximas horas
        const proximaAberturaFormatada = String(proximaAbertura % 24).padStart(2, '0') + ":00";
        const proximaFechamentoFormatada = String(proximaFechamento % 24).padStart(2, '0') + ":00";
        
        return res.json({
            aberto: estaAberto,
            hora_atual: horaFormatada,
            horario_funcionamento: `${String(horaAbertura).padStart(2, '0')}:00 - ${String(horaFechamento).padStart(2, '0')}:00`,
            proxima_abertura: proximaAberturaFormatada,
            proxima_fechamento: proximaFechamentoFormatada,
            proxima_mudanca: estaAberto ? proximaFechamentoFormatada : proximaAberturaFormatada,
            status_texto: estaAberto ? "✅ ABERTO" : "❌ FECHADO",
            tipo_mudanca: estaAberto ? "fechamento" : "abertura"
        });
    } catch (err) {
        console.error("Erro ao verificar status do posto:", err);
        return res.status(500).json({ 
            error: "Erro ao verificar status do posto.",
            details: err.message 
        });
    }
});

/**
 * GET /api/status/iot
 * Simula resposta para dispositivo IoT (Wokwi)
 * Retorna formato simplificado para LED RGB
 */
router.get("/iot", (req, res) => {
    try {
        const now = new Date();
        const horaAtual = now.getHours();
        
        const estaAberto = horaAtual >= 8 && horaAtual < 19;
        
        // Resposta simplificada para IoT
        return res.json({
            status: estaAberto ? "open" : "closed",
            led_color: estaAberto ? "green" : "red",
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        return res.status(500).json({ status: "error" });
    }
});

export default router;
