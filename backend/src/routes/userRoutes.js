import express from "express";
import * as Controller from "../controllers/userController.js";
import { logRequest, workingDaysOnly } from "./middlewares/appMiddleware.js";

const router = express.Router();

// Aplicar middlewares globais nesta rota
router.use(logRequest);
router.use(workingDaysOnly);

router.post("/logar", Controller.login);
router.get("/itens", Controller.getItems);
router.get("/itens/pdf", Controller.generatePDF);
router.get("/itens/:codigo", Controller.getItems);
router.post("/itens", Controller.createItem);
router.delete("/itens/:id", Controller.deleteItem);

export default router;