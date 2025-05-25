import { Router } from "express";
const router = Router();
import { register, login, sendPasswordRecover } from "../controllers/authController.js";

router.post("/register", register);
router.post("/login", login);
router.post("/password-recover", sendPasswordRecover);

export default router;
