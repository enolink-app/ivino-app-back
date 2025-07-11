import verifiToken from "../middlewares/auth.js";
import { Router } from "express";
const router = Router();
import { getEventRanking } from "../controllers/rankingController.js";

router.get("/events/:eventId", verifiToken, getEventRanking);
