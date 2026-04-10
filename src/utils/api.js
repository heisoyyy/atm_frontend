// src/utils/api.js
const BASE = "http://localhost:8000";

export async function apiFetch(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Terjadi kesalahan");
  }
  return res.json();
}

export const fmt = {
  rupiah: (n) => {
    if (n == null) return "-";
    if (n >= 1e9) return `Rp ${(n / 1e9).toFixed(1)}M`;
    if (n >= 1e6) return `Rp ${(n / 1e6).toFixed(0)}jt`;
    return `Rp ${n.toLocaleString("id-ID")}`;
  },
  pct: (n) => (n != null ? `${n.toFixed(1)}%` : "-"),
  jam: (n) => {
    if (n == null) return "-";
    if (n >= 168) return "≥7 hari";
    if (n >= 24) return `${(n / 24).toFixed(1)} hari`;
    return `${n.toFixed(0)} jam`;
  },
};

export const STATUS_COLOR = {
  "BONGKAR":       "#E24B4A",
  "AWAS":          "#EF9F27",
  "PERLU PANTAU":  "#d4b800",
  "AMAN":          "#1D9E75",
  "OVERFUND":      "#7F77DD",
  "NO DATA":       "#888780",
};

export const STATUS_BG = {
  "BONGKAR":       "rgba(226,75,74,0.12)",
  "AWAS":          "rgba(239,159,39,0.12)",
  "PERLU PANTAU":  "rgba(212,184,0,0.12)",
  "AMAN":          "rgba(29,158,117,0.10)",
  "OVERFUND":      "rgba(127,119,221,0.12)",
  "NO DATA":       "rgba(136,135,128,0.12)",
};

// ── CashPlan API ──────────────────────────────────────────

/** Tambah ATM ke cashplan (MySQL) */
export async function addCashplanAPI(atmData) {
  return apiFetch("/api/cashplan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(atmData),
  });
}

/** Ambil list cashplan dari MySQL */
export async function getCashplanAPI(status = "PENDING") {
  return apiFetch(`/api/cashplan?status=${status}`);
}

/** Ubah status cashplan → DONE atau REMOVED */
export async function updateCashplanStatusAPI(cashplanId, status, keterangan = null, denom = null) {
  return apiFetch(`/api/cashplan/${cashplanId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, keterangan, denom }),
  });
}

/** Remove (soft delete) cashplan item */
export async function removeCashplanAPI(cashplanId) {
  return apiFetch(`/api/cashplan/${cashplanId}`, { method: "DELETE" });
}

// ── Rekap Replacement API ──────────────────────────────────

/** Ambil rekap replacement dari MySQL */
export async function getRekapReplacementAPI({ bulan, tahun, wilayah } = {}) {
  const params = new URLSearchParams();
  if (bulan)   params.set("bulan", bulan);
  if (tahun)   params.set("tahun", tahun);
  if (wilayah && wilayah !== "Semua") params.set("wilayah", wilayah);
  const qs = params.toString();
  return apiFetch(`/api/rekap-replacement${qs ? "?" + qs : ""}`);
}
/** Update rekap replacement — jam cash in/out, tgl isi, denom */
export async function updateRekapAPI(rekapId, { tgl_isi, jam_cash_in, jam_cash_out, denom }) {
  return apiFetch(`/api/rekap-replacement/${rekapId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tgl_isi, jam_cash_in, jam_cash_out, denom }),
  });
}