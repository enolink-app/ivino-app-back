import { Router } from "express";
import verificarToken from "../middlewares/auth.js";
import { createUser, listUsers, editUser } from "../controllers/userController.js";
const router = Router();

router.post("/users", verificarToken, createUser);
router.get("/users", verificarToken, listUsers);
router.put("/users/me", verificarToken, editUser);

export default router;
