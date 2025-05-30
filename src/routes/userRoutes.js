import { Router } from "express";
import verifiToken from "../middlewares/auth.js";
import { createUser, listUsers, editUser } from "../controllers/userController.js";
const router = Router();

router.post("/users", verifiToken, createUser);
router.get("/users", verifiToken, listUsers);
router.put("/users/me", verifiToken, editUser);

export default router;
