// Middleware que regista horário e rota
export const logRequest = (req, res, next) => {
    const now = new Date();
    console.log(`[${now.toLocaleString()}] ${req.method} em ${req.url}`);
    next();
};

// Middleware que permite acesso apenas de segunda a sexta (1 a 5)
export const workingDaysOnly = (req, res, next) => {
    const day = new Date().getDay(); 
    if (day === 0 || day === 6) {
        return res.status(403).json({ error: "Acesso disponível apenas de segunda a sexta-feira." });
    }
    next();
};