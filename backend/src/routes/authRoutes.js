// src/routes/authRoutes.js
import express from "express";
import { authenticate } from "../middleware/auth.js";
import { supabaseAdmin } from "../config/supabaseConfig.js";

const router = express.Router();

/**
 * Sign up a new user with email and password.
 * @route POST /auth/signup
 * @param {string} req.body.email - User's email address
 * @param {string} req.body.password - User's password
 * @returns {Promise<import('@supabase/supabase-js').ApiResponse>} Supabase signUp response
 */
router.post("/signup", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  const { data, error } = await supabaseAdmin.auth.signUp({ email, password });
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  return res.status(200).json(data);
});

/**
 * Log in an existing user and return JWTs.
 * @route POST /auth/login
 * @param {string} req.body.email - User's email address
 * @param {string} req.body.password - User's password
 * @returns {Promise<object>} Contains access_token, refresh_token, and user
 */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  const {
    data: { session, user },
    error,
  } = await supabaseAdmin.auth.signInWithPassword({ email, password });
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  return res.status(200).json({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    user,
  });
});

/**
 * Refresh an access token using a refresh token.
 * @route POST /auth/refresh
 * @param {string} req.body.refresh_token - User's refresh token
 * @returns {Promise<object>} New session object with access_token and refresh_token
 */
router.post("/refresh", async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) {
    return res.status(400).json({ error: "Refresh token is required" });
  }
  const {
    data: { session },
    error,
  } = await supabaseAdmin.auth.refreshSession({ refresh_token });
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  return res.status(200).json(session);
});

/**
 * Get the authenticated user's profile.
 * @route GET /auth/me
 * @header Authorization: Bearer <access_token>
 * @returns {Promise<object>} The authenticated user record
 */
router.get("/me", authenticate, async (req, res) => {
  //   const authHeader = req.headers.authorization;
  //   if (!authHeader || !authHeader.startsWith("Bearer ")) {
  //     return res
  //       .status(401)
  //       .json({ error: "Authorization header missing or invalid" });
  //   }
  //   const token = authHeader.split(" ")[1];
  //   const {
  //     data: { user },
  //     error,
  //   } = await supabaseAdmin.auth.getUser(token);
  //   if (error) {
  //     return res.status(401).json({ error: error.message });
  //   }
  return res.status(200).json(req.user);
});

/**
 * Log out the current user.
 * @route POST /auth/logout
 * @header Authorization: Bearer <access_token>
 * @returns {Promise<object>} Sign-out result
 */
router.post("/logout", async (req, res) => {
  // Client-side should simply discard tokens; this endpoint is optional
  const { error } = await supabaseAdmin.auth.signOut();
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  return res.status(200).json({ message: "Logged out successfully" });
});

export default router;
