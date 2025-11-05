import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";

// Routes
import transactionRoutes from "./Routers/transactionRoutes.js";
import authRoutes from "./Routers/authRoutes.js";


dotenv.config();
const app = express();

// --- Middleware ---
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

// --- Health Check Route ---
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

// --- API Routes ---
app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);

// --- 404 Handler ---
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// --- Global Error Handler ---
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || "Internal Server Error",
  });
});

// --- Start Server After DB Connects ---
const PORT = process.env.PORT || 3001;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to connect DB:", err);
    process.exit(1);
  });
