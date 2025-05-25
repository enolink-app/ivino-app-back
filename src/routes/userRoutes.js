import { Router } from "express";
import verificarToken from "../middlewares/auth.js";
import { createUser, listUsers } from "../controllers/userController.js";
const router = Router();

router.post("/users", verificarToken, createUser);
router.get("/users", verificarToken, listUsers);

export default router;
