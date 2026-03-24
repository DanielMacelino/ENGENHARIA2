import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes/userRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const views = path.join(__dirname, "../../../ENGENHARIA2/frontend/views");
const publico = path.join(__dirname, "../../../ENGENHARIA2/frontend/public");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../../frontend")));
app.use("/public", express.static(path.join(__dirname, "../../frontend/public")));
app.use("/api", router);

app.get("/", (req, res) => {
    res.sendFile(path.join(views, "login.html"));
});

app.get("/aluno/dashboard", (req, res) => {
    res.sendFile(path.join(views, "aluno-dashboard.html"));
});

app.get("/aluno/agendamentos", (req, res) => {
    res.sendFile(path.join(views, "aluno-agendamentos.html"));
});

app.get("/profissional/disponibilidade", (req, res) => {
    res.sendFile(path.join(views, "profissional-disponibilidade.html"));
});

app.listen(3000, () => {
    console.log("Servidor rodando em: http://localhost:3000");
});