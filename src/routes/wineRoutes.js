import { Router } from "express";
const router = Router();
import verifiToken from "../middlewares/auth.js";
import { createWine, getUserWines, updateWine } from "../controllers/wineController.js";

router.post("/wines", verifiToken, createWine);
router.get("/wines", verifiToken, getUserWines);
router.put("/wines/:id", verifiToken, updateWine);

export default router;
