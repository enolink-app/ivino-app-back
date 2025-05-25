import { Router } from "express";
const router = Router();
import verificarToken from "../middlewares/auth.js";
import { createEvent, listEvents } from "../controllers/eventController.js";

router.post("/events", verificarToken, createEvent);
router.get("/events", verificarToken, listEvents);
router.put("/events", verificarToken);
export default router;
