// src/app.js
import express from "express";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import { authenticate } from "./middleware/auth.js";

// Get the environment variables
dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});
console.log("ENV loading from:", path.resolve(process.cwd(), ".env"));
console.log("Supabase URL:", process.env.PUBLIC_SUPABASE_URL);

// import your routes once they’re ready
import plaidApiRoutes from "./routes/plaidRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import recieptsRoutes from "./routes/recieptsRoutes.js";
import reportsRoutes from "./routes/reportsRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import classifyRoutes from "./routes/classifyRoutes.js";

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Global Request Logging ───────────────────────────────────────────────────
app.use(morgan("combined"));
// other presets: 'dev' (concise/color), 'tiny', etc.

// ─── Body Parsing & CORS ──────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:3000"],
    credentials: true,
  })
);

// ─── Mount Your API Routes ────────────────────────────────────────────────────
app.use("/auth", authRoutes);
app.use("/plaid", authenticate, plaidApiRoutes);
app.use("/transactions", authenticate, transactionRoutes);
app.use("/reciepts", authenticate, recieptsRoutes);
app.use("/reports", authenticate, reportsRoutes);
app.use("/classify", classifyRoutes);

// ─── Health Check / Basic Route ───────────────────────────────────────────────
app.get("/", (req, res) => {
  res.send("Marlin API");
});

// ─── Error Handling ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(
    `\x1b[36mServer running in ${process.env.NODE_ENV} mode at http://localhost:${PORT}\x1b[0m`
  );
});
