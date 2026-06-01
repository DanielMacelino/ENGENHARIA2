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
 * GET /api/status/iot
 * ✅ Retorna APENAS o estado recebido do Wokwi
 * Se Wokwi não enviou nada, retorna "unknown"
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
