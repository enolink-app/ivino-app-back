import { Router } from "express";
const router = Router();
import verifiToken from "../middlewares/auth.js";
import { createEvent, listEvents } from "../controllers/eventController.js";

router.post("/events", verifiToken, createEvent);
router.get("/events", verifiToken, listEvents);
router.put("/events", verifiToken);
export default router;
