import { Router } from "express";
const router = Router();
import verificarToken from "../middlewares/auth.js";
import { createEvaluation, getMyEvaluationsByEvent } from "../controllers/evaluationController.js";

router.post("/evaluations", verificarToken, createEvaluation);
router.get("/evaluations/my/:eventId", verificarToken, getMyEvaluationsByEvent);

export default router;
