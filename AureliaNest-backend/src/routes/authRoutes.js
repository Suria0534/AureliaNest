import express from "express";
import {
	getSellerApplications,
	login,
	reviewSellerApplication,
	signup,
	updateUserProfile,
	deleteUser,
	editUser,
	getAllUsers,
} from "../controllers/authController.js";
import { authenticateToken, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/users", authenticateToken, requireRole("admin"), getAllUsers);
router.get("/seller-applications", authenticateToken, requireRole("admin"), getSellerApplications);
router.patch("/seller-applications/:userId", authenticateToken, requireRole("admin"), reviewSellerApplication);
router.patch("/profile/:userId", authenticateToken, updateUserProfile);
router.patch("/users/:userId", authenticateToken, requireRole("admin"), editUser);
router.delete("/users/:userId", authenticateToken, requireRole("admin"), deleteUser);

export default router;
