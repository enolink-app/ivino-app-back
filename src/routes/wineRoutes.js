import { Router } from "express";
const router = Router();
import verificarToken from "../middlewares/auth.js";
import { createWine, getUserWines, updateWine } from "../controllers/wineController.js";

router.post("/wines", verificarToken, createWine);
router.get("/wines", verificarToken, getUserWines);
router.put("/wines/:id", verificarToken, updateWine);

export default router;
