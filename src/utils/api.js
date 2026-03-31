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
  "KRITIS":            "#ff3b5c",
  "SEGERA ISI":        "#ff8c00",
  "PERLU DIPANTAU":    "#f5c518",
  "AMAN":              "#00e5a0",
  "BONGKAR (OVERFUND)":"#a78bfa",
  "NO DATA":           "#6b7280",
};

export const STATUS_BG = {
  "KRITIS":            "rgba(255,59,92,0.12)",
  "SEGERA ISI":        "rgba(255,140,0,0.12)",
  "PERLU DIPANTAU":    "rgba(245,197,24,0.12)",
  "AMAN":              "rgba(0,229,160,0.10)",
  "BONGKAR (OVERFUND)":"rgba(167,139,250,0.12)",
  "NO DATA":           "rgba(107,114,128,0.12)",
};
