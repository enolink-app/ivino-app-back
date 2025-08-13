import verifiToken from "../middlewares/auth.js";
import { Router } from "express";
const router = Router();
import { registerDeviceToken } from "../controllers/notificationController.js";

router.post("/notifications/register-token", verifiToken, registerDeviceToken);

export default router;
