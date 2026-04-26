const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const connectDB = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ── USER SCHEMA ──────────────────────────────────────────────────────────────
const User = mongoose.model(
  "User",
  new mongoose.Schema(
    {
      name: { type: String, required: true, trim: true },
      username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
      },
      password: { type: String, required: true },
      createdAt: { type: Date, default: Date.now },
    },
    { versionKey: false },
  ),
);

// ── COUPON SCHEMA ────────────────────────────────────────────────────────────
const Coupon = mongoose.model(
  "Coupon",
  new mongoose.Schema(
    {
      store: { type: String, required: true },
      code: { type: String, required: true, uppercase: true },
      discount: { type: String, required: true },
      category: { type: String, default: "other" },
      expiry: { type: String, default: "" },
      desc: { type: String, default: "" },
      addedOn: { type: Number, default: () => Date.now() },
    },
    { versionKey: false },
  ),
);

Coupon.schema.set("toJSON", {
  transform: (_, ret) => {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

// ── AUTH ROUTES ──────────────────────────────────────────────────────────────

// Register
app.post("/api/register", async (req, res) => {
  try {
    const { name, username, password } = req.body;

    if (!name || !username || !password)
      return res.status(400).json({ error: "All fields are required." });

    if (password.length < 4)
      return res
        .status(400)
        .json({ error: "Password must be at least 4 characters." });

    const exists = await User.findOne({ username: username.toLowerCase() });
    if (exists)
      return res.status(400).json({ error: "Username already taken." });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, username, password: hashed });

    console.log(`[REGISTER] New user: ${username}`);
    res.status(201).json({
      message: "Account created successfully.",
      username: user.username,
    });
  } catch (err) {
    console.error("[REGISTER] error:", err.message);
    res.status(500).json({ error: "Registration failed." });
  }
});

// Login
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password)
      return res
        .status(400)
        .json({ error: "Username and password are required." });

    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user)
      return res
        .status(401)
        .json({ error: "User not found. Please register first." });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "Incorrect password." });

    console.log(`[LOGIN] ${username}`);
    res.json({
      message: "Login successful.",
      username: user.username,
      name: user.name,
    });
  } catch (err) {
    console.error("[LOGIN] error:", err.message);
    res.status(500).json({ error: "Login failed." });
  }
});

// ── COUPON ROUTES ────────────────────────────────────────────────────────────

// Get all coupons
app.get("/api/coupons", async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ addedOn: -1 });
    res.json(coupons);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get one
app.get("/api/coupons/:id", async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ error: "Not found" });
    res.json(coupon);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create
app.post("/api/coupons", async (req, res) => {
  try {
    const coupon = await Coupon.create(req.body);
    console.log(`[CREATE COUPON] ${coupon.store} — ${coupon.code}`);
    res.status(201).json(coupon);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update
app.put("/api/coupons/:id", async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!coupon) return res.status(404).json({ error: "Not found" });
    res.json(coupon);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete
app.delete("/api/coupons/:id", async (req, res) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve login page at root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// ── START ────────────────────────────────────────────────────────────────────
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
});
