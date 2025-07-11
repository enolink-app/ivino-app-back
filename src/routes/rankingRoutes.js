import verifiToken from "../middlewares/auth.js";
import { Router } from "express";
const router = Router();
import { getEventRanking } from "../controllers/rankingController.js";

router.get("/ranking/:eventId", verifiToken, getEventRanking);

export default router;
