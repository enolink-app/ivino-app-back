import express from "express";
import userRoutes from "./src/routes/userRoutes.js";
import eventRoutes from "./src/routes/eventRoutes.js";
import wineRoutes from "./src/routes/wineRoutes.js";
import evaluationRoutes from "./src/routes/evaluationRoutes.js";
import authRoutes from "./src/routes/authRoutes.js";
import diaryRoutes from "./src/routes/diaryRoutes.js";
import rankingRoutes from "./src/routes/rankingRoutes.js";
import notificationRoutes from "./src/routes/notificationRoutes.js";
import { setupEventListeners } from "./src/services/eventWebSocket.js";
const app = express();
const port = 3000;
app.use(express.json());

app.use("/api", userRoutes);
app.use("/api", eventRoutes);
app.use("/api", wineRoutes);
app.use("/api", evaluationRoutes);
app.use("/api", authRoutes);
app.use("/api", diaryRoutes);
app.use("/api", rankingRoutes);
app.use("/api", notificationRoutes);

setupEventListeners();
app.listen(3000, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
