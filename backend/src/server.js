import express from "express";
import router from "./routes/userRoutes.js";

const app = express();
app.use(express.json());

app.use("/api", router);

app.listen(3000, () => {
    console.log("Servidor rodando em: http://localhost:3000");
});