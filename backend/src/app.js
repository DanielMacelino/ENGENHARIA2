import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes/userRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const views = path.join(__dirname, "../../frontend/views");
const publico = path.join(__dirname, "../../frontend/public");

const app = express();

// CORS - Permitindo origens para produção (Vercel) e desenvolvimento
app.use(cors());
app.use(express.json());
// Suporte a arquivos via urlencoded (para multer)
app.use(express.urlencoded({ extended: true }));

// Servindo arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, "../../frontend")));
app.use("/public", express.static(publico));
app.use("/api", router);

// Servindo arquivos de upload locais (preparação para Supabase)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Rotas de Autenticação
app.get("/", (req, res) => res.sendFile(path.join(views, "login.html")));
app.get("/login", (req, res) => res.sendFile(path.join(views, "login.html")));
app.get("/cadastro", (req, res) => res.sendFile(path.join(views, "cadastro.html")));

// Rotas do Perfil ALUNO (Links Únicos)
app.get("/aluno/dashboard", (req, res) => res.sendFile(path.join(views, "aluno-dashboard.html")));
app.get("/aluno/agendamentos", (req, res) => res.sendFile(path.join(views, "aluno-agendamentos.html")));
app.get("/aluno/informacoes", (req, res) => res.sendFile(path.join(views, "informacoes.html")));
app.get("/aluno/mapa", (req, res) => res.sendFile(path.join(views, "mapa.html")));

// Rotas do Perfil PROFISSIONAL (Links Únicos)
app.get("/profissional/dashboard", (req, res) => res.sendFile(path.join(views, "profissional-dashboard.html")));
app.get("/profissional/disponibilidade", (req, res) => res.sendFile(path.join(views, "profissional-disponibilidade.html")));
app.get("/profissional/itens", (req, res) => res.sendFile(path.join(views, "itens.html")));
app.get("/profissional/criar-item", (req, res) => res.sendFile(path.join(views, "criar-item.html")));
app.get("/profissional/informacoes", (req, res) => res.sendFile(path.join(views, "informacoes.html")));
app.get("/profissional/mapa", (req, res) => res.sendFile(path.join(views, "mapa.html")));
app.get("/profissional/logs", (req, res) => res.sendFile(path.join(views, "logs.html")));

// Rota temporária para semear dados (Seed)
import { seedDatabase } from "./seedLogic.js";
app.get("/api/seed", async (req, res) => {
    try {
        await seedDatabase();
        res.json({ message: "Banco de dados semeado com sucesso!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default app;
