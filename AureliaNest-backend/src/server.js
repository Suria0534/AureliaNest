import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";
import productRoutes from "./routes/productRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import sellerRoutes from "./routes/sellerRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import sectionRoutes from "./routes/sectionRoutes.js";

const app = express();
const PORT = process.env.PORT || 5000;

const FRONTEND_URL = process.env.FRONTEND_URL;
if (FRONTEND_URL) {
  app.use(
    cors({
      origin: FRONTEND_URL,
    })
  );
} else {
  app.use(cors());
}
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", app: "Daraz-lite API" });
});

app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/seller", sellerRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/sections", sectionRoutes);

app.use((error, _req, res, next) => {
  if (error?.type === "entity.too.large" || error?.status === 413) {
    return res.status(413).json({
      message: "Image is too large. Please upload a smaller image (recommended under 2MB).",
    });
  }

  if (error) {
    return res.status(500).json({ message: "Internal server error." });
  }

  return next();
});

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server failed to start", error.message);
    process.exit(1);
  }
};

startServer();
