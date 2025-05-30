import { Router } from "express";
import verificarToken from "../middlewares/auth.js";
import { createDiaryEntry, getDiaryEntries } from "../controllers/diaryController.js";
const router = Router();

router.post("/diary", verificarToken, createDiaryEntry);
router.get("/diary", verificarToken, getDiaryEntries);

export default router;
