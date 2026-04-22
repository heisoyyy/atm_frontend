// src/pages/MonitoringHub.jsx
// Gabungan: Monitoring + Alerts + Wilayah — satu halaman dengan tab

import { useState, useEffect, useMemo } from "react";
import { apiFetch, fmt, STATUS_COLOR, STATUS_BG } from "../utils/api";

const THR_BONGKAR = 20;
const THR_AWAS    = 30;
const THR_TRIGGER = 35;

const TABS = [
  { id: "monitoring", label: "Monitoring",   icon: "⬡" },
  { id: "alerts",     label: "Alerts",       icon: "⚠" },
  { id: "wilayah",    label: "Peta Wilayah", icon: "◉" },
];

export default function MonitoringHub({ navigateTo }) {
  const [activeTab,  setActiveTab]  = useState("monitoring");
  const [alertCount, setAlertCount] = useState(null);

  useEffect(() => {
    apiFetch("/api/alerts")
      .then(r => setAlertCount((r.data || []).length))
      .catch(() => {});
  }, []);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ color: "#e2e8f0", fontSize: 24, fontWeight: 700, margin: "0 0 4px", letterSpacing: "-0.02em" }}>
          Monitoring & Wilayah
        </h1>
        <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>Status real-time ATM BRK Syariah</p>
      </div>

      <div style={{
        display: "flex", gap: 4, marginBottom: 24,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(99,179,237,0.08)",
        borderRadius: 12, padding: 4, width: "fit-content",
      }}>
        {TABS.map(tab => {
          const isActive  = activeTab === tab.id;
          const showBadge = tab.id === "alerts" && alertCount > 0;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              background:   isActive ? "rgba(59,130,246,0.18)" : "transparent",
              border:       isActive ? "1px solid rgba(59,130,246,0.35)" : "1px solid transparent",
              borderRadius: 9, color: isActive ? "#60a5fa" : "#64748b",
              padding: "8px 20px", fontSize: 13, fontWeight: isActive ? 600 : 400,
              cursor: "pointer", transition: "all 0.15s",
              display: "flex", alignItems: "center", gap: 7,
            }}>
              <span style={{ fontSize: 14 }}>{tab.icon}</span>
              {tab.label}
              {showBadge && (
                <span style={{
                  background: "#E24B4A", color: "#fff",
                  fontSize: 10, fontWeight: 700,
                  padding: "1px 5px", borderRadius: 99, lineHeight: 1.4,
                }}>{alertCount}</span>
              )}
            </button>
          );
        })}
      </div>

      {activeTab === "monitoring" && <TabMonitoring navigateTo={navigateTo} />}
      {activeTab === "alerts"     && <TabAlerts     navigateTo={navigateTo} />}
      {activeTab === "wilayah"    && <TabWilayah    navigateTo={navigateTo} />}

      <style>{`
        @keyframes spin         { to { transform: rotate(360deg); } }
        @keyframes pulse-border {
          0%,100% { border-color: rgba(226,75,74,0.2); }
          50%      { border-color: rgba(226,75,74,0.5); }
        }
      `}</style>
    </div>
  );
}

// ═══ TAB 1 – MONITORING ═══════════════════════════════════
const WILAYAH_LIST = ["Semua", "Pekanbaru", "Batam", "Dumai", "Tanjung Pinang"];
const STATUS_LIST  = ["Semua", "BONGKAR", "AWAS", "PERLU PANTAU", "AMAN", "OVERFUND"];
const TIPE_LIST    = ["Semua", "EMV", "CRM"];

function TabMonitoring({ navigateTo }) {
  const [data,     setData]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [wilayah,  setWilayah]  = useState("Semua");
  const [status,   setStatus]   = useState("Semua");
  const [tipe,     setTipe]     = useState("Semua");
  const [sort,     setSort]     = useState({ key: "skor_urgensi", dir: -1 });
  const [page,     setPage]     = useState(0);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    apiFetch("/api/predictions?limit=500")
      .then(r => { setData(r.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let d = data;
    if (wilayah !== "Semua") d = d.filter(r => r.wilayah === wilayah);
    if (status  !== "Semua") d = d.filter(r => r.status  === status);
    if (tipe    !== "Semua") d = d.filter(r => r.tipe    === tipe);
    if (search) {
      const q = search.toLowerCase();
      d = d.filter(r => r.id_atm?.toLowerCase().includes(q) || r.lokasi?.toLowerCase().includes(q));
    }
    return [...d].sort((a, b) => {
      const va = a[sort.key] ?? 0, vb = b[sort.key] ?? 0;
      return sort.dir * (va > vb ? 1 : va < vb ? -1 : 0);
    });
  }, [data, wilayah, status, tipe, search, sort]);

  const paged   = pageSize === "all" ? filtered : filtered.slice(page * pageSize, (page + 1) * pageSize);
  const maxPage = pageSize === "all" ? 1 : Math.ceil(filtered.length / pageSize);
  const toggleSort = (key) => { setSort(s => ({ key, dir: s.key === key ? -s.dir : -1 })); setPage(0); };

  const counts = useMemo(() => {
    const c = { BONGKAR: 0, AWAS: 0, "PERLU PANTAU": 0, AMAN: 0, OVERFUND: 0 };
    data.forEach(r => { if (c[r.status] !== undefined) c[r.status]++; });
    return c;
  }, [data]);

  if (loading) return <Spinner label="Memuat data ATM..." />;

  const SortIcon = ({ k }) => {
    if (sort.key !== k) return <span style={{ opacity: 0.3, marginLeft: 4 }}>⇅</span>;
    return <span style={{ marginLeft: 4, color: "#60a5fa" }}>{sort.dir > 0 ? "↑" : "↓"}</span>;
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>
          {filtered.length} dari {data.length} ATM ditampilkan
        </p>
      </div>

      {/* Status Summary Bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { key: "BONGKAR",      color: "#E24B4A", bg: "rgba(226,75,74,0.1)",    border: "rgba(226,75,74,0.3)",    desc: "≤" + THR_BONGKAR + "%" },
          { key: "AWAS",         color: "#EF9F27", bg: "rgba(239,159,39,0.1)",   border: "rgba(239,159,39,0.3)",   desc: THR_BONGKAR + "–" + THR_AWAS + "%" },
          { key: "PERLU PANTAU", color: "#d4b800", bg: "rgba(212,184,0,0.08)",   border: "rgba(212,184,0,0.3)",    desc: THR_AWAS + "–" + THR_TRIGGER + "%" },
          { key: "AMAN",         color: "#1D9E75", bg: "rgba(29,158,117,0.08)",  border: "rgba(29,158,117,0.25)",  desc: ">" + THR_TRIGGER + "%" },
          { key: "OVERFUND",     color: "#7F77DD", bg: "rgba(127,119,221,0.08)", border: "rgba(127,119,221,0.25)", desc: ">100%" },
        ].map(s => (
          <button key={s.key}
            onClick={() => { setStatus(status === s.key ? "Semua" : s.key); setPage(0); }}
            style={{
              background: status === s.key ? s.bg : "rgba(255,255,255,0.02)",
              border: "1px solid " + (status === s.key ? s.border : "rgba(99,179,237,0.08)"),
              borderRadius: 8, padding: "8px 14px", cursor: "pointer", transition: "all 0.15s",
              display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2,
            }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: s.color, fontSize: 18, fontWeight: 700, lineHeight: 1 }}>{counts[s.key] ?? 0}</span>
              <span style={{ color: s.color, fontSize: 11, fontWeight: 600 }}>{s.key}</span>
            </div>
            <span style={{ color: "#475569", fontSize: 10 }}>{s.desc}</span>
          </button>
        ))}
        {status !== "Semua" && (
          <button onClick={() => { setStatus("Semua"); setPage(0); }} style={{
            background: "transparent", border: "1px solid rgba(99,179,237,0.12)",
            borderRadius: 8, padding: "8px 12px", color: "#64748b", fontSize: 11, cursor: "pointer",
          }}>✕ Reset filter</button>
        )}
      </div>

      {/* Search & Filter */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input placeholder="Cari ID ATM atau lokasi..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          style={{
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(99,179,237,0.15)",
            borderRadius: 8, color: "#e2e8f0", padding: "8px 14px", fontSize: 13, width: 220, outline: "none",
          }}
        />
        {[
          { label: "Wilayah", val: wilayah, set: setWilayah, opts: WILAYAH_LIST },
          { label: "Status",  val: status,  set: setStatus,  opts: STATUS_LIST },
          { label: "Tipe",    val: tipe,    set: setTipe,    opts: TIPE_LIST },
        ].map(f => (
          <select key={f.label} value={f.val} onChange={e => { f.set(e.target.value); setPage(0); }}
            style={{
              background: "#0d1228", border: "1px solid rgba(99,179,237,0.15)",
              borderRadius: 8, color: "#94a3b8", padding: "8px 12px", fontSize: 13, cursor: "pointer", outline: "none",
            }}>
            {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#64748b", fontSize: 12 }}>Tampilkan:</span>
          <div style={{ display: "flex", gap: 4 }}>
            {[10, 50, 100, "all"].map(v => (
              <button key={v} onClick={() => { setPageSize(v); setPage(0); }} style={{
                padding: "5px 10px", borderRadius: 6,
                border:     pageSize === v ? "1px solid rgba(59,130,246,0.4)"  : "1px solid rgba(99,179,237,0.12)",
                background: pageSize === v ? "rgba(59,130,246,0.15)"           : "rgba(255,255,255,0.02)",
                color:      pageSize === v ? "#60a5fa"                         : "#64748b",
                fontSize: 12, fontWeight: pageSize === v ? 700 : 400,
                cursor: "pointer", transition: "all 0.15s",
              }}>
                {v === "all" ? "Semua" : v}
              </button>
            ))}
          </div>
          <span style={{ color: "#475569", fontSize: 12 }}>
            {pageSize === "all"
              ? filtered.length + " ATM"
              : (page * pageSize + 1) + "–" + Math.min((page + 1) * pageSize, filtered.length) + " / " + filtered.length
            }
          </span>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(99,179,237,0.08)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(99,179,237,0.1)" }}>
                {[
                  { label: "Ranking",    key: "ranking" },
                  { label: "ID ATM",     key: "id_atm" },
                  { label: "Lokasi",     key: "lokasi" },
                  { label: "Wilayah",    key: "wilayah" },
                  { label: "Saldo",      key: "saldo" },
                  { label: "% Saldo",    key: "pct_saldo" },
                  { label: "Est. Habis", key: "est_jam" },
                  { label: "Tgl Isi",    key: "tgl_isi" },
                  { label: "Status",     key: "status" },
                  { label: "Skor",       key: "skor_urgensi" },
                ].map(col => (
                  <th key={col.key} onClick={() => toggleSort(col.key)} style={{
                    padding: "12px 14px", textAlign: "left",
                    color: sort.key === col.key ? "#60a5fa" : "#64748b",
                    fontWeight: 600, fontSize: 11, letterSpacing: "0.08em",
                    textTransform: "uppercase", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap",
                  }}>
                    {col.label}<SortIcon k={col.key} />
                  </th>
                ))}
                <th style={{ padding: "12px 14px", color: "#64748b", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={11} style={{ padding: "40px 20px", textAlign: "center", color: "#64748b", fontSize: 13 }}>Tidak ada ATM yang sesuai filter</td></tr>
              ) : paged.map((row, i) => {
                const sc        = STATUS_COLOR[row.status] || "#6b7280";
                const sb        = STATUS_BG[row.status]   || "transparent";
                const rowBg     = i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)";
                const isBongkar = row.status === "BONGKAR";
                const isAwas    = row.status === "AWAS";
                return (
                  <tr key={row.id_atm} style={{
                    background:   isBongkar ? "rgba(226,75,74,0.04)" : isAwas ? "rgba(239,159,39,0.03)" : rowBg,
                    borderBottom: "1px solid rgba(99,179,237,0.04)", transition: "background 0.1s",
                    borderLeft:   isBongkar ? "2px solid rgba(226,75,74,0.5)" : isAwas ? "2px solid rgba(239,159,39,0.4)" : "2px solid transparent",
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(59,130,246,0.06)"}
                    onMouseLeave={e => e.currentTarget.style.background = isBongkar ? "rgba(226,75,74,0.04)" : isAwas ? "rgba(239,159,39,0.03)" : rowBg}
                  >
                    <td style={{ padding: "10px 14px", color: "#64748b" }}>#{row.ranking}</td>
                    <td style={{ padding: "10px 14px", fontWeight: 600, color: "#e2e8f0", fontFamily: "monospace" }}>
                      {row.id_atm}
                      {row.atm_sepi && <span style={{ marginLeft: 6, fontSize: 9, color: "#7F77DD", background: "rgba(127,119,221,0.1)", padding: "1px 5px", borderRadius: 3 }}>SEPI</span>}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#94a3b8", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.lokasi}>{row.lokasi || "-"}</td>
                    <td style={{ padding: "10px 14px", color: "#94a3b8" }}>{row.wilayah || "-"}</td>
                    <td style={{ padding: "10px 14px", color: "#e2e8f0", fontWeight: 600 }}>{fmt.rupiah(row.saldo)}</td>
                    <td style={{ padding: "10px 14px" }}><SaldoBar pct={row.pct_saldo} /></td>
                    <td style={{ padding: "10px 14px", color: row.est_jam != null && row.est_jam < 24 ? "#E24B4A" : "#94a3b8", fontWeight: row.est_jam != null && row.est_jam < 24 ? 600 : 400 }}>
                      {fmt.jam(row.est_jam)}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#94a3b8", fontSize: 12 }}>
                      {row.tgl_isi ? row.tgl_isi + " " + (row.jam_isi || "") : "-"}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 5, background: sb, color: sc, whiteSpace: "nowrap", border: "1px solid " + sc + "33" }}>
                        {row.status}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 36, height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2 }}>
                          <div style={{ height: "100%", width: Math.min(row.skor_urgensi || 0, 100) + "%", background: sc, borderRadius: 2 }} />
                        </div>
                        <span style={{ color: sc, fontSize: 12, fontWeight: 600, minWidth: 28 }}>{row.skor_urgensi?.toFixed(0) ?? "-"}</span>
                      </div>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <button onClick={() => navigateTo("history", row.id_atm)} style={{
                        background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)",
                        borderRadius: 6, color: "#60a5fa", padding: "4px 10px", fontSize: 11, cursor: "pointer", fontWeight: 600,
                      }}>Detail</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {maxPage > 1 && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 20px", borderTop: "1px solid rgba(99,179,237,0.08)",
            flexWrap: "wrap", gap: 10,
          }}>
            <span style={{ color: "#64748b", fontSize: 12 }}>
              Halaman <strong style={{ color: "#94a3b8" }}>{page + 1}</strong> dari <strong style={{ color: "#94a3b8" }}>{maxPage}</strong>
              {" · "}<strong style={{ color: "#94a3b8" }}>{filtered.length}</strong> ATM
            </span>
            <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
              <NavBtn disabled={page === 0}           onClick={() => setPage(0)}           title="Halaman pertama">«</NavBtn>
              <NavBtn disabled={page === 0}           onClick={() => setPage(p => p - 1)}  title="Sebelumnya">‹</NavBtn>
              {buildPageRange(page, maxPage).map((p_, idx) =>
                p_ === "…" ? (
                  <span key={"e" + idx} style={{ color: "#475569", padding: "0 4px", fontSize: 13, userSelect: "none" }}>…</span>
                ) : (
                  <button key={p_} onClick={() => setPage(p_)} style={{
                    minWidth: 32, height: 32, borderRadius: 6,
                    border:     p_ === page ? "1px solid rgba(59,130,246,0.5)"  : "1px solid rgba(99,179,237,0.12)",
                    background: p_ === page ? "rgba(59,130,246,0.2)"            : "rgba(255,255,255,0.02)",
                    color:      p_ === page ? "#60a5fa"                         : "#64748b",
                    fontSize: 12, fontWeight: p_ === page ? 700 : 400,
                    cursor: "pointer", padding: "0 6px", transition: "all 0.15s",
                  }}
                    onMouseEnter={e => { if (p_ !== page) { e.currentTarget.style.background = "rgba(59,130,246,0.08)"; e.currentTarget.style.color = "#94a3b8"; } }}
                    onMouseLeave={e => { if (p_ !== page) { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.color = "#64748b"; } }}
                  >{p_ + 1}</button>
                )
              )}
              <NavBtn disabled={page >= maxPage - 1} onClick={() => setPage(p => p + 1)}  title="Berikutnya">›</NavBtn>
              <NavBtn disabled={page >= maxPage - 1} onClick={() => setPage(maxPage - 1)} title="Halaman terakhir">»</NavBtn>
            </div>
          </div>
        )}
      </div>

      <div style={{
        marginTop: 16, padding: "10px 16px",
        background: "rgba(255,255,255,0.02)", border: "1px solid rgba(99,179,237,0.06)",
        borderRadius: 8, display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center",
      }}>
        <span style={{ color: "#475569", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Threshold:</span>
        {[
          { label: "BONGKAR",      color: "#E24B4A", desc: "≤ " + THR_BONGKAR + "%" },
          { label: "AWAS",         color: "#EF9F27", desc: THR_BONGKAR + "–" + THR_AWAS + "%" },
          { label: "PERLU PANTAU", color: "#d4b800", desc: THR_AWAS + "–" + THR_TRIGGER + "%" },
          { label: "AMAN",         color: "#1D9E75", desc: "> " + THR_TRIGGER + "%" },
        ].map(s => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, display: "inline-block" }} />
            <span style={{ color: s.color, fontSize: 11, fontWeight: 600 }}>{s.label}</span>
            <span style={{ color: "#475569", fontSize: 11 }}>{s.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══ TAB 2 – ALERTS ══════════════════════════════════════
const LEVEL_TABS = ["Semua", "BONGKAR", "AWAS", "PERLU PANTAU"];

function TabAlerts({ navigateTo }) {
  const [alerts,  setAlerts]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [level,   setLevel]   = useState("Semua");
  const [ts,      setTs]      = useState(null);

  const fetchAlerts = () => {
    setLoading(true);
    const fetchPromise = (level === "BONGKAR" || level === "AWAS")
      ? apiFetch("/api/alerts?level=" + encodeURIComponent(level))
      : level === "PERLU PANTAU"
        ? apiFetch("/api/predictions?status=PERLU+PANTAU&limit=500").then(r => ({
            data: r.data || [], generated_at: r.generated_at,
          }))
        : apiFetch("/api/alerts");

    fetchPromise
      .then(r => {
        let data = r.data || [];
        if (level === "Semua") {
          return apiFetch("/api/predictions?status=PERLU+PANTAU&limit=500")
            .then(pp => {
              const combined = [...data, ...(pp.data || [])];
              combined.sort((a, b) => (b.skor_urgensi || 0) - (a.skor_urgensi || 0));
              setAlerts(combined); setTs(r.generated_at); setLoading(false);
            })
            .catch(() => { setAlerts(data); setTs(r.generated_at); setLoading(false); });
        }
        setAlerts(data); setTs(r.generated_at); setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchAlerts(); }, [level]);

  const breakdown = {
    BONGKAR:        alerts.filter(a => a.status === "BONGKAR").length,
    AWAS:           alerts.filter(a => a.status === "AWAS").length,
    "PERLU PANTAU": alerts.filter(a => a.status === "PERLU PANTAU").length,
  };

  if (loading) return <Spinner label="Memuat data alerts..." />;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>
          {alerts.length} ATM perlu perhatian
          {ts && <span> · {new Date(ts).toLocaleString("id-ID")}</span>}
        </p>
        <button onClick={fetchAlerts} style={{
          background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)",
          borderRadius: 8, color: "#60a5fa", padding: "7px 14px", fontSize: 12, cursor: "pointer", fontWeight: 600,
        }}>↺ Refresh</button>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        {[
          { key: "BONGKAR",      color: "#E24B4A", bg: "rgba(226,75,74,0.1)",  border: "rgba(226,75,74,0.3)",  desc: "≤" + THR_BONGKAR + "%" },
          { key: "AWAS",         color: "#EF9F27", bg: "rgba(239,159,39,0.1)", border: "rgba(239,159,39,0.3)", desc: THR_BONGKAR + "–" + THR_AWAS + "%" },
          { key: "PERLU PANTAU", color: "#d4b800", bg: "rgba(212,184,0,0.08)", border: "rgba(212,184,0,0.3)",  desc: THR_AWAS + "–" + THR_TRIGGER + "%" },
        ].map(s => (
          <div key={s.key} style={{ background: s.bg, border: "1px solid " + s.border, borderRadius: 8, padding: "8px 14px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: s.color, fontSize: 20, fontWeight: 700 }}>{breakdown[s.key]}</span>
            <div>
              <div style={{ color: s.color, fontSize: 11, fontWeight: 600 }}>{s.key}</div>
              <div style={{ color: "#475569", fontSize: 10 }}>{s.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
        {LEVEL_TABS.map(l => (
          <button key={l} onClick={() => setLevel(l)} style={{
            background: level === l ? "rgba(59,130,246,0.15)" : "transparent",
            border:     level === l ? "1px solid rgba(59,130,246,0.3)" : "1px solid rgba(99,179,237,0.1)",
            borderRadius: 8, color: level === l ? "#60a5fa" : "#64748b",
            padding: "6px 14px", fontSize: 12, cursor: "pointer", fontWeight: level === l ? 600 : 400,
          }}>{l}</button>
        ))}
      </div>

      {alerts.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 260, color: "#64748b", gap: 10, background: "rgba(0,229,160,0.04)", border: "1px solid rgba(0,229,160,0.1)", borderRadius: 12 }}>
          <span style={{ fontSize: 36 }}>✓</span>
          <span style={{ color: "#00e5a0", fontWeight: 600, fontSize: 15 }}>Tidak ada alert saat ini</span>
          <span style={{ fontSize: 12 }}>Semua ATM dalam kondisi aman</span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {alerts.map((atm, i) => <AlertCard key={atm.id_atm} atm={atm} rank={i + 1} navigateTo={navigateTo} />)}
        </div>
      )}
    </div>
  );
}

// ═══ TAB 3 – WILAYAH ═════════════════════════════════════
function TabWilayah({ navigateTo }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [active,  setActive]  = useState(null);
  const [search,  setSearch]  = useState("");

  useEffect(() => {
    apiFetch("/api/wilayah")
      .then(r => {
        setData(r); setLoading(false);
        const keys = Object.keys(r.data || {});
        if (keys.length > 0) setActive(keys[0]);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <Spinner label="Memuat data wilayah..." />;
  if (!data)   return <div style={{ color: "#E24B4A", padding: 20 }}>Gagal memuat data wilayah.</div>;

  const wilayahList = data.wilayah_list || [];
  const allAtms     = active ? (data.data[active] || []) : [];
  const atmList     = search
    ? allAtms.filter(a => a.id_atm?.toLowerCase().includes(search.toLowerCase()) || a.lokasi?.toLowerCase().includes(search.toLowerCase()))
    : allAtms;
  const sortedAtms  = [...atmList].sort((a, b) => (b.skor_urgensi || 0) - (a.skor_urgensi || 0));

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {wilayahList.map(w => {
          const atms     = data.data[w] || [];
          const bongkar  = atms.filter(a => a.status === "BONGKAR").length;
          const awas     = atms.filter(a => a.status === "AWAS").length;
          const pantau   = atms.filter(a => a.status === "PERLU PANTAU").length;
          const isActive = active === w;
          return (
            <button key={w} onClick={() => { setActive(w); setSearch(""); }} style={{
              background: isActive ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.02)",
              border: isActive ? "1px solid rgba(59,130,246,0.4)" : bongkar > 0 ? "1px solid rgba(226,75,74,0.3)" : "1px solid rgba(99,179,237,0.08)",
              borderRadius: 10, padding: "9px 18px", cursor: "pointer", transition: "all 0.15s", textAlign: "left",
            }}>
              <div style={{ color: isActive ? "#60a5fa" : "#94a3b8", fontWeight: 700, fontSize: 13 }}>{w}</div>
              <div style={{ fontSize: 11, marginTop: 3, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={{ color: "#64748b" }}>{atms.length} ATM</span>
                {bongkar > 0 && <span style={{ color: "#E24B4A", fontWeight: 600 }}>⚠ {bongkar}</span>}
                {awas    > 0 && <span style={{ color: "#EF9F27", fontWeight: 600 }}>⊕ {awas}</span>}
                {pantau  > 0 && <span style={{ color: "#d4b800", fontWeight: 600 }}>◎ {pantau}</span>}
                {bongkar === 0 && awas === 0 && pantau === 0 && <span style={{ color: "#1D9E75" }}>✓ Aman</span>}
              </div>
            </button>
          );
        })}
      </div>

      {active && (
        <>
          <div style={{ display: "flex", gap: 12, marginBottom: 14, padding: "10px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(99,179,237,0.06)", borderRadius: 10, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600 }}>{active}</span>
            <span style={{ color: "#475569" }}>—</span>
            {[
              { label: "Total",        value: allAtms.length,                                          color: "#94a3b8" },
              { label: "BONGKAR",      value: allAtms.filter(a => a.status === "BONGKAR").length,      color: "#E24B4A" },
              { label: "AWAS",         value: allAtms.filter(a => a.status === "AWAS").length,         color: "#EF9F27" },
              { label: "PERLU PANTAU", value: allAtms.filter(a => a.status === "PERLU PANTAU").length, color: "#d4b800" },
              { label: "AMAN",         value: allAtms.filter(a => a.status === "AMAN").length,         color: "#1D9E75" },
              { label: "ATM Sepi",     value: allAtms.filter(a => a.atm_sepi).length,                  color: "#7F77DD" },
            ].map(s => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ color: s.color, fontSize: 14, fontWeight: 700 }}>{s.value}</span>
                <span style={{ color: "#475569", fontSize: 10 }}>{s.label}</span>
              </div>
            ))}
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari ID / lokasi..."
              style={{ marginLeft: "auto", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(99,179,237,0.15)", borderRadius: 7, color: "#e2e8f0", padding: "6px 12px", fontSize: 12, outline: "none", width: 180 }}
            />
          </div>

          <div style={{ display: "flex", gap: 14, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ color: "#475569", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Threshold:</span>
            {[
              { label: "BONGKAR",      color: "#E24B4A", desc: "≤" + THR_BONGKAR + "%" },
              { label: "AWAS",         color: "#EF9F27", desc: THR_BONGKAR + "–" + THR_AWAS + "%" },
              { label: "PERLU PANTAU", color: "#d4b800", desc: THR_AWAS + "–" + THR_TRIGGER + "%" },
              { label: "AMAN",         color: "#1D9E75", desc: ">" + THR_TRIGGER + "%" },
            ].map(s => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.color, display: "inline-block" }} />
                <span style={{ color: s.color, fontSize: 10, fontWeight: 600 }}>{s.label}</span>
                <span style={{ color: "#475569", fontSize: 10 }}>{s.desc}</span>
              </div>
            ))}
          </div>

          {sortedAtms.length === 0 ? (
            <div style={{ color: "#64748b", padding: "40px 20px", textAlign: "center", fontSize: 13 }}>Tidak ada ATM yang sesuai pencarian.</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
              {sortedAtms.map(atm => <AtmCard key={atm.id_atm} atm={atm} navigateTo={navigateTo} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ═══ SHARED COMPONENTS ════════════════════════════════════
function AtmCard({ atm, navigateTo }) {
  const sc        = STATUS_COLOR[atm.status] || "#6b7280";
  const isBongkar = atm.status === "BONGKAR";
  const isAwas    = atm.status === "AWAS";
  const isPantau  = atm.status === "PERLU PANTAU";
  const barColor  = atm.pct_saldo <= THR_BONGKAR ? "#E24B4A" : atm.pct_saldo <= THR_AWAS ? "#EF9F27" : atm.pct_saldo <= THR_TRIGGER ? "#d4b800" : "#1D9E75";

  return (
    <button onClick={() => navigateTo && navigateTo("history", atm.id_atm)} style={{
      background: isBongkar ? "rgba(226,75,74,0.04)" : isAwas ? "rgba(239,159,39,0.03)" : "rgba(255,255,255,0.02)",
      border: isBongkar ? "1px solid rgba(226,75,74,0.3)" : isAwas ? "1px solid rgba(239,159,39,0.2)" : isPantau ? "1px solid rgba(212,184,0,0.15)" : "1px solid rgba(99,179,237,0.08)",
      borderLeft: "3px solid " + sc, borderRadius: 10, padding: "12px 14px", cursor: "pointer", textAlign: "left", transition: "all 0.15s",
    }}
      onMouseEnter={e => { e.currentTarget.style.background = "rgba(59,130,246,0.06)"; e.currentTarget.style.borderColor = "rgba(59,130,246,0.25)"; }}
      onMouseLeave={e => {
        e.currentTarget.style.background  = isBongkar ? "rgba(226,75,74,0.04)" : isAwas ? "rgba(239,159,39,0.03)" : "rgba(255,255,255,0.02)";
        e.currentTarget.style.borderColor = isBongkar ? "rgba(226,75,74,0.3)"  : isAwas ? "rgba(239,159,39,0.2)"  : "rgba(99,179,237,0.08)";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 13, fontFamily: "monospace" }}>{atm.id_atm}</span>
        <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4, background: sc + "18", color: sc }}>{atm.tipe || "-"}</span>
      </div>
      <div style={{ color: "#64748b", fontSize: 11, marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{atm.lokasi || "-"}</div>
      <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, marginBottom: 6 }}>
        <div style={{ height: "100%", width: Math.min(atm.pct_saldo || 0, 100) + "%", background: barColor, borderRadius: 2, transition: "width 0.3s" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: barColor, fontSize: 11, fontWeight: 600 }}>{atm.pct_saldo?.toFixed(0) ?? "-"}%</span>
        <span style={{ color: sc, fontSize: 10, fontWeight: 600, padding: "1px 6px", background: sc + "12", borderRadius: 3 }}>{atm.status}</span>
      </div>
      <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
        {atm.atm_sepi && <span style={{ color: "#7F77DD", fontSize: 9, fontWeight: 600, background: "rgba(127,119,221,0.1)", padding: "1px 5px", borderRadius: 3, border: "1px solid rgba(127,119,221,0.2)" }}>◐ SEPI</span>}
        {atm.skor_urgensi > 70 && <span style={{ color: "#E24B4A", fontSize: 9, fontWeight: 600, background: "rgba(226,75,74,0.08)", padding: "1px 5px", borderRadius: 3 }}>URGENSI {atm.skor_urgensi?.toFixed(0)}</span>}
      </div>
    </button>
  );
}

function AlertCard({ atm, rank, navigateTo }) {
  const sc        = STATUS_COLOR[atm.status] || "#6b7280";
  const sb        = STATUS_BG[atm.status]    || "transparent";
  const isBongkar = atm.status === "BONGKAR";
  const isAwas    = atm.status === "AWAS";
  return (
    <div style={{
      background: isBongkar ? "rgba(226,75,74,0.04)" : isAwas ? "rgba(239,159,39,0.03)" : "rgba(255,255,255,0.02)",
      border: "1px solid " + (isBongkar ? "rgba(226,75,74,0.25)" : isAwas ? "rgba(239,159,39,0.15)" : "rgba(99,179,237,0.08)"),
      borderLeft: "3px solid " + sc, borderRadius: 12, padding: "14px 18px",
      display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap", transition: "all 0.15s",
      animation: isBongkar ? "pulse-border 2s infinite" : "none",
    }}>
      <div style={{ textAlign: "center", minWidth: 40 }}>
        <div style={{ color: "#64748b", fontSize: 10 }}>#{rank}</div>
        <div style={{ color: sc, fontSize: 20, marginTop: 4 }}>{isBongkar ? "⚠" : isAwas ? "⊕" : "◎"}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
          <span style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 14, fontFamily: "monospace" }}>{atm.id_atm}</span>
          <span style={{ background: sb, color: sc, fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4, border: "1px solid " + sc + "33" }}>{atm.status}</span>
          {atm.tipe && <span style={{ color: "#64748b", fontSize: 11 }}>{atm.tipe}</span>}
          {atm.atm_sepi && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "rgba(127,119,221,0.12)", color: "#7F77DD", border: "1px solid rgba(127,119,221,0.25)", fontWeight: 600 }}>◐ SEPI</span>}
        </div>
        <div style={{ color: "#64748b", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          📍 {atm.lokasi || "-"} · {atm.wilayah || "-"}
        </div>
      </div>
      <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <Metric label="Saldo"      value={fmt.rupiah(atm.saldo)}         sub={(atm.pct_saldo?.toFixed(1)) + "%"} color={atm.pct_saldo <= THR_BONGKAR ? "#E24B4A" : atm.pct_saldo <= THR_AWAS ? "#EF9F27" : "#d4b800"} />
        <Metric label="Est. Habis" value={fmt.jam(atm.est_jam)}          sub={atm.tgl_habis || "-"}             color={sc} />
        <Metric label="Jadwal Isi" value={atm.tgl_isi || "-"}            sub={atm.jam_isi || "-"}               color="#94a3b8" />
        <Metric label="Laju Tarik" value={fmt.rupiah(atm.tarik_per_jam)} sub="/jam"                             color="#64748b" />
        <Metric label="Skor"       value={atm.skor_urgensi?.toFixed(0) ?? "-"} sub="/100"                      color={sc} />
      </div>
      <button onClick={() => navigateTo("history", atm.id_atm)} style={{
        background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)",
        borderRadius: 8, color: "#60a5fa", padding: "7px 14px", fontSize: 11,
        cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0,
      }}>Lihat Detail →</button>
    </div>
  );
}

function Metric({ label, value, sub, color }) {
  return (
    <div style={{ textAlign: "center", minWidth: 68 }}>
      <div style={{ color: "#64748b", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{label}</div>
      <div style={{ color: color || "#e2e8f0", fontWeight: 600, fontSize: 12 }}>{value}</div>
      <div style={{ color: "#64748b", fontSize: 10 }}>{sub}</div>
    </div>
  );
}

function SaldoBar({ pct }) {
  const color = pct <= 20 ? "#E24B4A" : pct <= 30 ? "#EF9F27" : pct <= 35 ? "#d4b800" : "#1D9E75";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 60, height: 5, background: "rgba(255,255,255,0.08)", borderRadius: 3 }}>
        <div style={{ height: "100%", width: Math.min(pct || 0, 100) + "%", background: color, borderRadius: 3 }} />
      </div>
      <span style={{ color, fontSize: 12, fontWeight: 600, minWidth: 36 }}>{pct?.toFixed(0) ?? "-"}%</span>
    </div>
  );
}

function NavBtn({ children, onClick, disabled, title }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title} style={{
      minWidth: 32, height: 32, borderRadius: 6,
      border: "1px solid rgba(99,179,237,0.12)",
      background: disabled ? "transparent" : "rgba(255,255,255,0.02)",
      color: disabled ? "#2d3748" : "#64748b",
      fontSize: 16, cursor: disabled ? "default" : "pointer",
      padding: "0 6px", transition: "all 0.15s", lineHeight: 1,
    }}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.background = "rgba(59,130,246,0.08)"; e.currentTarget.style.color = "#60a5fa"; } }}
      onMouseLeave={e => { if (!disabled) { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.color = "#64748b"; } }}
    >{children}</button>
  );
}

function Spinner({ label = "Memuat..." }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "50vh", flexDirection: "column", gap: 12, color: "#64748b" }}>
      <div style={{ width: 28, height: 28, border: "2px solid rgba(59,130,246,0.2)", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <span style={{ fontSize: 13 }}>{label}</span>
    </div>
  );
}

function buildPageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const pages = new Set([0, total - 1]);
  for (let i = Math.max(0, current - 2); i <= Math.min(total - 1, current + 2); i++) pages.add(i);
  const sorted = [...pages].sort((a, b) => a - b);
  const result = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push("…");
    result.push(sorted[i]);
  }
  return result;
}