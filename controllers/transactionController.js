import Transaction from "../models/Transaction.js";
import User from "../models/User.js";
import { nanoid } from "nanoid";

// ---------------- FUND ACCOUNT ----------------
export const fundAccount = async (req, res) => {
  try {
    const { amount, paymentMethod } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // In production, integrate with Paystack/Flutterwave here
    // After successful payment, create transaction
    const transaction = await Transaction.create({
      sender: null,
      recipient: user._id,
      amount,
      type: "fund",
      status: "completed",
      transactionCode: nanoid(10),
      paymentMethod,
    });

    res.json({ message: "Account funded successfully", transaction });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------- SEND MONEY ----------------

// ✅ Send Money Controller
export const sendMoney = async (req, res) => {
  const { recipientAccount, amount, note } = req.body;

  try {
    // Automatically get sender from auth middleware
    const sender = await User.findById(req.userId);
    const recipient = await User.findOne({ accountNumber: Number(recipientAccount) });

    if (!sender || !recipient) {
      return res.status(404).json({ message: "Sender or recipient not found" });
    }

    if (sender.balance < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    sender.balance -= amount;
    recipient.balance += amount;

    await sender.save();
    await recipient.save();

    const transaction = await Transaction.create({
      sender: sender._id,
      recipient: recipient._id,
      amount,
      type: "transfer",
      status: "completed",
      transactionCode: `TXN-${Date.now()}`,
      description: note,
    });

    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate("sender", "firstname lastname accountNumber")
      .populate("recipient", "firstname lastname accountNumber");

    res.json({
      success: true,
      transaction: populatedTransaction,
      senderBalance: sender.balance,
      recipientBalance: recipient.balance,
    });
  } catch (err) {
    console.error("Send money error:", err);
    res.status(500).json({ message: "Failed to send money", error: err.message });
  }
};

// ---------------- GET TRANSACTION HISTORY ----------------
export const getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({
      $or: [{ sender: req.userId }, { recipient: req.userId }],
    })
      .populate("sender", "firstname lastname accountNumber")
      .populate("recipient", "firstname lastname accountNumber")
      .sort({ createdAt: -1 });

    res.json({ transactions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------- GET USER BALANCE ----------------
export const getBalance = async (req, res) => {
  try {
    const sentTxns = await Transaction.aggregate([
      { $match: { sender: req.userId, status: "completed" } },
      { $group: { _id: null, totalSent: { $sum: "$amount" } } },
    ]);

    const receivedTxns = await Transaction.aggregate([
      { $match: { recipient: req.userId, status: "completed" } },
      { $group: { _id: null, totalReceived: { $sum: "$amount" } } },
    ]);

    const totalSent = sentTxns[0]?.totalSent || 0;
    const totalReceived = receivedTxns[0]?.totalReceived || 0;
    const balance = totalReceived - totalSent;

    res.json({ balance });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
