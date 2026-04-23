const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const connectDB = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ── SCHEMA ───────────────────────────────────────────────────────────────────
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

// ── ROUTES ───────────────────────────────────────────────────────────────────

// Get all coupons
app.get("/api/coupons", async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ addedOn: -1 });
    console.log("Fetched coupons:", coupons.length);
    res.json(coupons);
  } catch (err) {
    console.error("GET /api/coupons error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get one coupon
app.get("/api/coupons/:id", async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ error: "Not found" });
    res.json(coupon);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create coupon
app.post("/api/coupons", async (req, res) => {
  try {
    console.log("Creating coupon:", req.body);
    const coupon = await Coupon.create(req.body);
    console.log("Coupon saved:", coupon);
    res.status(201).json(coupon);
  } catch (err) {
    console.error("POST /api/coupons error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Update coupon
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

// Delete coupon
app.delete("/api/coupons/:id", async (req, res) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CONNECT DB THEN START SERVER ─────────────────────────────────────────────
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
});
