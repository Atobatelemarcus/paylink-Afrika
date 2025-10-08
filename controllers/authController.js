import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";
import User from "../models/User.js";
import sendEmail from "../utils/sendEmail.js";

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
const generateAccountNumber = () => {
  return Math.floor(1000000000 + Math.random() * 9000000000).toString();
};


// ✅ Register
export const registerUser = async (req, res) => {
  try {
    const { firstname, lastname, email, password, dob, gender, phone } = req.body;
    if (!firstname || !lastname || !email || !password) {
      return res.status(400).json({ message: "All required fields must be filled" });
    }

    const existing = await User.findOne({ email });
    const existingPhone=await User.findOne({phone})
    if (existing) return res.status(400).json({ message: "Email already exists" });
    if(existingPhone) return res.status(400).json({message:"Phone number already exists"});

    const hashedPassword = await bcrypt.hash(password, 10);
    const accountNumber = generateAccountNumber();
    const user = await User.create({
      firstname,
      lastname,
      email: email.toLowerCase(),
      password: hashedPassword,
      dob,
      gender,
      phone,
      accountNumber,
    });

    const token = generateToken(user._id);
    res.status(201).json({
  message: "Registration successful",
  user: {
    id: user._id,
    firstname: user.firstname,
    lastname: user.lastname,
    email: user.email,
    phone: user.phone,
    dob: user.dob,
    gender: user.gender,
    accountNumber: user.accountNumber,
    balance: user.balance || 0,
  },
  token,
});




  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const loginUser = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    const isEmail = identifier.includes("@");
    const user = await User.findOne(
      isEmail ? { email: identifier.toLowerCase() } : { phone: identifier }
    );

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRATION || "7d",
    });

    // ✅ Return full info including balance and account number
    res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        phone: user.phone,
        dob: user.dob,
        gender: user.gender,
        accountNumber: user.accountNumber,
        balance: user.balance || 0,
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Step 1: Forgot Password (send code)
export const forgotPassword = async (req, res) => {
  try {
    const { identifier } = req.body; // email or phone
    if (!identifier)
      return res.status(400).json({ message: "Email or phone is required" });

    const isEmail = identifier.includes("@");
    const user = await User.findOne(
      isEmail ? { email: identifier.toLowerCase() } : { phone: identifier }
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    // Generate 6-digit numeric code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Save as string to avoid type issues
    user.resetCode = resetCode;
    user.resetCodeExpires = Date.now() + 15 * 60 * 1000; // 15 min
    await user.save();

    if (isEmail) {
      const html = `
        <h3>Hello ${user.firstname},</h3>
        <p>Your password reset code is:</p>
        <h2>${resetCode}</h2>
        <p>This code will expire in 15 minutes.</p>
      `;
      await sendEmail(user.email, "Paylink Password Reset", html);
    }

    res.json({
      message: isEmail
        ? "Reset code sent to your email."
        : "Reset code sent successfully.",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Step 2: Verify Code
export const verifyResetCode = async (req, res) => {
  try {
    const { identifier, code } = req.body;
    if (!identifier || !code)
      return res.status(400).json({ message: "Identifier and code required" });

    const isEmail = identifier.includes("@");
    const user = await User.findOne(
      isEmail ? { email: identifier.toLowerCase() } : { phone: identifier }
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.resetCode !== code.trim())
      return res.status(400).json({ message: "Invalid code" });

    if (user.resetCodeExpires < Date.now())
      return res.status(400).json({ message: "Code expired" });

    res.json({ message: "Code verified successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Step 3: Reset Password
export const resetPassword = async (req, res) => {
  try {
    const { identifier, code, newPassword } = req.body;
    if (!identifier || !code || !newPassword)
      return res.status(400).json({ message: "All fields are required" });

    const isEmail = identifier.includes("@");
    const user = await User.findOne(
      isEmail ? { email: identifier.toLowerCase() } : { phone: identifier }
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.resetCode !== code.trim())
      return res.status(400).json({ message: "Invalid code" });

    if (user.resetCodeExpires < Date.now())
      return res.status(400).json({ message: "Code expired" });

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetCode = null;
    user.resetCodeExpires = null;
    await user.save();

    res.json({ message: "Password reset successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
