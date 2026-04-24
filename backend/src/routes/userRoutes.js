import express from "express";
import * as Controller from "../../userController.js";
import { logRequest, workingDaysOnly } from "../middlewares/appMiddleware.js";
import { upload } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

router.use(logRequest);
router.use(workingDaysOnly);

router.post("/login", Controller.login);
router.post("/cadastro", Controller.registrarUsuario);
router.get("/itens", Controller.getItens);
router.post("/itens", Controller.criarItem);
router.delete("/itens/:id", Controller.deleteItem);
router.get("/itens/:codigo", Controller.getItems);
router.get("/logs", Controller.getLogs);
router.get("/logs/:data", Controller.getLogsPorData);
router.get("/relatorio", Controller.generatePDF);
router.get("/profissionais/horarios", Controller.getHorarios);
router.get("/agendamentos/usuario/:usuario_id", Controller.getAgendamentosUsuario);
router.get("/agendamentos/profissional/:profissional_id", Controller.getAgendamentosProfissional);
router.post("/agendamentos", Controller.criarAgendamento);
router.put("/agendamentos/:id/status", Controller.atualizarStatusAgendamento);
router.post("/disponibilidade", Controller.salvarDisponibilidade);
router.get("/estatisticas", Controller.getEstatisticasGerais);

// Novas rotas (2FA, Upload, Distância)
router.post("/login/verify", Controller.verificar2FA);
router.post("/upload", upload.single("imagem"), Controller.uploadImagem);
router.post("/distancia", Controller.calcularDistancia);

export default router;