import axios from "axios";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";

export const initializePayment = async (req, res) => {
  try {
    const { email, amount } = req.body;
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      { email, amount: amount * 100 },
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ message: err.response?.data?.message || err.message });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { reference, userId, amount } = req.body; // ⚠️ ensure frontend sends these

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );

    const verification = response.data.data;

    if (verification.status === "success" || verification.status === true) {
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const newTransaction = await Transaction.create({
        sender: null,
        recipient: user._id,
        amount: verification.amount / 100, // Paystack returns kobo, so divide by 100
        type: "fund",
        status: "completed",
        transactionCode: reference,
        paymentMethod: "paystack",
      });

      user.balance += verification.amount / 100;
      await user.save();

      return res.json({
        success: true,
        message: "Payment verified successfully",
        balance: user.balance,
        transaction: newTransaction,
      });
    } else {
      return res.status(400).json({ success: false, message: "Payment not verified" });
    }
  } catch (error) {
    console.error("Payment verification error:", error);
    res.status(500).json({ message: error.response?.data?.message || error.message });
  }
};