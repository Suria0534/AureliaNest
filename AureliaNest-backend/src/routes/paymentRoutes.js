import express from "express";
import { confirmPayment, launchPayment, mockPayment, paymentRedirect } from "../controllers/paymentController.js";

const router = express.Router();

router.post("/confirm", confirmPayment);
router.post("/mock", mockPayment);
router.post("/launch", launchPayment);
router.get("/redirect", paymentRedirect);

export default router;
