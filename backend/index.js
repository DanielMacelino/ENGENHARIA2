import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import userRoutes from "./src/routes/userRoutes.js";
import statusRoutes from "./src/routes/statusRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// MIDDLEWARES
// ==========================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// ROTAS PRINCIPAIS
// ==========================================
app.use("/api", userRoutes);
app.use("/api/status", statusRoutes);

// Health Check
app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ==========================================
// INICIAR SERVIDOR
// ==========================================
app.listen(PORT, () => {
    console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
    console.log(`📍 API disponível em http://localhost:${PORT}/api`);
    console.log(`🏥 Status do Posto: http://localhost:${PORT}/api/status/posto`);
});

export default app;
