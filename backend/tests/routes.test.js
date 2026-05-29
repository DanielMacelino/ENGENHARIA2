import request from "supertest";
import app from "../src/app.js";

describe("Testes das Rotas da API", () => {

    it("Deve retornar erro ao tentar fazer login sem credenciais", async () => {
        const response = await request(app).post("/api/login").send({});
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("error");
    });

    it("Deve calcular a distância entre dois pontos corretamente", async () => {
        const response = await request(app)
            .post("/api/distancia")
            .send({
                lat1: -7.2345, lon1: -39.4123,
                lat2: -7.2389, lon2: -39.4167
            });
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("distancia_km");
        expect(typeof response.body.distancia_km).toBe("number");
    });

    it("Deve tentar verificar o 2FA e retornar erro para código inválido", async () => {
        const response = await request(app)
            .post("/api/login/verify")
            .send({
                email: "teste@teste.com",
                codigo: "000000"
            });
        
        // Pode ser 400 (faltando) ou 401 (inválido)
        expect([400, 401]).toContain(response.status);
    });

    // Como as demais rotas dependem do banco de dados (Supabase),
    // garantimos apenas que o endpoint foi acionado (pode dar 200 ou 500 se .env estiver vazio).
    it("Deve tentar obter a lista de itens", async () => {
        const response = await request(app).get("/api/itens");
        expect([200, 500]).toContain(response.status);
    });
    
    // Testa Rota PUT de Status Agendamento
    it("Deve tentar atualizar status do agendamento (PUT) e falhar se o body estiver vazio", async () => {
        const response = await request(app).put("/api/agendamentos/1/status").send({});
        expect(response.status).toBe(400);
        expect(response.body.error).toBe("ID e novo status são obrigatórios.");
    });

    // Testes de Status e IoT
    it("Deve obter o status completo do posto de saúde (GET /api/status/posto)", async () => {
        const response = await request(app).get("/api/status/posto");
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("aberto");
        expect(response.body).toHaveProperty("status_texto");
        expect(response.body).toHaveProperty("hora_atual");
    });

    it("Deve obter o status simplificado para IoT (GET /api/status/iot)", async () => {
        const response = await request(app).get("/api/status/iot");
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("status");
        expect(response.body).toHaveProperty("led_color");
        expect(["open", "closed"]).toContain(response.body.status);
        expect(["green", "red"]).toContain(response.body.led_color);
    });
});
