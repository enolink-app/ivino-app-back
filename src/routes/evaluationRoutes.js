import { Router } from "express";
const router = Router();
import { createEvaluation } from "../controllers/evaluationController.js";

router.post("/evaluetions", createEvaluation);

export default router;
