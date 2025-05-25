import { Router } from "express";
const router = Router();
import { createWine } from "../controllers/wineController.js";

router.post("/wines", createWine);

export default router;
