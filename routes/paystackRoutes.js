import express from "express";
import axios from "axios";
import { protect } from "../middlewares/authMiddleware.js";  // ✅ import auth middleware
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";

const router = express.Router();

// 🔹 Initialize payment (requires login)
router.post("/initialize", protect, async (req, res) => {
  try {
    const { email, amount } = req.body;

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      { email, amount: amount * 100 },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.status(200).json(response.data);
  } catch (error) {
    console.error("Paystack initialize error:", error.response?.data || error.message);
    res.status(500).json({
      message: "Failed to initialize payment",
      error: error.response?.data || error.message,
    });
  }
});

// 🔹 Verify payment (requires login)
router.post("/verify", protect, async (req, res) => {
  try {
    const { reference, amount } = req.body;

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const data = response.data.data;

    if (data.status === "success") {
      // ✅ Update user's wallet
      const user = await User.findById(req.user._id);
      if (!user) return res.status(404).json({ message: "User not found" });

      user.balance += data.amount / 100; // Paystack returns kobo
      await user.save();

      // ✅ Log the transaction
      const transaction = await Transaction.create({
        recipient: user._id,
        amount: data.amount / 100,
        type: "fund",
        status: "completed",
        transactionCode: reference,
        paymentMethod: "Paystack",
      });

      return res.json({
        success: true,
        message: "Payment verified and wallet funded successfully",
        balance: user.balance,
        transaction,
      });
    } else {
      res.status(400).json({ message: "Payment not successful" });
    }
  } catch (error) {
    console.error("Paystack verify error:", error.response?.data || error.message);
    res.status(500).json({
      message: "Verification failed",
      error: error.response?.data || error.message,
    });
  }
});

export default router;
