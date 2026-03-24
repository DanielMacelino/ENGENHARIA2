import express from "express";
import * as Controller from "../../userController.js";
import { logRequest, workingDaysOnly } from "../middlewares/appMiddleware.js";

const router = express.Router();

router.use(logRequest);
router.use(workingDaysOnly);

router.post("/login", Controller.login);
router.get("/profissionais/horarios", Controller.getHorarios);
router.post("/agendamentos", Controller.criarAgendamento);
router.post("/disponibilidade", Controller.salvarDisponibilidade);

export default router;