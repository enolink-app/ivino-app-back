import express from "express";
import userRoutes from "./src/routes/userRoutes.js";
import eventRoutes from "./src/routes/eventRoutes.js";
import wineRoutes from "./src/routes/wineRoutes.js";
import evaluationRoutes from "./src/routes/evaluationRoutes.js";
import authRoutes from "./src/routes/authRoutes.js";
//import journalRoutes from "./src/routes/journalRoutes.js";

const app = express();
const port = 3000;
app.use(express.json());

app.use("/api", userRoutes);
app.use("/api", eventRoutes);
app.use("/api", wineRoutes);
app.use("/api", evaluationRoutes);
app.use("/api", authRoutes);
//app.use("/api", journalRoutes);

app.listen(3000, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
