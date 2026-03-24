import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes/userRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../../frontend")));

// Servir a página de login na raiz
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../../frontend/views/login.html"));
});

// Rotas do Front-end
app.get("/aluno/dashboard", (req, res) => {
    res.sendFile(path.join(__dirname, "../../frontend/views/aluno-dashboard.html"));
});

app.get("/aluno/agendamentos", (req, res) => {
    res.sendFile(path.join(__dirname, "../../frontend/views/aluno-agendamentos.html"));
});

app.get("/profissional/disponibilidade", (req, res) => {
    res.sendFile(path.join(__dirname, "../../frontend/views/profissional-disponibilidade.html"));
});

app.use("/", router);

app.listen(3000, () => {
    console.log("Servidor rodando em: http://localhost:3000");
});