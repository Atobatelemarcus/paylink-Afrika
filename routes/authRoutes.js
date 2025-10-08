import express from "express";
import {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
    verifyResetCode,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/verify-code",verifyResetCode);

export default router;
