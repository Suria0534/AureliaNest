import express from "express";
import { createSection, deleteSection, getAllSections, getSections, updateSection } from "../controllers/sectionController.js";
import { authenticateToken, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getSections);
router.get("/all", authenticateToken, requireRole("admin"), getAllSections);
router.post("/", authenticateToken, requireRole("admin"), createSection);
router.patch("/:id", authenticateToken, requireRole("admin"), updateSection);
router.delete("/:id", authenticateToken, requireRole("admin"), deleteSection);

export default router;
