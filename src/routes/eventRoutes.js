import { Router } from "express";
const router = Router();
import { createEvent } from "../controllers/eventController.js";

router.post("/events", createEvent);

export default router;
