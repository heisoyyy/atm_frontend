// src/pages/admin/AdminActivityLog.jsx
import { useState, useEffect, useCallback } from "react";

const API_BASE = import.meta.env?.VITE_API_URL || "http://localhost:8000";

function authHeader() {
  const token = localStorage.getItem("sipras_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Action Meta — disesuaikan dengan data di database ─────────────────────────
// key harus sama persis dengan nilai kolom `action` di tabel activity_log
const ACTION_META = {
  LOGIN:             { label: "Login",              color: "#38bdf8", page: "Autentikasi" },
  LOGOUT:            { label: "Logout",             color: "#94a3b8", page: "Autentikasi" },
  UPLOAD:            { label: "Upload Data",        color: "#34d399", page: "Upload Data" },
  CASHPLAN_ADD:      { label: "Tambah Cash Plan",   color: "#4ade80", page: "Cash Plan" },
  CASHPLAN_SELESAI:  { label: "Cash Plan Selesai",  color: "#4ade80", page: "Cash Plan" },
  CASHPLAN_BATAL:    { label: "Cash Plan Dibatal",  color: "#94a3b8", page: "Cash Plan" },
  CASHPLAN_DELETE:   { label: "Hapus Cash Plan",    color: "#f87171", page: "Cash Plan" },
  CASHPLAN_REMOVED:  { label: "Cash Plan Removed",  color: "#94a3b8",  page: "Cash Plan" },
  REKAP_UPDATE:      { label: "Edit Rekap",         color: "#a78bfa", page: "Rekap Replacement" },
  REKAP_UNLOCK:      { label: "Buka Kunci Rekap",   color: "#f59e0b", page: "Rekap Replacement" },
  USER_CREATE:       { label: "Buat User Baru",     color: "#4ade80", page: "Manajemen User" },
  USER_TOGGLE:       { label: "Ubah Status User",   color: "#f59e0b", page: "Manajemen User" },
  USER_ACTIVATE:     { label: "Aktifkan User",      color: "#4ade80", page: "Manajemen User" },
  USER_DEACTIVATE:   { label: "Nonaktifkan User",   color: "#f87171", page: "Manajemen User" },
  USER_APPROVE:      { label: "Verifikasi User",    color: "#4ade80",  page: "Manajemen User" },
  USER_RESET_PW:     { label: "Reset Password",     color: "#f59e0b", page: "Manajemen User" },
  NOTIF_APPROVE:     { label: "Setujui Notifikasi", color: "#38bdf8",  page: "Notifikasi" },
  NOTIF_DISMISS:     { label: "Tolak Notifikasi",   color: "#94a3b8",  page: "Notifikasi" },
};

// Peta entity (dari DB) → nama halaman yang ramah pengguna
const ENTITY_PAGE_MAP = {
  auth:               "Autentikasi",
  cashplan:           "Cash Plan",
  rekap_replacement:  "Rekap Replacement",
  rekap:              "Rekap Replacement",
  user:               "Manajemen User",
  data:               "Upload Data",
  notif:              "Notifikasi",
  upload:             "Upload Data",
};

// Ringkasan detail yang ramah pengguna per action
function buildDetailSummary(log) {
  const { action, detail, username } = log;
  if (!detail || typeof detail !== "object") return null;

  switch (action) {
    case "LOGIN":
      return `Login akun ${username || "—"}`;
    case "UPLOAD":
      return `${detail.filename || ""} · ${(detail.rows || 0).toLocaleString("id-ID")} baris · ${detail.atm_count || 0} ATM`;
    case "CASHPLAN_ADD":
      return `ATM ${detail.id_atm || "?"} · Saldo ${detail.saldo ? "Rp " + (detail.saldo / 1e6).toFixed(0) + " jt" : "—"} · ${detail.pct_saldo ? detail.pct_saldo + "%" : ""}`;
    case "CASHPLAN_SELESAI":
      return `Denom ${detail.denom || "—"}${detail.keterangan ? " · " + detail.keterangan : ""}`;
    case "CASHPLAN_BATAL":
    case "CASHPLAN_REMOVED":
      return detail.reason || detail.keterangan || "—";
    case "REKAP_UPDATE":
      return `Denom ${detail.denom ? "Rp " + Number(detail.denom).toLocaleString("id-ID") : "—"} · ${detail.tgl_isi || ""}`;
    case "USER_TOGGLE":
    case "USER_ACTIVATE":
    case "USER_DEACTIVATE":
      return `${detail.target_user || "?"} → ${detail.new_status === "active" ? "Aktif" : detail.new_status === "inactive" ? "Nonaktif" : detail.new_status || "—"}`;
    case "USER_CREATE":
      return `Username: ${detail.username || "?"}`;
    case "USER_RESET_PW":
      return `Target: ${detail.target_user || "?"}`;
    case "NOTIF_APPROVE":
    case "NOTIF_DISMISS":
      return `ATM ${detail.id_atm || "?"}`;
    default: {
      // fallback: tampilkan 2 field pertama
      const entries = Object.entries(detail).slice(0, 2);
      return entries.map(([k, v]) => `${k}: ${String(v).slice(0, 25)}`).join(" · ");
    }
  }
}

const fmtDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "medium" });
};

const fmtRelative = (iso) => {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "baru saja";
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hari lalu`;
};

// ═════════════════════════════════════════════════════════════════════════════
export default function AdminActivityLog({ showToast }) {
  const [logs,       setLogs]       = useState([]);
  const [summary,    setSummary]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [loadSum,    setLoadSum]    = useState(true);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(0);

  // Filters
  const [search,     setSearch]     = useState("");
  const [fAction,    setFAction]    = useState("");
  const [fEntity,    setFEntity]    = useState("");
  const [fStatus,    setFStatus]    = useState("");
  const [fDateFrom,  setFDateFrom]  = useState("");
  const [fDateTo,    setFDateTo]    = useState("");
  const [summDays,   setSummDays]   = useState(7);

  // Detail modal
  const [detail, setDetail] = useState(null);

  const LIMIT = 50;

  // ── Load logs ───────────────────────────────────────────────────────────────
  const loadLogs = useCallback(async (pg = 0) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit:  LIMIT,
        offset: pg * LIMIT,
        ...(fAction   && { action:    fAction }),
        ...(fEntity   && { entity:    fEntity }),
        ...(fStatus   && { status:    fStatus }),
        ...(fDateFrom && { date_from: fDateFrom }),
        ...(fDateTo   && { date_to:   fDateTo }),
        ...(search    && { username:  search }),
      });
      const res = await fetch(`${API_BASE}/api/activity-log?${params}`, {
        headers: authHeader(),
      });
      if (!res.ok) throw new Error("Gagal memuat activity log");
      const data = await res.json();
      setLogs(data.data || []);
      setTotal(data.total || 0);
    } catch (e) {
      showToast(e.message, "err");
    } finally {
      setLoading(false);
    }
  }, [fAction, fEntity, fStatus, fDateFrom, fDateTo, search]);

  // ── Load summary ─────────────────────────────────────────────────────────
  const loadSummary = useCallback(async () => {
    setLoadSum(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/activity-log/summary?days=${summDays}`,
        { headers: authHeader() }
      );
      if (!res.ok) throw new Error("Gagal memuat summary");
      setSummary(await res.json());
    } catch (e) {
      showToast(e.message, "err");
    } finally {
      setLoadSum(false);
    }
  }, [summDays]);

  useEffect(() => { loadLogs(0); setPage(0); }, [loadLogs]);
  useEffect(() => { loadSummary(); },           [loadSummary]);

  const totalPages = Math.ceil(total / LIMIT);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>

      {/* ── Summary Stats ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span style={s.sectionTitle}>Statistik Aktivitas</span>
          <div style={{ display: "flex", gap: 6 }}>
            {[7, 14, 30].map(d => (
              <button key={d} onClick={() => setSummDays(d)}
                style={{
                  ...s.dayBtn,
                  background: summDays === d ? "rgba(56,189,248,0.2)" : "rgba(255,255,255,0.04)",
                  border:     summDays === d ? "1px solid rgba(56,189,248,0.5)" : "1px solid rgba(255,255,255,0.1)",
                  color:      summDays === d ? "#38bdf8" : "#94a3b8",
                }}
              >{d}h</button>
            ))}
          </div>
          <button onClick={loadSummary} style={s.refreshBtn} disabled={loadSum}>↺</button>
        </div>

        {loadSum ? (
          <SummarySkeleton />
        ) : summary ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, marginBottom: 12 }}>
              {[
                { label: "Total Aksi",    value: summary.total_actions,    color: "#38bdf8" },
                { label: "User Aktif",    value: summary.active_users,     color: "#4ade80" },
                { label: "Upload",        value: summary.uploads,          color: "#34d399" },
                { label: "Cash Plan",     value: summary.cashplan_actions, color: "#f59e0b" },
                { label: "Rekap",         value: summary.rekap_actions,    color: "#a78bfa" },
                { label: "User Mgmt",     value: summary.user_actions,     color: "#60a5fa" },
                { label: "Error",         value: summary.errors,           color: "#f87171" },
              ].map(c => (
                <div key={c.label} style={{
                  background: "rgba(255,255,255,0.03)",
                  border: `1px solid ${c.color}22`,
                  borderRadius: 10, padding: "10px 12px", textAlign: "center",
                }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: c.color, fontFamily: "'IBM Plex Mono',monospace" }}>
                    {c.value ?? 0}
                  </div>
                  <div style={{ fontSize: 9, color: "#64748b", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                    {c.label}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div style={s.miniCard}>
                <div style={s.miniTitle}>Timeline {summDays} hari</div>
                <Timeline data={summary.timeline} />
              </div>
              <div style={s.miniCard}>
                <div style={s.miniTitle}>Top User Aktif</div>
                {(summary.by_user || []).slice(0, 7).map((u, i) => (
                  <div key={u.username} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ color: "#475569", fontSize: 10, width: 14, textAlign: "right" }}>{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                        <span style={{ fontSize: 11, color: "#e2e8f0", fontFamily: "monospace" }}>{u.username}</span>
                        <span style={{ fontSize: 10, color: "#38bdf8", fontFamily: "monospace" }}>{u.cnt}</span>
                      </div>
                      <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
                        <div style={{
                          width: `${Math.min((u.cnt / (summary.by_user[0]?.cnt || 1)) * 100, 100)}%`,
                          height: "100%", background: "#38bdf8", borderRadius: 2,
                        }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={s.miniCard}>
                <div style={s.miniTitle}>Top Aksi</div>
                {(summary.by_action || []).slice(0, 7).map((a, i) => {
                  const meta = ACTION_META[a.action] || { label: a.action, color: "#94a3b8", icon: "·" };
                  return (
                    <div key={a.action} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ color: "#475569", fontSize: 10, width: 14, textAlign: "right" }}>{i + 1}</span>
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4,
                        background: `${meta.color}18`, color: meta.color, border: `1px solid ${meta.color}30`,
                        whiteSpace: "nowrap",
                      }}>{meta.icon} {meta.label}</span>
                      <span style={{ marginLeft: "auto", fontSize: 10, color: meta.color, fontFamily: "monospace" }}>
                        {a.cnt}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* ── Filter Toolbar ──────────────────────────────────────────────────── */}
      <div style={s.toolbar}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="⌕  Cari username..."
          style={{ ...s.searchInput, width: 200 }}
        />

        {/* Filter Aksi — label bahasa Indonesia, value = key DB */}
        <select value={fAction} onChange={e => setFAction(e.target.value)} style={s.filterSelect}>
          <option value="">Semua Aksi</option>
          {Object.entries(ACTION_META).map(([key, meta]) => (
            <option key={key} value={key}>{meta.icon} {meta.label}</option>
          ))}
        </select>

        {/* Filter Halaman — menggunakan entity DB sebagai value */}
        <select value={fEntity} onChange={e => setFEntity(e.target.value)} style={s.filterSelect}>
          <option value="">Semua Halaman</option>
          {Object.entries(ENTITY_PAGE_MAP).map(([dbVal, pageName]) => (
            <option key={dbVal} value={dbVal}>{pageName}</option>
          ))}
        </select>

        <select value={fStatus} onChange={e => setFStatus(e.target.value)} style={s.filterSelect}>
          <option value="">Semua Status</option>
          <option value="ok">✓ Berhasil</option>
          <option value="error">✕ Error</option>
        </select>

        <input type="date" value={fDateFrom} onChange={e => setFDateFrom(e.target.value)} style={s.dateInput} title="Dari tanggal" />
        <span style={{ color: "#475569", fontSize: 11 }}>—</span>
        <input type="date" value={fDateTo}   onChange={e => setFDateTo(e.target.value)}   style={s.dateInput} title="Sampai tanggal" />

        <button
          onClick={() => { setSearch(""); setFAction(""); setFEntity(""); setFStatus(""); setFDateFrom(""); setFDateTo(""); }}
          style={s.clearBtn}
          title="Reset semua filter"
        >✕ Reset</button>

        <span style={{ color: "#94a3b8", fontSize: 12, fontFamily: "monospace", marginLeft: "auto" }}>
          {total.toLocaleString("id-ID")} log
        </span>
        <button onClick={() => loadLogs(page)} style={s.refreshBtn} disabled={loading}>↺</button>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      {loading ? <TableSkeleton /> : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {/* Kolom: Waktu | User | Role | Aksi | Halaman | Keterangan | Status */}
                {["Waktu", "User", "Role", "Aksi", "Halaman", "Keterangan", "Status"].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan={7} style={s.empty}>Tidak ada log ditemukan</td></tr>
              ) : logs.map((log, i) => {
                const meta   = ACTION_META[log.action] || { label: log.action, color: "#94a3b8", icon: "·" };
                const isErr  = log.status === "error";
                // Nama halaman dari entity
                const halaman = ENTITY_PAGE_MAP[log.entity] || log.entity || "—";
                // Ringkasan keterangan
                const keterangan = buildDetailSummary(log);

                return (
                  <tr
                    key={log.id}
                    onClick={() => setDetail(log)}
                    style={{
                      background: isErr
                        ? "rgba(248,113,113,0.04)"
                        : i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.012)",
                      cursor: "pointer",
                    }}
                    title="Klik untuk lihat detail lengkap"
                  >
                    {/* Waktu */}
                    <td style={s.td}>
                      <div style={{ fontSize: 11, color: "#e2e8f0", fontFamily: "monospace", whiteSpace: "nowrap" }}>
                        {fmtDate(log.created_at)}
                      </div>
                      <div style={{ fontSize: 9, color: "#475569", marginTop: 1 }}>
                        {fmtRelative(log.created_at)}
                      </div>
                    </td>

                    {/* User */}
                    <td style={s.td}>
                      <span style={{ fontSize: 12, color: "#38bdf8", fontFamily: "monospace", fontWeight: 600 }}>
                        {log.username || <span style={{ color: "#374151" }}>—</span>}
                      </span>
                    </td>

                    {/* Role */}
                    <td style={s.td}>
                      <RoleBadge role={log.role} />
                    </td>

                    {/* Aksi — label Indonesia yang jelas */}
                    <td style={s.td}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 5,
                        background: `${meta.color}18`, color: meta.color,
                        border: `1px solid ${meta.color}30`, whiteSpace: "nowrap",
                        display: "inline-flex", alignItems: "center", gap: 4,
                      }}>
                        <span style={{ fontSize: 13 }}>{meta.icon}</span>
                        {meta.label}
                      </span>
                    </td>

                    {/* Halaman */}
                    <td style={s.td}>
                      <span style={{
                        fontSize: 10, color: "#94a3b8",
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 4, padding: "2px 7px",
                        whiteSpace: "nowrap",
                      }}>
                        {halaman}
                      </span>
                    </td>

                    {/* Keterangan — ringkas dan mudah dibaca */}
                    <td style={{ ...s.td, maxWidth: 260 }}>
                      {keterangan ? (
                        <span style={{
                          fontSize: 11, color: "#cbd5e1",
                          display: "block", overflow: "hidden",
                          textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {keterangan}
                        </span>
                      ) : (
                        <span style={{ color: "#374151", fontSize: 10 }}>—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td style={s.td}>
                      {isErr ? (
                        <span style={s.badgeErr}>✕ Gagal</span>
                      ) : (
                        <span style={s.badgeOk}>✓ Berhasil</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ─────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, justifyContent: "center" }}>
          <button onClick={() => { setPage(0); loadLogs(0); }} disabled={page === 0} style={s.pgBtn}>«</button>
          <button onClick={() => { const p = page - 1; setPage(p); loadLogs(p); }} disabled={page === 0} style={s.pgBtn}>‹</button>
          <span style={{ color: "#94a3b8", fontSize: 12, fontFamily: "monospace" }}>
            {page + 1} / {totalPages}
          </span>
          <button onClick={() => { const p = page + 1; setPage(p); loadLogs(p); }} disabled={page >= totalPages - 1} style={s.pgBtn}>›</button>
          <button onClick={() => { const p = totalPages - 1; setPage(p); loadLogs(p); }} disabled={page >= totalPages - 1} style={s.pgBtn}>»</button>
        </div>
      )}

      {/* ── Detail Modal ───────────────────────────────────────────────────── */}
      {detail && (
        <DetailModal log={detail} onClose={() => setDetail(null)} />
      )}
    </div>
  );
}


// ── Sub-components ────────────────────────────────────────────────────────────

function Timeline({ data }) {
  if (!data || data.length === 0) {
    return <div style={{ color: "#475569", fontSize: 11, padding: "8px 0" }}>Tidak ada data</div>;
  }
  const max = Math.max(...data.map(d => d.cnt), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 48, padding: "4px 0" }}>
      {data.map(d => (
        <div key={d.tgl} title={`${d.tgl}: ${d.cnt} aksi`}
          style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <div style={{
            width: "100%", minHeight: 2,
            height: `${Math.max((d.cnt / max) * 40, 2)}px`,
            background: "linear-gradient(180deg, #38bdf8, #0ea5e9)",
            borderRadius: "2px 2px 0 0",
          }} />
          <span style={{ fontSize: 7, color: "#374151", writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
            {d.tgl.slice(5)}
          </span>
        </div>
      ))}
    </div>
  );
}

function RoleBadge({ role }) {
  const map = {
    admin:    ["#f59e0b", "rgba(245,158,11,0.1)"],
    operator: ["#60a5fa", "rgba(96,165,250,0.12)"],
    viewer:   ["#4ade80", "rgba(74,222,128,0.1)"],
  };
  const [c, bg] = map[role] || ["#94a3b8", "rgba(100,116,139,0.1)"];
  if (!role) return <span style={{ color: "#374151", fontSize: 10 }}>—</span>;
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4,
      background: bg, color: c, border: `1px solid ${c}33`, textTransform: "uppercase",
    }}>{role}</span>
  );
}

function DetailModal({ log, onClose }) {
  const meta    = ACTION_META[log.action] || { label: log.action, color: "#94a3b8", icon: "·" };
  const isErr   = log.status === "error";
  const halaman = ENTITY_PAGE_MAP[log.entity] || log.entity || "—";

  // Terjemahkan key detail payload ke bahasa Indonesia
  const detailKeyLabel = {
    method:       "Metode Login",
    rows:         "Jumlah Baris",
    matched:      "Baris Diproses",
    skipped:      "Baris Dilewati",
    filename:     "Nama File",
    atm_count:    "Jumlah ATM",
    saldo:        "Saldo",
    id_atm:       "ID ATM",
    added_by:     "Ditambahkan Oleh",
    pct_saldo:    "Persentase Saldo",
    denom:        "Denominasi",
    keterangan:   "Keterangan",
    new_status:   "Status Baru",
    target_user:  "User Target",
    tgl_isi:      "Tanggal Isi",
    jam_cash_in:  "Jam Cash In",
    jam_cash_out: "Jam Cash Out",
    username:     "Username",
    reason:       "Alasan",
  };

  const fmtDetailValue = (key, val) => {
    if (key === "saldo" && typeof val === "number")
      return `Rp ${val.toLocaleString("id-ID")}`;
    if (key === "new_status")
      return val === "active" ? "Aktif" : val === "inactive" ? "Nonaktif" : val;
    if (key === "added_by")
      return val === "auto" ? "Otomatis (sistem)" : val === "manual" ? "Manual (user)" : val;
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  };

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={{ ...s.modal, maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <span style={{
              fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 5,
              background: `${meta.color}18`, color: meta.color,
              border: `1px solid ${meta.color}30`,
              display: "inline-flex", alignItems: "center", gap: 5,
            }}>
              <span style={{ fontSize: 14 }}>{meta.icon}</span> {meta.label}
            </span>
            <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 6, fontFamily: "monospace" }}>
              {fmtDate(log.created_at)} · {fmtRelative(log.created_at)}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 20, cursor: "pointer" }}>×</button>
        </div>

        {/* Info grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Username",  value: log.username || "—" },
            { label: "Role",      value: log.role === "admin" ? "Admin" : log.role === "operator" ? "Operator" : log.role || "—" },
            { label: "Halaman",   value: halaman },
            { label: "Status",    value: log.status === "ok" ? "✓ Berhasil" : "✕ Gagal" },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: 9, color: "#475569", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 12, color: "#e2e8f0", fontFamily: "monospace" }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Detail payload — dengan label Indonesia */}
        {log.detail && Object.keys(log.detail).length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 9, color: "#475569", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
              Detail Aktivitas
            </div>
            <div style={{
              background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8, padding: "10px 14px",
            }}>
              {Object.entries(log.detail).map(([k, v]) => (
                <div key={k} style={{ display: "flex", gap: 10, marginBottom: 6, fontSize: 12 }}>
                  <span style={{ color: "#64748b", minWidth: 140 }}>
                    {detailKeyLabel[k] || k}
                  </span>
                  <span style={{ color: "#e2e8f0", fontFamily: "monospace", wordBreak: "break-all" }}>
                    {fmtDetailValue(k, v)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error message */}
        {isErr && log.error_msg && (
          <div style={{
            background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)",
            borderRadius: 8, padding: "10px 14px",
          }}>
            <div style={{ fontSize: 9, color: "#f87171", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
              Pesan Error
            </div>
            <div style={{ fontSize: 12, color: "#fca5a5", fontFamily: "monospace", wordBreak: "break-all" }}>
              {log.error_msg}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummarySkeleton() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
      {[...Array(7)].map((_, i) => (
        <div key={i} style={{ height: 60, background: `rgba(56,189,248,${0.02 + i * 0.005})`, borderRadius: 10 }} />
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div style={{ padding: "20px 0" }}>
      {[...Array(8)].map((_, i) => (
        <div key={i} style={{ height: 40, background: `rgba(56,189,248,${0.015 + i * 0.004})`, borderRadius: 4, marginBottom: 4 }} />
      ))}
    </div>
  );
}


// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  sectionTitle: {
    color: "#e2e8f0", fontSize: 13, fontWeight: 700,
    fontFamily: "'IBM Plex Mono',monospace",
  },
  dayBtn: {
    borderRadius: 6, fontSize: 11, fontWeight: 600,
    padding: "4px 10px", cursor: "pointer",
  },
  miniCard: {
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 10, padding: "12px 14px",
  },
  miniTitle: {
    fontSize: 9, color: "#475569", textTransform: "uppercase",
    letterSpacing: "0.1em", marginBottom: 10, fontFamily: "'IBM Plex Mono',monospace",
  },
  toolbar: {
    display: "flex", gap: 8, alignItems: "center",
    marginBottom: 14, flexWrap: "wrap",
  },
  searchInput: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(56,189,248,0.2)",
    borderRadius: 8, color: "#e2e8f0", padding: "7px 12px",
    fontSize: 12, outline: "none",
  },
  filterSelect: {
    background: "#0a0f1e",
    border: "1px solid rgba(56,189,248,0.15)",
    borderRadius: 8, color: "#e2e8f0", padding: "7px 10px",
    fontSize: 11, cursor: "pointer", outline: "none",
  },
  dateInput: {
    background: "#0a0f1e",
    border: "1px solid rgba(56,189,248,0.15)",
    borderRadius: 8, color: "#e2e8f0", padding: "7px 10px",
    fontSize: 11, outline: "none", cursor: "pointer",
  },
  clearBtn: {
    background: "rgba(248,113,113,0.08)",
    border: "1px solid rgba(248,113,113,0.2)",
    borderRadius: 8, color: "#f87171", padding: "7px 12px",
    fontSize: 11, cursor: "pointer", fontWeight: 600,
  },
  refreshBtn: {
    background: "rgba(56,189,248,0.08)",
    border: "1px solid rgba(56,189,248,0.2)",
    borderRadius: 8, color: "#38bdf8", padding: "7px 12px",
    fontSize: 14, cursor: "pointer",
  },
  tableWrap: {
    overflowX: "auto", borderRadius: 10,
    border: "1px solid rgba(56,189,248,0.08)",
    background: "rgba(5,11,24,0.6)",
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: {
    padding: "9px 12px", textAlign: "left", color: "#64748b",
    fontWeight: 700, fontSize: 9, letterSpacing: "0.1em",
    textTransform: "uppercase", whiteSpace: "nowrap",
    borderBottom: "1px solid rgba(56,189,248,0.1)",
    fontFamily: "'IBM Plex Mono',monospace", background: "rgba(0,0,0,0.2)",
  },
  td: {
    padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)",
    verticalAlign: "middle",
  },
  empty: { padding: "50px 20px", textAlign: "center", color: "#475569", fontSize: 13 },
  badgeOk: {
    fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
    background: "rgba(74,222,128,0.08)", color: "#4ade80",
    border: "1px solid rgba(74,222,128,0.2)", whiteSpace: "nowrap",
  },
  badgeErr: {
    fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
    background: "rgba(248,113,113,0.12)", color: "#f87171",
    border: "1px solid rgba(248,113,113,0.3)", whiteSpace: "nowrap",
  },
  pgBtn: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 6, color: "#94a3b8", padding: "5px 10px",
    fontSize: 12, cursor: "pointer",
  },
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
    backdropFilter: "blur(6px)", display: "flex",
    alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16,
  },
  modal: {
    background: "#080e1d", border: "1px solid rgba(56,189,248,0.2)",
    borderRadius: 16, padding: "24px 28px", width: 500,
    maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto",
  },
};