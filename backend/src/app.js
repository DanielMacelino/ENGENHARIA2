import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import https from "https";
import router from "./routes/userRoutes.js";
import { seedDatabase } from "./seedLogic.js";
import { executarBackupNuvem } from "./services/backupService.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Em Vercel, process.cwd() é a raiz do projeto.
const root = process.cwd();
const views = path.resolve(root, "frontend/views");
const publico = path.resolve(root, "frontend/public");
const staticRoot = path.resolve(root, "frontend");
const uploads = path.resolve(root, "backend/uploads");

const app = express();

// Configuração de CORS Restrito (Permitir apenas o próprio servidor)
const corsOptions = {
    origin: 'http://localhost:3000',
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servindo arquivos estáticos
app.use(express.static(staticRoot));
app.use("/public", express.static(publico));
app.use("/api", router);
app.use("/uploads", express.static(uploads));

// Health check para Vercel
app.get("/api/health", (req, res) => res.json({ status: "ok", time: new Date() }));

// Proxy Profissional de Thumbnails (Bypass de Bloqueios)
app.get("/api/thumbnail-proxy", (req, res) => {
    const { videoId } = req.query;
    if (!videoId) return res.status(400).send("Video ID missing");
    
    console.log(`[PROXY] Buscando thumbnail para: ${videoId}`);
    const url = `https://img.youtube.com/vi/${videoId}/0.jpg`; // 0.jpg é o mais compatível
    
    https.get(url, (ytRes) => {
        if (ytRes.statusCode !== 200) {
            console.error(`[PROXY] Erro YouTube (${ytRes.statusCode}) para: ${videoId}`);
            return res.redirect("https://images.unsplash.com/photo-1505751172676-53ad2cb65709?auto=format&fit=crop&q=80&w=400");
        }
        
        res.setHeader("Content-Type", "image/jpeg");
        res.setHeader("Cache-Control", "public, max-age=86400");
        ytRes.pipe(res);
    }).on('error', (e) => {
        console.error(`[PROXY] Erro de conexão para: ${videoId}`, e.message);
        res.redirect("https://images.unsplash.com/photo-1505751172676-53ad2cb65709?auto=format&fit=crop&q=80&w=400");
    });
});




// Rota de Configuração (Envia chaves públicas para o Frontend usar Realtime)
app.get("/api/config", (req, res) => {
    console.log("[DEBUG] Carregando config Supabase:", { 
        hasUrl: !!process.env.SUPABASE_URL, 
        hasKey: !!process.env.SUPABASE_KEY 
    });
    res.json({
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseAnonKey: process.env.SUPABASE_KEY
    });
});


// Rota de Seed
app.get("/api/seed", async (req, res) => {
    try {
        await seedDatabase();
        res.json({ message: "Banco de dados semeado com sucesso!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Rota de Backup Diário (Acionada pelo Vercel Cron)
app.get("/api/backup-diario", async (req, res) => {
    // Verificação de segurança simples para evitar acessos externos (Opcional, mas recomendado)
    // O Vercel Cron pode enviar um cabeçalho de autorização se configurado
    const authHeader = req.headers['authorization'];
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: "Não autorizado" });
    }

    try {
        const result = await executarBackupNuvem();
        if (result.success) {
            res.json({ message: "Backup realizado e enviado para o Supabase Storage!", details: result.details });
        } else {
            res.status(500).json({ error: "Erro ao realizar backup", details: result.error });
        }
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
app.get("/aluno/novo-agendamento", (req, res) => res.sendFile(path.join(views, "aluno-novo-agendamento.html")));
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
app.get("/profissional/estatisticas", (req, res) => res.sendFile(path.join(views, "estatisticas.html")));
app.get("/tutoriais", (req, res) => res.sendFile(path.join(views, "tutoriais.html")));
app.get("/comunicacao", (req, res) => res.sendFile(path.join(views, "comunicacao.html")));


export default app;
