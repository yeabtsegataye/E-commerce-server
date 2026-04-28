const User = require("../model/USERMODEL");
const items = require("../model/ITEMS");

const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const validator = require("validator");

const tokens = (id) => {
  return jwt.sign({ id }, process.env.SECRET, { expiresIn: "3d" });
};

// Very small in-memory rate limiter (per process) to reduce abuse.
// NOTE: For production, prefer a shared store (Redis) and a real rate limiter.
const resetRate = new Map(); // key: ip|email -> { count, resetAt }
const rateKey = (req, email) => `${req.ip || "unknown"}|${String(email || "").toLowerCase()}`;
const allowResetRequest = (req, email) => {
  const key = rateKey(req, email);
  const now = Date.now();
  const windowMs = 10 * 60 * 1000; // 10 minutes
  const max = 5;

  const entry = resetRate.get(key);
  if (!entry || entry.resetAt <= now) {
    resetRate.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count += 1;
  return true;
};

const sha256 = (value) =>
  crypto.createHash("sha256").update(String(value)).digest("hex");

const sendResetEmailOrLog = async ({ to, resetUrl }) => {
  // Optional SMTP settings. If missing, we log the reset URL (safe for dev).
    const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
  const from = process.env.SMTP_FROM || user;
  const isGmail = !host && user && String(user).toLowerCase().endsWith("@gmail.com");

  if (!user || !pass || !from) {
    console.log("🔐 Password reset link (SMTP not configured):", resetUrl);
    return;
  }

  // Lazy-load nodemailer only when configured
  // eslint-disable-next-line global-require
  const nodemailer = require("nodemailer");
  const transporter = nodemailer.createTransport(
    isGmail
      ? {
          service: "gmail",
          auth: { user, pass },
        }
      : {
          host,
          port: Number(port),
          secure: Number(port) === 465,
          auth: { user, pass },
        }
  );

  await transporter.sendMail({
    from,
    to,
    subject: "Reset your MK_cosmo password",
    text: `Reset your password using this link (expires soon):\n\n${resetUrl}\n\nIf you didn't request this, ignore this email.`,
    html: `
      <p>We received a request to reset your password.</p>
      <p><a href="${resetUrl}">Click here to reset your password</a> (expires soon).</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  });
};
/////////////////////////
// const registerUser = async (req, res) => {
//   const { Name, Email, password, pic, isAdmin, Phone, Address } = req.body;

//   try {
//     const user = await User.signup(
//       Name,
//       Email,
//       password,
//       pic,
//       isAdmin,
//       Phone,
//       Address
//     );
//     const token = tokens(user._id);
//     const id = user._id;
//     return res
//       .status(200)
//       .json({ id, token, Email, Address, Name, Phone, pic, isAdmin });
//   } catch (error) {
//     return res.status(400).json({ error: error.message });
//   }
// };
const authUser = async (req, res) => {
  const { Email, password } = req.body;
  try {
    const user = await User.login(Email, password);
    const Address = user.Address;
    const Phone = user.Phone;
    const Name = user.Name;
    const pic = user.pic;
    const isAdmin = user.isAdmin;
    const token = tokens(user._id);
    const id = user._id;

    res
      .status(200)
      .json({ id, token, Email, Address, Name, Phone, pic, isAdmin });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
//////////////////////////
const handel_mypost = async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) {
    return res.status(400).json({ error: "user not found" });
  }
  try {
    const user = await User.findById(user_id);

    if (!user) {
      return res.status(400).json({ error: "user not found" });
    }
    const myposts = await items.find({ Item_poster: user_id });

    return res.status(200).json({ myposts });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

// POST /ip/user/forgot-password
// Always returns 200 (generic) to avoid account enumeration.
const forgotPassword = async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();

  if (!email || !validator.isEmail(email)) {
    return res.status(200).json({
      ok: true,
      message: "If an account exists, a reset link has been sent.",
    });
  }

  if (!allowResetRequest(req, email)) {
    return res.status(200).json({
      ok: true,
      message: "If an account exists, a reset link has been sent.",
    });
  }

  try {
    const user = await User.findOne({ Email: email });
    if (!user) {
      return res.status(200).json({
        ok: true,
        message: "If an account exists, a reset link has been sent.",
      });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = sha256(rawToken);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    user.passwordResetTokenHash = tokenHash;
    user.passwordResetExpiresAt = expiresAt;
    await user.save();

    const clientBase = process.env.CLIENT_URL || "http://localhost:3000";
    const resetUrl = `${clientBase}/reset-password?token=${encodeURIComponent(
      rawToken
    )}`;

    await sendResetEmailOrLog({ to: user.Email, resetUrl });

    return res.status(200).json({
      ok: true,
      message: "If an account exists, a reset link has been sent.",
    });
  } catch (error) {
    // Still generic
    return res.status(200).json({
      ok: true,
      message: "If an account exists, a reset link has been sent.",
    });
  }
};

// POST /ip/user/reset-password
const resetPassword = async (req, res) => {
  const token = String(req.body?.token || "").trim();
  const password = String(req.body?.password || "");

  if (!token || token.length < 32) {
    return res.status(400).json({ error: "Invalid token" });
  }
  if (!password || password.length < 10) {
    return res.status(400).json({ error: "Password must be at least 10 characters" });
  }

  try {
    const tokenHash = sha256(token);
    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    const hashed = await bcrypt.hash(password, 10);
    user.password = hashed;
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    await user.save();

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: "Reset failed" });
  }
};
module.exports = {
  authUser,
  handel_mypost,
  forgotPassword,
  resetPassword,
};
