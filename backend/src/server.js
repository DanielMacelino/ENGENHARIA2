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

app.use(cors({
    origin: 'http://localhost:3000',
    optionsSuccessStatus: 200
}));
app.use(express.json());

// Servindo arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, "../../frontend")));
app.use("/public", express.static(publico));
app.use("/api", router);

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

app.listen(3000, () => {
    console.log("Servidor rodando em: http://localhost:3000");
});