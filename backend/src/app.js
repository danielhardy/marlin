import express from "express";
import dotenv from "dotenv";
import cors from "cors"; // <-- add this line

// Set default to 'development' if NODE_ENV is not defined
const env = process.env.NODE_ENV || "development";
dotenv.config({ path: `.env.${env}` });

const app = express();

const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:3000"],
  })
); // <-- add this line to enable CORS for all routes

// Middleware to parse JSON requests
app.use(express.json());

// Mount agent routes at /agent
// app.use("/agent", agentRoutes);

// Basic route
app.get("/", (req, res) => {
  res.send("Hello, World!");
});

// Start the server
app.listen(PORT, () => {
  console.log(
    "\x1b[36m%s\x1b[0m",
    `Server is running in ${env} mode at http://localhost:${PORT}`
  );
});
