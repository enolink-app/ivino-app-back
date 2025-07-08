import { Router } from "express";
const router = Router();
import verifiToken from "../middlewares/auth.js";
import { createEvent, listEvents, evaluateWine, getEventById } from "../controllers/eventController.js";

router.post("/events", verifiToken, createEvent);
router.post("/events/:id/evaluate", verifiToken, evaluateWine);
router.get("/events", verifiToken, listEvents);
router.get("/events/:id", verifiToken, getEventById);
router.put("/events", verifiToken);
export default router;
