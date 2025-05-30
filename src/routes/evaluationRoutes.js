import { Router } from "express";
const router = Router();
import verificarToken from "../middlewares/auth.js";
import { createEvaluation } from "../controllers/evaluationController.js";

router.post("/evaluetions", createEvaluation);

export default router;
