import { protect } from "../middlewares/authMiddleware.js";
import express from "express";
import {
  fundAccount,
  sendMoney,
  getTransactions,
  getBalance,
} from "../controllers/transactionController.js";

const router = express.Router();

router.post("/fund", protect, fundAccount);
router.post("/send", protect, sendMoney);
router.get("/balance", protect, getBalance);
router.get("/history", protect, getTransactions);

export default router;
