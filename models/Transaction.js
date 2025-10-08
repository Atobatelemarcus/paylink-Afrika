import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // null for funding/top-up
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0, "Amount must be positive"],
    },
    type: {
      type: String,
      enum: ["fund", "transfer"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    transactionCode: {
      type: String,
      unique: true,
      required: true,
    },
    paymentMethod: {
      type: String,
      default: "internal",
    },
    reference: {
      type: String, // store Paystack/Flutterwave reference for verification
    },
    description: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// ✅ Index for faster lookups (optional but great for performance)
transactionSchema.index({ sender: 1 });
transactionSchema.index({ recipient: 1 });

export default mongoose.model("Transaction", transactionSchema);
