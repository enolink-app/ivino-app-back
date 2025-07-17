import { Router } from "express";
const router = Router();
import verifiToken from "../middlewares/auth.js";
import { createEvent, listEvents, evaluateWine, getEventById, getEventByUser, joinEvent, leaveEvent, generateNewInviteCode, getTopWines } from "../controllers/eventController.js";

router.post("/events", verifiToken, createEvent);
router.post("/events/:id/evaluate", verifiToken, evaluateWine);
router.get("/events", verifiToken, listEvents);
router.get("/events/:id", verifiToken, getEventById);
router.get("/events/:id/user", verifiToken, getEventByUser);
router.post("/events/join/:code", verifiToken, joinEvent);
router.delete("/events/:eventId/leave/:userId", verifiToken, leaveEvent);
router.post("/events/:eventId/generate-code", verifiToken, generateNewInviteCode);
router.get("/events/top-wines", verifiToken, getTopWines);
router.put("/events", verifiToken);
export default router;
