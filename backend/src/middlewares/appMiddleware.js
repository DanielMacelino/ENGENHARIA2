import { registrarLog } from "../../userController.js";

export const logRequest = (req, res, next) => {
    const now = new Date();
    console.log(`[${now.toLocaleString()}] ${req.method} em ${req.url}`);
    registrarLog(req.method, req.url);
    next();
};

export const workingDaysOnly = (req, res, next) => {
    const day = new Date().getDay();
    if (day === 0 || day === 6) {
        return res.status(403).json({ error: "Acesso disponível apenas de segunda a sexta-feira." });
    }
    next();
};