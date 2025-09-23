// routes/diaryRoutes.js (ou onde estiver)
import { Router } from "express";
import verifiToken from "../middlewares/auth.js";
import { createDiaryEntry, getDiaryEntries, getDiaryEntryById, updateDiaryEntry, getUserDiaryEntries } from "../controllers/diaryController.js";

const router = Router();

router.post("/diary", verifiToken, createDiaryEntry);
router.get("/diary", verifiToken, getUserDiaryEntries);
router.get("/diary/:id", verifiToken, getDiaryEntryById);
router.put("/diary/:id", verifiToken, updateDiaryEntry);

export default router;
