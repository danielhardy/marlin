// src/routes/reportsRoutes.js
import express from "express";
import {
  getCashflowReport,
  forecastCashflow,
} from "../services/transactionServiceHelpers.js";

const router = express.Router();

// Get rolling cashflow report
router.get("/cashflow", async (req, res, next) => {
  const { start, end } = req.query;
  try {
    const report = await getCashflowReport(req.user.id, start, end);
    res.json({ series: report });
  } catch (err) {
    console.error("Error fetching cashflow report:", err);
    next(err);
  }
});

// Forecast future cashflow
router.post("/forecast/cashflow", async (req, res, next) => {
  const { history_window_days, forecast_horizon_days } = req.body;
  try {
    const forecast = await forecastCashflow(
      req.user.id,
      history_window_days,
      forecast_horizon_days
    );
    res.json({ forecast });
  } catch (err) {
    console.error("Error generating cashflow forecast:", err);
    next(err);
  }
});

export default router;
