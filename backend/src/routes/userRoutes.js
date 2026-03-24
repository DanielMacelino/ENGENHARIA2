import express from "express";
import * as Controller from "../../userController.js";
import { logRequest, workingDaysOnly } from "../middlewares/appMiddleware.js";

const router = express.Router();

router.use(logRequest);

// Requisito A: Rota POST para '/logar'
router.post("/logar", Controller.login);
// Alias para o frontend continuar funcionando
router.post("/login", Controller.login);

// Requisito D (Middleware): Segunda a Sexta apenas
router.use(workingDaysOnly);

// Requisitos B, C, D, F relativos a 'itens'
router.get("/itens", Controller.getItens); // B
router.post("/itens", Controller.criarItem); // C
router.delete("/itens/:id", Controller.deletarItem); // D
router.get("/itens/:codigo", Controller.pesquisarItem); // F

// Alias para o frontend (dashboard)
router.get("/profissionais/horarios", Controller.getHorariosMock);

// Requisito F (Extra): GET registros de requisição por data
router.get("/logs/:data", Controller.getLogsPorData);

// Requisito G: Rota GET gera PDF para download
router.get("/relatorio", Controller.gerarPDF);

export default router;