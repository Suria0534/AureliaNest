import express from "express";
import { getSellerDashboard } from "../controllers/sellerController.js";
import { authenticateToken, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/:sellerName/dashboard", authenticateToken, requireRole("seller", "admin"), getSellerDashboard);

export default router;
