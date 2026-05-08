import express from "express";
import { createOrder, getOrders, updateOrderStatus } from "../controllers/orderController.js";
import { authenticateToken, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", createOrder);
router.get("/", authenticateToken, getOrders);
router.patch("/:id/status", authenticateToken, requireRole("seller", "admin"), updateOrderStatus);

export default router;
