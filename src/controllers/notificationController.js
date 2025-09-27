import { Router } from "express";
const router = Router();
import { register, login, sendPasswordRecover, googleOAuthRedirect, exchangeGoogleCode } from "../controllers/authController.js";

router.post("/register", register);
router.post("/login", login);
router.post("/password-recover", sendPasswordRecover);
router.get("/oauth-redirect", googleOAuthRedirect);
router.post("/exchange-google-code", exchangeGoogleCode);

export default router;
