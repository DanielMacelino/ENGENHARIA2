import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes/userRoutes.js";
import { seedDatabase } from "./seedLogic.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Em Vercel, process.cwd() é a raiz do projeto.
const root = process.cwd();
const views = path.resolve(root, "frontend/views");
const publico = path.resolve(root, "frontend/public");
const staticRoot = path.resolve(root, "frontend");
const uploads = path.resolve(root, "backend/uploads");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servindo arquivos estáticos
app.use(express.static(staticRoot));
app.use("/public", express.static(publico));
app.use("/api", router);
app.use("/uploads", express.static(uploads));

// Health check para Vercel
app.get("/api/health", (req, res) => res.json({ status: "ok", time: new Date() }));

// Rota de Seed
app.get("/api/seed", async (req, res) => {
    try {
        await seedDatabase();
        res.json({ message: "Banco de dados semeado com sucesso!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Rotas de Autenticação
app.get("/", (req, res) => res.sendFile(path.join(views, "login.html")));
app.get("/login", (req, res) => res.sendFile(path.join(views, "login.html")));
app.get("/cadastro", (req, res) => res.sendFile(path.join(views, "cadastro.html")));

// Rotas do Perfil ALUNO
app.get("/aluno/dashboard", (req, res) => res.sendFile(path.join(views, "aluno-dashboard.html")));
app.get("/aluno/agendamentos", (req, res) => res.sendFile(path.join(views, "aluno-agendamentos.html")));
app.get("/aluno/informacoes", (req, res) => res.sendFile(path.join(views, "informacoes.html")));
app.get("/aluno/mapa", (req, res) => res.sendFile(path.join(views, "mapa.html")));

// Rotas do Perfil PROFISSIONAL
app.get("/profissional/dashboard", (req, res) => res.sendFile(path.join(views, "profissional-dashboard.html")));
app.get("/profissional/disponibilidade", (req, res) => res.sendFile(path.join(views, "profissional-disponibilidade.html")));
app.get("/profissional/itens", (req, res) => res.sendFile(path.join(views, "itens.html")));
app.get("/profissional/criar-item", (req, res) => res.sendFile(path.join(views, "criar-item.html")));
app.get("/profissional/informacoes", (req, res) => res.sendFile(path.join(views, "informacoes.html")));
app.get("/profissional/mapa", (req, res) => res.sendFile(path.join(views, "mapa.html")));
app.get("/profissional/logs", (req, res) => res.sendFile(path.join(views, "logs.html")));

export default app;
