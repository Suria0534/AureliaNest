import express from "express";
import { createProduct, deleteProduct, getProducts, updateProduct } from "../controllers/productController.js";
import { authenticateToken, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getProducts);
router.post("/", authenticateToken, requireRole("seller", "admin"), createProduct);
router.patch("/:id", authenticateToken, requireRole("seller", "admin"), updateProduct);
router.delete("/:id", authenticateToken, requireRole("seller", "admin"), deleteProduct);

export default router;
