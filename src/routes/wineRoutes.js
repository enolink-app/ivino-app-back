import { Router } from "express";
const router = Router();
import verifiToken from "../middlewares/auth.js";
import { createWine, getUserWines, updateWine, getWineById } from "../controllers/wineController.js";

router.post("/wines", verifiToken, createWine);
router.get("/wines", verifiToken, getUserWines);
router.get("/wines/:id", verifiToken, getWineById);
router.put("/wines/:id/user", verifiToken, updateWine);

export default router;
