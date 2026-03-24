import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes/userRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const frontendDir = path.resolve(__dirname, "../../frontend");
const viewsDir = path.resolve(frontendDir, "views");

app.use(cors());
app.use(express.json());
app.use(express.static(frontendDir));

// Servir a página de login na raiz e no alias /login
const serveLogin = (req, res) => res.sendFile(path.join(viewsDir, "login.html"));
app.get("/", serveLogin);
app.get("/login", serveLogin);

// Rotas do Front-end
app.get("/aluno/dashboard", (req, res) => res.sendFile(path.join(viewsDir, "aluno-dashboard.html")));
app.get("/aluno/agendamentos", (req, res) => res.sendFile(path.join(viewsDir, "aluno-agendamentos.html")));
app.get("/profissional/disponibilidade", (req, res) => res.sendFile(path.join(viewsDir, "profissional-disponibilidade.html")));
app.get("/profissional/dashboard", (req, res) => res.sendFile(path.join(viewsDir, "profissional-dashboard.html")));
app.get("/itens", (req, res) => res.sendFile(path.join(viewsDir, "itens.html")));
app.get("/criar-item", (req, res) => res.sendFile(path.join(viewsDir, "criar-item.html")));
app.get("/logs", (req, res) => res.sendFile(path.join(viewsDir, "logs.html")));
app.get("/cadastro", (req, res) => res.sendFile(path.join(viewsDir, "cadastro.html")));

app.use("/api", router);

app.listen(3000, () => {
    console.log("Servidor rodando em: http://localhost:3000");
});