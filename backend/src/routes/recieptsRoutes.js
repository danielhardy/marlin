// Receipts API routes
// src/routes/receiptRoutes.js

import express from "express";
import multer from "multer";
import {
  uploadReceipt,
  listReceipts,
} from "../services/transactionServiceHelpers.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Upload a receipt (OCR + optional link to tx)
router.post("/", upload.single("file"), async (req, res, next) => {
  const { tx_id } = req.body;
  const file = req.file;
  try {
    const { receiptId, ocrData } = await uploadReceipt(
      req.user.id,
      file,
      tx_id
    );
    res.json({ receipt_id: receiptId, ocr_data: ocrData });
  } catch (err) {
    console.error("Error uploading receipt:", err);
    next(err);
  }
});

// List receipts for user
router.get("/", async (req, res, next) => {
  const status = req.query.status || "all";
  try {
    const receipts = await listReceipts(req.user.id, status);
    res.json(receipts);
  } catch (err) {
    console.error("Error listing receipts:", err);
    next(err);
  }
});

export default router;
