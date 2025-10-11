// routes.js
import express from "express";
import { verifyUserToken, logoutUser } from "../services/authService.js";

const router = express.Router();

/**
 * @route POST /verify
 * @desc Verifies Firebase ID token sent from frontend after successful login
 * @body { token: string }
 */
router.post("/verify", async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "Token is required" });

  try {
    const result = await verifyUserToken(token);
    res.status(200).json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

/**
 * @route POST /logout
 * @desc Logs out user (handled on frontend, but endpoint kept for completeness)
 */
router.post("/logout", async (req, res) => {
  try {
    const result = await logoutUser();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
