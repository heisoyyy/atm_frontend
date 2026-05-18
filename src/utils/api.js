// src/utils/api.js

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function apiFetch(path, options = {}) {
  const { headers: extraHeaders = {}, ...restOptions } = options;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...restOptions,
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
    },
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      if (j.detail) {
        if (Array.isArray(j.detail)) {
          msg = j.detail.map(d => `${d.loc?.join(".")}: ${d.msg}`).join("; ");
        } else if (typeof j.detail === "string") {
          msg = j.detail;
        } else if (typeof j.detail === "object") {
          msg = j.detail.error || j.detail.context || JSON.stringify(j.detail);
        } else {
          msg = String(j.detail);
        }
      } else if (j.message) {
        msg = j.message;
      } else {
        msg = JSON.stringify(j);
      }
    } catch {
      msg = res.statusText || msg;
    }
    throw new Error(msg);
  }

  return res.json();
}

// ================== AUTH FETCH (selalu bawa token) ==================
export const getStoredToken = () => localStorage.getItem("sipras_token");

export const authFetch = (path, options = {}) => {
  const token = getStoredToken();
  const { headers: extraHeaders = {}, ...restOptions } = options;  // ← pisahkan

  return apiFetch(path, {
    ...restOptions,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extraHeaders,
    },
  });
};

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
  "BONGKAR":      "#E24B4A",
  "AWAS":         "#EF9F27",
  "PERLU PANTAU": "#d4b800",
  "AMAN":         "#1D9E75",
  "OVERFUND":     "#7F77DD",
  "NO DATA":      "#888780",
};

export const STATUS_BG = {
  "BONGKAR":      "rgba(226,75,74,0.12)",
  "AWAS":         "rgba(239,159,39,0.12)",
  "PERLU PANTAU": "rgba(212,184,0,0.12)",
  "AMAN":         "rgba(29,158,117,0.10)",
  "OVERFUND":     "rgba(127,119,221,0.12)",
  "NO DATA":      "rgba(136,135,128,0.12)",
};

// ================== CASHPLAN ==================
// GET tidak wajib auth (data publik monitoring), tapi tetap bawa token kalau ada
export const getCashplanAPI = (status = "PENDING") =>
  authFetch(`/api/cashplan?status=${status}`);

// POST/PATCH/DELETE wajib auth — pakai authFetch
export const addCashplanAPI = (data) =>
  authFetch("/api/cashplan", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateCashplanStatusAPI = (cashplanId, status, keterangan, denom) =>
  authFetch(`/api/cashplan/${cashplanId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, keterangan, denom }),
  });

export const removeCashplanAPI = (cashplanId) =>
  authFetch(`/api/cashplan/${cashplanId}`, { method: "DELETE" });

// ================== NOTIF CASHPLAN ==================
export const getNotifCashplanAPI = () =>
  authFetch("/api/notif-cashplan");

export const approveNotifAPI = (notifId) =>
  authFetch(`/api/notif-cashplan/${notifId}/approve`, { method: "POST" });

export const dismissNotifAPI = (notifId) =>
  authFetch(`/api/notif-cashplan/${notifId}/dismiss`, { method: "POST" });

export const dismissAllNotifAPI = () =>
  authFetch("/api/notif-cashplan/dismiss-all", { method: "POST" });

// ================== REKAP REPLACEMENT ==================
export const getRekapReplacementAPI = ({ bulan, tahun, wilayah } = {}) => {
  const params = new URLSearchParams();
  if (bulan)   params.append("bulan", bulan);
  if (tahun)   params.append("tahun", tahun);
  if (wilayah && wilayah !== "Semua") params.append("wilayah", wilayah);
  const qs = params.toString();
  return authFetch(`/api/rekap-replacement${qs ? "?" + qs : ""}`);
};

export const updateRekapAPI = (rekapId, data) =>
  authFetch(`/api/rekap-replacement/${rekapId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

// Download file — pakai URL langsung dengan token di query string
// karena window.open tidak bisa set header Authorization
export const downloadRekapAPI = ({ wilayah, bulan, tahun, format = "xlsx" } = {}) => {
  const token = getStoredToken();
  const params = new URLSearchParams({ format });
  if (wilayah) params.append("wilayah", wilayah);
  if (bulan)   params.append("bulan", bulan);
  if (tahun)   params.append("tahun", tahun);
  if (token)   params.append("token", token); // opsional: kalau backend support token via query
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
  limit  = 500,
  offset = 0,
} = {}) => {
  const params = new URLSearchParams({ limit, offset });
  if (wilayah) params.append("wilayah", wilayah);
  if (status)  params.append("status", status);
  if (tipe)    params.append("tipe", tipe);
  return authFetch(`/api/predictions?${params.toString()}`);
};

export const getPredictionDetailAPI = (atmId) =>
  authFetch(`/api/predictions/${atmId}`);

// ================== ALERTS ==================
export const getAlertsAPI = (level) => {
  const params = new URLSearchParams();
  if (level) params.append("level", level);
  return authFetch(`/api/alerts${params.toString() ? "?" + params.toString() : ""}`);
};

// ================== SUMMARY & WILAYAH ==================
export const getSummaryAPI  = () => authFetch("/api/summary");
export const getWilayahAPI  = () => authFetch("/api/wilayah");
export const getAtmListAPI  = (wilayah, status) => {
  const params = new URLSearchParams();
  if (wilayah) params.append("wilayah", wilayah);
  if (status)  params.append("status", status);
  return authFetch(`/api/atm-list${params.toString() ? "?" + params.toString() : ""}`);
};

// ================== HISTORY ==================
export const getHistoryAPI = (atmId, lastNDays = 7) =>
  authFetch(`/api/history/${atmId}?last_n_days=${lastNDays}`);

// ================== UPLOAD ==================
// Upload pakai FormData — tidak bisa pakai apiFetch biasa karena Content-Type multipart
export const uploadDataAPI = (file, retrain = true) => {
  const token = getStoredToken();
  const form  = new FormData();
  form.append("file", file);

  return fetch(`${BASE_URL}/api/upload?retrain=${retrain}`, {
    method: "POST",
    headers: {
      // Jangan set Content-Type di sini — biarkan browser set boundary multipart otomatis
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
  }).then(async (res) => {
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const j = await res.json();
        if (j.detail) {
          if (Array.isArray(j.detail)) {
            msg = j.detail.map(d => `${d.loc?.join(".")}: ${d.msg}`).join("; ");
          } else if (typeof j.detail === "string") {
            msg = j.detail;
          } else if (typeof j.detail === "object") {
            msg = j.detail.error || j.detail.context || JSON.stringify(j.detail);
          } else {
            msg = String(j.detail);
          }
        } else if (j.message) {
          msg = j.message;
        }
      } catch {}
      throw new Error(msg);
    }
    return res.json();
  });
};

// ================== TRAINING ==================
export const triggerTrainAPI = () =>
  authFetch("/api/train", { method: "POST" });

export const getTrainStatusAPI = () =>
  authFetch("/api/train/status");

// ================== STATUS SISTEM ==================
export const getStatusAPI = () => authFetch("/api/status");

// ================== ATM MASTERS ==================
export const getAtmMastersAPI = ({ search, wilayah, unit_pengisian, limit = 20, offset = 0 } = {}) => {
  const params = new URLSearchParams({ limit, offset });
  if (search)          params.append("search", search);
  if (wilayah)         params.append("wilayah", wilayah);
  if (unit_pengisian)  params.append("unit_pengisian", unit_pengisian);
  return authFetch(`/api/atm-masters?${params.toString()}`);
};

export const getAtmMasterDetailAPI = (idAtm) =>
  authFetch(`/api/atm-masters/${idAtm}`);

export const createAtmMasterAPI = (data) =>
  authFetch("/api/atm-masters", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateAtmMasterAPI = (idAtm, data) =>
  authFetch(`/api/atm-masters/${idAtm}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const patchAtmMasterAPI = (idAtm, data) =>
  authFetch(`/api/atm-masters/${idAtm}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const deleteAtmMasterAPI = (idAtm) =>
  authFetch(`/api/atm-masters/${idAtm}`, { method: "DELETE" });

export const importAtmMastersAPI = (file) => {
  const token = getStoredToken();
  const form  = new FormData();
  form.append("file", file);
  return fetch(`${BASE_URL}/api/atm-masters/import`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
  }).then(async (res) => {
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const j = await res.json();
        msg = j.detail?.error || j.detail || j.message || JSON.stringify(j);
      } catch {}
      throw new Error(msg);
    }
    return res.json();
  });
};

// ================== AUTH ==================
export const loginAPI = (username, password) =>
  apiFetch("/api/auth/login", {
    method: "POST",
    body:   JSON.stringify({ username, password }),
  });

export const registerAPI = (data) =>
  apiFetch("/api/auth/register", {
    method: "POST",
    body:   JSON.stringify(data),
  });

export const getMeAPI = () => authFetch("/api/auth/me");

export const getUsersAPI = () =>
  authFetch("/api/auth/users");

export const getPendingUsersAPI = () =>
  authFetch("/api/auth/users/pending");

export const approveUserAPI = (userId) =>
  authFetch(`/api/auth/users/${userId}/approve`, { method: "PATCH" });

export const toggleUserAPI = (userId) =>
  authFetch(`/api/auth/users/${userId}/toggle`, { method: "PATCH" });

export const resetPasswordAPI = (userId, newPassword) =>
  authFetch(`/api/auth/users/${userId}/reset-password`, {
    method: "PATCH",
    body:   JSON.stringify({ new_password: newPassword }),
  });

export const registerByAdminAPI = (data) =>
  authFetch("/api/auth/register-by-admin", {
    method: "POST",
    body:   JSON.stringify(data),
  });

// ================== ACTIVITY LOG ==================
export const getActivityLogAPI = ({
  user_id,
  action,
  entity,
  date_from,
  date_to,
  limit  = 50,
  offset = 0,
} = {}) => {
  const params = new URLSearchParams({ limit, offset });
  if (user_id)   params.append("user_id",   user_id);
  if (action)    params.append("action",    action);
  if (entity)    params.append("entity",    entity);
  if (date_from) params.append("date_from", date_from);
  if (date_to)   params.append("date_to",   date_to);
  return authFetch(`/api/activity-log?${params.toString()}`);
};

export const getActivityStatsAPI = () =>
  authFetch("/api/activity-log/stats");

// ================== UPLOAD LOG ==================
export const getUploadLogAPI = (limit = 50) =>
  authFetch(`/api/upload-log?limit=${limit}`);

export const getUploadLogTodayAPI = () =>
  authFetch("/api/upload-log/today");

// ================== DASHBOARD ==================
export const getMasterVsMonitoringAPI = () =>
  authFetch("/api/dashboard/master-vs-monitoring");