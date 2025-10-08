import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    firstname: { type: String, required: true },
    lastname: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    dob: { type: String },
    gender: { type: String, enum: ["Male", "Female", "Other"] },

    // ✅ Wallet fields
    accountNumber: {
      type: String,
      unique: true,
      default: () =>
        Math.floor(1000000000 + Math.random() * 9000000000).toString(),
    },
    balance: {
      type: Number,
      default: 0,
    },

    // ✅ Reset password fields
    resetCode: { type: String, default: null },
    resetCodeExpires: { type: Date, default: null },

    // ✅ Optional fields
    isActive: { type: Boolean, default: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
