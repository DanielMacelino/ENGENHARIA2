import multer from "multer";

// No ambiente serverless da Vercel, o sistema de arquivos é apenas leitura.
// Usamos memoryStorage para evitar erros ao tentar salvar arquivos localmente.
const storage = multer.memoryStorage();

export const upload = multer({ storage });