import express from "express";

const router = express.Router();

// ✅ Estado compartilhado com Wokwi (em memória)
let iotStatus = {
    status: "unknown",
    led_color: "gray",
    timestamp: null,
    source: "none"
};

/**
 * GET /api/status/posto
 * ✅ Retorna o status recebido do Wokwi
 * Se Wokwi ainda não enviou nada, retorna status desconhecido
 */
router.get("/posto", (req, res) => {
    try {
        // Se Wokwi enviou um status, usa aquele
        if (iotStatus.source === "wokwi" && iotStatus.status !== "unknown") {
            return res.json({
                aberto: iotStatus.status === "open",
                hora_atual: new Date().toLocaleTimeString("pt-BR", { 
                    timeZone: "America/Fortaleza", 
                    hour12: false,
                    hour: "2-digit",
                    minute: "2-digit"
                }),
                horario_funcionamento: "08:00 - 19:00",
                proxima_abertura: "08:00",
                proxima_fechamento: "19:00",
                proxima_mudanca: iotStatus.status === "open" ? "19:00" : "08:00",
                status_texto: iotStatus.status === "open" ? "✅ ABERTO" : "❌ FECHADO",
                tipo_mudanca: iotStatus.status === "open" ? "fechamento" : "abertura",
                iot_source: "wokwi",
                led_color: iotStatus.led_color,
                timestamp: iotStatus.timestamp
            });
        }
        
        // Se Wokwi não conectou ainda, retorna "desconectado"
        return res.json({
            aberto: false,
            hora_atual: new Date().toLocaleTimeString("pt-BR", { 
                timeZone: "America/Fortaleza", 
                hour12: false,
                hour: "2-digit",
                minute: "2-digit"
            }),
            horario_funcionamento: "08:00 - 19:00",
            proxima_abertura: "08:00",
            proxima_fechamento: "19:00",
            proxima_mudanca: "08:00",
            status_texto: "⚠️ AGUARDANDO WOKWI",
            tipo_mudanca: "n/a",
            iot_source: "nenhum",
            led_color: "gray"
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
 * ✅ Retorna APENAS o estado recebido do Wokwi (versão simplificada)
 */
router.get("/iot", (req, res) => {
    try {
        return res.json(iotStatus);
    } catch (err) {
        return res.status(500).json({ status: "error" });
    }
});

/**
 * POST /api/status/iot/update
 * ✅ Recebe atualizações do Wokwi
 * O Wokwi envia o estado do LED e o backend armazena
 */
router.post("/iot/update", (req, res) => {
    try {
        const { status, led_color } = req.body;
        
        // Validar entrada
        if (!status || !["open", "closed"].includes(status)) {
            return res.status(400).json({ 
                error: "Status inválido. Use 'open' ou 'closed'.",
                received: status 
            });
        }
        
        // ✅ ARMAZENAR estado recebido do Wokwi
        iotStatus = {
            status: status,
            led_color: led_color || (status === "open" ? "green" : "red"),
            timestamp: new Date().toISOString(),
            source: "wokwi"
        };
        
        console.log(`🔄 Status IoT atualizado pelo Wokwi:`, iotStatus);
        
        return res.json({ 
            success: true,
            message: "Status atualizado com sucesso",
            ...iotStatus 
        });
    } catch (err) {
        console.error("Erro ao atualizar status IoT:", err);
        return res.status(500).json({ 
            error: "Erro ao atualizar status",
            details: err.message 
        });
    }
});

export default router;
