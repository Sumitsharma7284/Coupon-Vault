"use strict";

// ── AUTH GUARD ──────────────────────────────────────────────────────────────
const currentUser = sessionStorage.getItem("cv_user");
if (!currentUser) location.href = "login.html";

document.getElementById("username-display").textContent = currentUser;

function logout() {
  sessionStorage.removeItem("cv_user");
  location.href = "login.html";
}

// ── STATE ───────────────────────────────────────────────────────────────────
let coupons = [];
let editId = null;

// ── CATEGORY CONFIG ─────────────────────────────────────────────────────────
const CAT = {
  fashion: { emoji: "👗", color: "#ec4899", bg: "#fdf2f8" },
  food: { emoji: "🍕", color: "#f59e0b", bg: "#fffbeb" },
  tech: { emoji: "💻", color: "#3b82f6", bg: "#eff6ff" },
  travel: { emoji: "✈️", color: "#14b8a6", bg: "#f0fdfa" },
  beauty: { emoji: "💄", color: "#ec4899", bg: "#fdf2f8" },
  home: { emoji: "🏠", color: "#10b981", bg: "#ecfdf5" },
  other: { emoji: "📦", color: "#8b5cf6", bg: "#f5f3ff" },
};

// ── LOAD ────────────────────────────────────────────────────────────────────
async function loadCoupons() {
  try {
    const res = await fetch("/api/coupons");
    coupons = await res.json();
    renderStats();
    renderList();
  } catch (err) {
    showToast("Failed to load coupons", "error");
  }
}

// ── STATS ───────────────────────────────────────────────────────────────────
function renderStats() {
  const total = coupons.length;
  const active = coupons.filter((c) => getStatus(c.expiry) === "active").length;
  const expiring = coupons.filter(
    (c) => getStatus(c.expiry) === "expiring",
  ).length;
  const expired = coupons.filter(
    (c) => getStatus(c.expiry) === "expired",
  ).length;

  document.getElementById("stats-row").innerHTML = `
    <div class="stat-card">
      <div class="stat-icon" style="background:#eff6ff">📋</div>
      <div class="stat-info">
        <div class="stat-value" style="color:#3b82f6">${total}</div>
        <div class="stat-label">Total Coupons</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:#ecfdf5">✅</div>
      <div class="stat-info">
        <div class="stat-value" style="color:#10b981">${active}</div>
        <div class="stat-label">Active</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:#fffbeb">⚡</div>
      <div class="stat-info">
        <div class="stat-value" style="color:#f59e0b">${expiring}</div>
        <div class="stat-label">Expiring Soon</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:#fef2f2">❌</div>
      <div class="stat-info">
        <div class="stat-value" style="color:#ef4444">${expired}</div>
        <div class="stat-label">Expired</div>
      </div>
    </div>`;
}

// ── RENDER LIST ─────────────────────────────────────────────────────────────
function renderList() {
  const q = document.getElementById("search").value.toLowerCase();
  const cat = document.getElementById("filter-cat").value;
  const status = document.getElementById("filter-status").value;

  let list = coupons.filter((c) => {
    const matchQ =
      !q ||
      c.store.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      (c.desc || "").toLowerCase().includes(q);
    const matchCat = !cat || c.category === cat;
    const s = getStatus(c.expiry);
    const matchS = !status || s === status;
    return matchQ && matchCat && matchS;
  });

  const container = document.getElementById("coupon-list");

  if (!list.length) {
    container.innerHTML = `
      <div class="empty">
        <div class="empty-icon">🎫</div>
        <div class="empty-text">No coupons found. Add one!</div>
      </div>`;
    return;
  }

  container.innerHTML = list
    .map((c) => {
      const s = getStatus(c.expiry);
      const cat = CAT[c.category] || CAT.other;
      const expText = formatExpiry(c.expiry, s);

      return `
      <div class="coupon-card cat-${c.category} ${s === "expired" ? "expired-card" : ""}">
        <div class="coupon-info">
          <div class="coupon-top">
            <span class="coupon-store">${esc(c.store)}</span>
            <span class="cat-badge" style="background:${cat.bg};color:${cat.color}">${cat.emoji} ${c.category}</span>
          </div>
          <div class="coupon-discount">${esc(c.discount)}</div>
          <div class="coupon-meta">
            <span class="exp-badge ${s}">${expText}</span>
            ${c.desc ? `<span>· ${esc(c.desc)}</span>` : ""}
          </div>
        </div>
        <span class="coupon-code" onclick="copyCode('${esc(c.code)}')" title="Click to copy">
          ${esc(c.code)}
        </span>
        <div class="coupon-actions">
          <button class="btn-edit" onclick="startEdit('${c.id}')">✏️ Edit</button>
          <button class="btn-del"  onclick="deleteCoupon('${c.id}')">🗑️ Delete</button>
        </div>
      </div>`;
    })
    .join("");
}

// ── SAVE (create or update) ─────────────────────────────────────────────────
async function saveCoupon() {
  const data = {
    store: document.getElementById("f-store").value.trim(),
    code: document.getElementById("f-code").value.trim().toUpperCase(),
    discount: document.getElementById("f-discount").value.trim(),
    expiry: document.getElementById("f-expiry").value,
    category: document.getElementById("f-category").value,
    desc: document.getElementById("f-desc").value.trim(),
  };

  if (!data.store || !data.code || !data.discount) {
    showToast("Please fill in Store, Code and Discount.", "error");
    return;
  }

  try {
    if (editId) {
      await fetch(`/api/coupons/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      showToast("✅ Coupon updated!", "success");
      cancelEdit();
    } else {
      await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      showToast("✅ Coupon added!", "success");
      clearForm();
    }
    await loadCoupons();
  } catch (err) {
    showToast("Something went wrong.", "error");
  }
}

// ── DELETE ──────────────────────────────────────────────────────────────────
async function deleteCoupon(id) {
  if (!confirm("Delete this coupon?")) return;
  await fetch(`/api/coupons/${id}`, { method: "DELETE" });
  showToast("🗑️ Coupon deleted.", "error");
  await loadCoupons();
}

// ── EDIT ────────────────────────────────────────────────────────────────────
function startEdit(id) {
  const c = coupons.find((x) => x.id === id);
  if (!c) return;
  editId = id;
  document.getElementById("f-store").value = c.store;
  document.getElementById("f-code").value = c.code;
  document.getElementById("f-discount").value = c.discount;
  document.getElementById("f-expiry").value = c.expiry || "";
  document.getElementById("f-category").value = c.category;
  document.getElementById("f-desc").value = c.desc || "";
  document.getElementById("form-title").textContent = "✏️ Edit Coupon";
  document.getElementById("btn-cancel").style.display = "inline-block";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function cancelEdit() {
  editId = null;
  clearForm();
  document.getElementById("form-title").textContent = "Add Coupon";
  document.getElementById("btn-cancel").style.display = "none";
}

function clearForm() {
  ["f-store", "f-code", "f-discount", "f-expiry", "f-desc"].forEach(
    (id) => (document.getElementById(id).value = ""),
  );
  document.getElementById("f-category").value = "fashion";
}

// ── HELPERS ─────────────────────────────────────────────────────────────────
function copyCode(code) {
  navigator.clipboard
    .writeText(code)
    .then(() => showToast(`📋 Copied: ${code}`, "success"));
}

function getStatus(expiry) {
  if (!expiry) return "active";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((new Date(expiry) - today) / 86400000);
  if (diff < 0) return "expired";
  if (diff <= 7) return "expiring";
  return "active";
}

function formatExpiry(expiry, status) {
  if (!expiry) return "🟢 No expiry";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((new Date(expiry) - today) / 86400000);
  if (diff < 0) return `❌ Expired ${Math.abs(diff)}d ago`;
  if (diff === 0) return "⚡ Expires today";
  if (diff <= 7) return `⚡ ${diff}d left`;
  return `🟢 ${expiry}`;
}

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function showToast(msg, type = "success") {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = `toast ${type} show`;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 2500);
}

// ── INIT ─────────────────────────────────────────────────────────────────────
loadCoupons();
