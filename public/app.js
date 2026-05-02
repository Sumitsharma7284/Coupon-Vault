"use strict";

// ── AUTH GUARD ───────────────────────────────────────────────────────────────
// Only runs on index.html (app page)
var currentUser = localStorage.getItem("cv_user");
var currentName = localStorage.getItem("cv_name");

if (!currentUser) {
  // Not logged in — go to login, stop everything
  window.location.replace("login.html");
  throw new Error("Not logged in");
}

// Show username in header
document.getElementById("username-display").textContent =
  currentName || currentUser;

function logout() {
  localStorage.removeItem("cv_user");
  localStorage.removeItem("cv_name");
  window.location.replace("login.html");
}

// ── STATE ────────────────────────────────────────────────────────────────────
var coupons = [];
var editId = null;
var activeFilter = "all";
var activeCat = "";

// ── CATEGORY CONFIG ──────────────────────────────────────────────────────────
var CAT = {
  fashion: { emoji: "👗", color: "#f472b6", bg: "rgba(244,114,182,0.12)" },
  food: { emoji: "🍕", color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
  tech: { emoji: "💻", color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  travel: { emoji: "✈️", color: "#2dd4bf", bg: "rgba(45,212,191,0.12)" },
  beauty: { emoji: "💄", color: "#f472b6", bg: "rgba(244,114,182,0.12)" },
  home: { emoji: "🏠", color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
  other: { emoji: "📦", color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
};

// ── LOAD ─────────────────────────────────────────────────────────────────────
async function loadCoupons() {
  try {
    var res = await fetch("/api/coupons");
    coupons = await res.json();
    renderStats();
    renderList();
  } catch (e) {
    showToast("Failed to load coupons.", "error");
  }
}

// ── STATS ────────────────────────────────────────────────────────────────────
function renderStats() {
  var total = coupons.length;
  var active = coupons.filter(function (c) {
    return getStatus(c.expiry) === "active";
  }).length;
  var expiring = coupons.filter(function (c) {
    return getStatus(c.expiry) === "expiring";
  }).length;
  var expired = coupons.filter(function (c) {
    return getStatus(c.expiry) === "expired";
  }).length;

  document.getElementById("stat-tiles").innerHTML =
    statTile("#d4af37", total, "Total") +
    statTile("#4ade80", active, "Active") +
    statTile("#fbbf24", expiring, "Expiring") +
    statTile("#ff5f5f", expired, "Expired");
}

function statTile(color, num, label) {
  return (
    '<div class="stat-tile">' +
    '<div class="stat-dot" style="background:' +
    color +
    '"></div>' +
    '<div class="stat-tile-info">' +
    '<div class="stat-tile-num" style="color:' +
    color +
    '">' +
    num +
    "</div>" +
    '<div class="stat-tile-lbl">' +
    label +
    "</div>" +
    "</div></div>"
  );
}

// ── FILTER CONTROLS ──────────────────────────────────────────────────────────
function setFilter(el, val) {
  activeFilter = val;
  document.querySelectorAll(".filter-pill").forEach(function (b) {
    b.classList.remove("active");
  });
  el.classList.add("active");
  renderList();
}

function setCat(el, val) {
  activeCat = val;
  document.querySelectorAll(".cat-pill").forEach(function (b) {
    b.classList.remove("active");
  });
  el.classList.add("active");
  renderList();
}

// ── RENDER ───────────────────────────────────────────────────────────────────
function renderList() {
  var q = document.getElementById("search").value.toLowerCase();

  var list = coupons.filter(function (c) {
    var matchQ =
      !q ||
      c.store.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      (c.desc || "").toLowerCase().includes(q);
    var s = getStatus(c.expiry);
    var matchF = activeFilter === "all" || s === activeFilter;
    var matchCat = !activeCat || c.category === activeCat;
    return matchQ && matchF && matchCat;
  });

  var titles = {
    all: "All Coupons",
    active: "Active Coupons",
    expiring: "Expiring Soon",
    expired: "Expired Coupons",
  };
  document.getElementById("section-title").textContent =
    titles[activeFilter] || "Coupons";
  document.getElementById("section-count").textContent =
    list.length + " coupon" + (list.length !== 1 ? "s" : "");

  var grid = document.getElementById("coupon-grid");

  if (!list.length) {
    grid.innerHTML =
      '<div class="empty-state"><span class="empty-icon">◈</span><div class="empty-title">No coupons here</div><div class="empty-sub">Add your first coupon using the button above.</div></div>';
    return;
  }

  grid.innerHTML = list
    .map(function (c, i) {
      var cat = CAT[c.category] || CAT.other;
      var status = getStatus(c.expiry);
      var expTxt = formatExpiry(c.expiry, status);
      return (
        '<div class="coupon-card cat-' +
        c.category +
        (status === "expired" ? " is-expired" : "") +
        '" style="animation-delay:' +
        i * 40 +
        'ms">' +
        '<div class="card-top">' +
        '<div class="card-store">' +
        esc(c.store) +
        "</div>" +
        '<span class="card-cat" style="background:' +
        cat.bg +
        ";color:" +
        cat.color +
        '">' +
        cat.emoji +
        " " +
        c.category +
        "</span>" +
        "</div>" +
        '<div class="card-discount">' +
        esc(c.discount) +
        "</div>" +
        '<div class="card-desc">' +
        esc(c.desc || "") +
        "</div>" +
        '<div class="card-code" onclick="copyCode(this,\'' +
        esc(c.code) +
        "')\">" +
        '<span class="code-lbl">Code</span>' +
        '<span class="code-val">' +
        esc(c.code) +
        "</span>" +
        '<span class="code-copy-hint">click to copy</span>' +
        "</div>" +
        '<div class="card-footer">' +
        '<span class="card-expiry ' +
        status +
        '">' +
        expTxt +
        "</span>" +
        '<div class="card-actions">' +
        '<button class="card-btn card-btn-edit" onclick="startEdit(\'' +
        c.id +
        "')\">Edit</button>" +
        '<button class="card-btn card-btn-del"  onclick="deleteCoupon(\'' +
        c.id +
        "')\">Delete</button>" +
        "</div>" +
        "</div>" +
        "</div>"
      );
    })
    .join("");
}

// ── DRAWER ───────────────────────────────────────────────────────────────────
function openForm(id) {
  editId = id || null;
  var c = id
    ? coupons.find(function (x) {
        return x.id === id;
      })
    : null;

  document.getElementById("drawer-title").textContent = id
    ? "Edit Coupon"
    : "New Coupon";
  document.getElementById("f-store").value = c ? c.store : "";
  document.getElementById("f-code").value = c ? c.code : "";
  document.getElementById("f-discount").value = c ? c.discount : "";
  document.getElementById("f-category").value = c ? c.category : "fashion";
  document.getElementById("f-expiry").value = c ? c.expiry || "" : "";
  document.getElementById("f-desc").value = c ? c.desc || "" : "";
  document.getElementById("btn-save").querySelector(".btn-text").textContent =
    "Save Coupon";

  document.getElementById("drawer").classList.add("open");
  document.getElementById("drawer-overlay").classList.add("open");
}

function closeForm() {
  document.getElementById("drawer").classList.remove("open");
  document.getElementById("drawer-overlay").classList.remove("open");
  editId = null;
}

function startEdit(id) {
  openForm(id);
}

// ── SAVE ─────────────────────────────────────────────────────────────────────
async function saveCoupon() {
  var data = {
    store: document.getElementById("f-store").value.trim(),
    code: document.getElementById("f-code").value.trim().toUpperCase(),
    discount: document.getElementById("f-discount").value.trim(),
    category: document.getElementById("f-category").value,
    expiry: document.getElementById("f-expiry").value,
    desc: document.getElementById("f-desc").value.trim(),
  };

  if (!data.store || !data.code || !data.discount) {
    showToast("Store, Code and Discount are required.", "error");
    return;
  }

  var btn = document.getElementById("btn-save");
  btn.disabled = true;
  btn.querySelector(".btn-text").textContent = "Saving…";

  try {
    if (editId) {
      await fetch("/api/coupons/" + editId, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      showToast("✦ Coupon updated.", "success");
    } else {
      await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      showToast("✦ Coupon added.", "success");
    }
    closeForm();
    await loadCoupons();
  } catch (e) {
    showToast("Something went wrong.", "error");
  }

  btn.disabled = false;
  btn.querySelector(".btn-text").textContent = "Save Coupon";
}

// ── DELETE ───────────────────────────────────────────────────────────────────
async function deleteCoupon(id) {
  if (!confirm("Delete this coupon?")) return;
  await fetch("/api/coupons/" + id, { method: "DELETE" });
  showToast("Coupon deleted.", "error");
  await loadCoupons();
}

// ── COPY CODE ────────────────────────────────────────────────────────────────
function copyCode(el, code) {
  navigator.clipboard.writeText(code).then(function () {
    el.classList.add("copied");
    el.querySelector(".code-copy-hint").textContent = "✓ copied!";
    setTimeout(function () {
      el.classList.remove("copied");
      el.querySelector(".code-copy-hint").textContent = "click to copy";
    }, 1800);
    showToast("◆ Copied: " + code, "info");
  });
}

// ── HELPERS ──────────────────────────────────────────────────────────────────
function getStatus(expiry) {
  if (!expiry) return "active";
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  var diff = Math.ceil((new Date(expiry) - today) / 86400000);
  if (diff < 0) return "expired";
  if (diff <= 7) return "expiring";
  return "active";
}

function formatExpiry(expiry, status) {
  if (!expiry) return "◈ No expiry";
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  var diff = Math.ceil((new Date(expiry) - today) / 86400000);
  if (diff < 0) return "✕ Expired " + Math.abs(diff) + "d ago";
  if (diff === 0) return "⚡ Expires today";
  if (diff === 1) return "⚡ Expires tomorrow";
  if (diff <= 7) return "⚡ " + diff + " days left";
  return "◈ " + expiry;
}

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function showToast(msg, type) {
  type = type || "success";
  var el = document.getElementById("toast");
  el.textContent = msg;
  el.className = "toast " + type + " show";
  clearTimeout(el._t);
  el._t = setTimeout(function () {
    el.classList.remove("show");
  }, 2800);
}

// ── KEYBOARD ─────────────────────────────────────────────────────────────────
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") closeForm();
});

// ── INIT ─────────────────────────────────────────────────────────────────────
loadCoupons();
