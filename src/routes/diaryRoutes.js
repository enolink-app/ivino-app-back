import { Router } from "express";
import verifiToken from "../middlewares/auth.js";
import { createDiaryEntry, getDiaryEntries, getUserDiaryEntries } from "../controllers/diaryController.js";
const router = Router();

router.post("/diary", verifiToken, createDiaryEntry);
router.get("/diary", verifiToken, getUserDiaryEntries);

export default router;
