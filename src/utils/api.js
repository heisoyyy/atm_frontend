// src/utils/api.js

// Gunakan ENV supaya fleksibel (dev / prod)
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ================== CORE FETCH ==================
export async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      msg = j.detail || j.message || msg;
    } catch {}
    throw new Error(msg);
  }

  return res.json();
}

// ================== FORMATTER ==================
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

// ================== STATUS ==================
export const STATUS_COLOR = {
  "BONGKAR": "#E24B4A",
  "AWAS": "#EF9F27",
  "PERLU PANTAU": "#d4b800",
  "AMAN": "#1D9E75",
  "OVERFUND": "#7F77DD",
  "NO DATA": "#888780",
};

export const STATUS_BG = {
  "BONGKAR": "rgba(226,75,74,0.12)",
  "AWAS": "rgba(239,159,39,0.12)",
  "PERLU PANTAU": "rgba(212,184,0,0.12)",
  "AMAN": "rgba(29,158,117,0.10)",
  "OVERFUND": "rgba(127,119,221,0.12)",
  "NO DATA": "rgba(136,135,128,0.12)",
};

// ================== CASHPLAN ==================
export const getCashplanAPI = (status = "PENDING") =>
  apiFetch(`/api/cashplan?status=${status}`);

export const addCashplanAPI = (data) =>
  apiFetch("/api/cashplan", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateCashplanStatusAPI = (cashplanId, status, keterangan, denom) =>
  apiFetch(`/api/cashplan/${cashplanId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, keterangan, denom }),
  });

export const removeCashplanAPI = (cashplanId) =>
  apiFetch(`/api/cashplan/${cashplanId}`, { method: "DELETE" });

// ================== NOTIF CASHPLAN ==================
export const getNotifCashplanAPI = () =>
  apiFetch("/api/notif-cashplan");

export const approveNotifAPI = (notifId) =>
  apiFetch(`/api/notif-cashplan/${notifId}/approve`, { method: "POST" });

export const dismissNotifAPI = (notifId) =>
  apiFetch(`/api/notif-cashplan/${notifId}/dismiss`, { method: "POST" });

export const dismissAllNotifAPI = () =>
  apiFetch("/api/notif-cashplan/dismiss-all", { method: "POST" });

// ================== REKAP REPLACEMENT ==================
export const getRekapReplacementAPI = ({ bulan, tahun, wilayah } = {}) => {
  const params = new URLSearchParams();
  if (bulan) params.append("bulan", bulan);
  if (tahun) params.append("tahun", tahun);
  if (wilayah && wilayah !== "Semua") params.append("wilayah", wilayah);

  const qs = params.toString();
  return apiFetch(`/api/rekap-replacement${qs ? "?" + qs : ""}`);
};

export const updateRekapAPI = (rekapId, data) =>
  apiFetch(`/api/rekap-replacement/${rekapId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

// download file (xlsx/pdf/dll)
export const downloadRekapAPI = ({ wilayah, bulan, tahun, format = "xlsx" } = {}) => {
  const params = new URLSearchParams({ format });
  if (wilayah) params.append("wilayah", wilayah);
  if (bulan) params.append("bulan", bulan);
  if (tahun) params.append("tahun", tahun);

  window.open(
    `${BASE_URL}/api/rekap-replacement/download?${params.toString()}`,
    "_blank"
  );
};

// ================== PREDICTIONS ==================
export const getPredictionsAPI = ({
  wilayah,
  status,
  tipe,
  limit = 500,
  offset = 0,
} = {}) => {
  const params = new URLSearchParams({ limit, offset });

  if (wilayah) params.append("wilayah", wilayah);
  if (status) params.append("status", status);
  if (tipe) params.append("tipe", tipe);

  return apiFetch(`/api/predictions?${params.toString()}`);
};

// ================== UPLOAD ==================
export const uploadDataAPI = (file, retrain = true) => {
  const form = new FormData();
  form.append("file", file);

  return fetch(`${BASE_URL}/api/upload?retrain=${retrain}`, {
    method: "POST",
    body: form,
  }).then(async (res) => {
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const j = await res.json();
        msg = j.detail || j.message || msg;
      } catch {}
      throw new Error(msg);
    }
    return res.json();
  });
};