import { Router } from "express";
const router = Router();
import verifiToken from "../middlewares/auth.js";
import { createEvaluation, getMyEvaluationsByEvent } from "../controllers/evaluationController.js";

router.post("/evaluations", verifiToken, createEvaluation);
router.get("/evaluations/:eventId", verifiToken, getMyEvaluationsByEvent);

//PUBLIC
router.get("/evaluations/:eventId", getMyEvaluationsByEvent);
export default router;
