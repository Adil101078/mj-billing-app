import express from "express";
import { login, refreshToken, verifyToken, logout } from "../controllers/authController";
import { authMiddleware } from "../middleware/auth";

const router = express.Router();

// Public routes
router.post("/login", login);
router.post("/refresh", refreshToken);
router.post("/logout", logout);

// Protected routes
router.get("/verify", authMiddleware, verifyToken);

export default router;
