// src/pages/Dashboard.jsx
import { useState, useEffect } from "react";
import { apiFetch, fmt, STATUS_COLOR, STATUS_BG } from "../utils/api";

const Card = ({ children, style = {} }) => (
  <div style={{
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(99,179,237,0.1)",
    borderRadius: 12,
    padding: "20px 24px",
    ...style,
  }}>{children}</div>
);

const Label = ({ children }) => (
  <div style={{ color: "#ffffff", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
    {children}
  </div>
);

const TABS = [
  { id: "overview",  label: "Overview",        icon: "◈" },
  { id: "coverage",  label: "Master vs Upload", icon: "⊞" },
];

export default function Dashboard({ navigateTo }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [summary,   setSummary]   = useState(null);
  const [status,    setStatus]    = useState(null);
  const [coverage,  setCoverage]  = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [err,       setErr]       = useState(null);

  useEffect(() => {
    Promise.all([
      apiFetch("/api/summary").catch(() => null),
      apiFetch("/api/status").catch(() => null),
      apiFetch("/api/dashboard/master-vs-monitoring").catch(() => null),
    ]).then(([s, st, cov]) => {
      setSummary(s);
      setStatus(st);
      setCoverage(cov);
      setLoading(false);
    }).catch(e => { setErr(e.message); setLoading(false); });
  }, []);

  if (loading) return <LoadingState />;
  if (err || !summary) return <EmptyState navigateTo={navigateTo} />;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ color: "#ffffff", fontSize: 26, fontWeight: 700, margin: "0 0 4px", letterSpacing: "-0.02em" }}>
              Dashboard Monitoring
            </h1>
            <p style={{ color: "#ffffff", fontSize: 13, margin: 0 }}>
              BRK Syariah · Diperbarui {summary.generated_at ? new Date(summary.generated_at).toLocaleString("id-ID") : "-"}
            </p>
          </div>
          {summary.overall?.kritis > 0 && (
            <button onClick={() => navigateTo("alerts")} style={{
              background: "rgba(255,59,92,0.15)", border: "1px solid rgba(255,59,92,0.4)",
              borderRadius: 8, color: "#ff3b5c", padding: "8px 16px", fontSize: 13,
              cursor: "pointer", fontWeight: 600, animation: "pulse 2s infinite",
            }}>
              ⚠ {summary.overall.bongkar} ATM BONGKAR
            </button>
          )}
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{
        display: "flex", gap: 4, marginBottom: 24,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(99,179,237,0.08)",
        borderRadius: 12, padding: 4, width: "fit-content",
      }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          const hasBadge = tab.id === "coverage" && coverage?.summary?.not_in_master > 0;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              background:   isActive ? "rgba(255, 255, 255, 0.18)" : "transparent",
              border:       isActive ? "1px solid rgba(59,130,246,0.35)" : "1px solid transparent",
              borderRadius: 9, color: isActive ? "#ffffff" : "#b5b5b5",
              padding: "8px 20px", fontSize: 13, fontWeight: isActive ? 600 : 400,
              cursor: "pointer", transition: "all 0.15s",
              display: "flex", alignItems: "center", gap: 7,
            }}>
              <span>{tab.icon}</span>
              {tab.label}
              {hasBadge && (
                <span style={{ background: "#EF9F27", color: "#000", fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 99 }}>
                  {coverage.summary.not_in_master}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeTab === "overview"  && <TabOverview  summary={summary} status={status} coverage={coverage} navigateTo={navigateTo} />}
      {activeTab === "coverage"  && <TabCoverage  coverage={coverage} navigateTo={navigateTo} />}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
        @keyframes spin  { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ═══ TAB 1 — OVERVIEW ══════════════════════════════════════════════════════════
function TabOverview({ summary, status, coverage, navigateTo }) {
  const ov    = summary.overall;
  const total = ov.total_atm || 1;

  const statCards = [
    { label: "Total ATM Master SSI", value: ov.total_master_ssi || coverage?.summary?.total_master_ssi || "-", color: "#60a5fa", icon: "⊞", sub: "Di ATM Master" },
    { label: "Termonitor",           value: ov.total_atm,    color: "#378ADD", icon: "◈", sub: "Punya data upload" },
    { label: "Bongkar",              value: ov.bongkar,      color: "#E24B4A", icon: "⚠", sub: "≤ 20% limit" },
    { label: "Awas",                 value: ov.awas,         color: "#EF9F27", icon: "⊕", sub: "20–30% limit" },
    { label: "Perlu Pantau",         value: ov.perlu_pantau, color: "#d4b800", icon: "◎", sub: "30–35% limit" },
    { label: "Aman",                 value: ov.aman,         color: "#1D9E75", icon: "✓", sub: "> 35% limit" },
  ];

  // Coverage ring data
  const covPct   = coverage?.summary?.coverage_pct ?? 0;
  const notMon   = coverage?.summary?.not_monitored ?? 0;
  const notMast  = coverage?.summary?.not_in_master ?? 0;

  return (
    <div>
      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginBottom: 20 }}>
        {statCards.map(c => (
          <Card key={c.label} style={{ textAlign: "center", padding: "16px 12px" }}>
            <div style={{ fontSize: 20, color: c.color, marginBottom: 6 }}>{c.icon}</div>
            <div style={{ color: c.color, fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{c.value ?? "-"}</div>
            <div style={{ color: "#ffffff", fontSize: 10, marginTop: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>{c.label}</div>
            <div style={{ color: "#ffffff", fontSize: 10, marginTop: 2 }}>{c.sub}</div>
          </Card>
        ))}
      </div>

      {/* Coverage Alert — jika ada ATM tidak termonitor */}
      {notMon > 0 && (
        <div style={{
          background: "rgba(239,159,39,0.06)", border: "1px solid rgba(239,159,39,0.25)",
          borderRadius: 10, padding: "12px 18px", marginBottom: 16,
          display: "flex", alignItems: "center", gap: 14,
        }}>
          <span style={{ fontSize: 22 }}>⊕</span>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#EF9F27", fontWeight: 700, fontSize: 14 }}>
              {notMon} ATM SSI belum punya data upload
            </div>
            <div style={{ color: "#ffffff", fontSize: 12, marginTop: 2 }}>
              ATM ini ada di Master SSI tapi belum pernah muncul di file monitoring. Coverage saat ini: <strong style={{ color: "#EF9F27" }}>{covPct}%</strong>
            </div>
          </div>
          <button style={{
            background: "rgba(239,159,39,0.12)", border: "1px solid rgba(239,159,39,0.3)",
            borderRadius: 8, color: "#EF9F27", padding: "6px 14px", fontSize: 12,
            cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap",
          }}
            onClick={() => document.querySelector("[data-tab='coverage']")?.click?.()}
          >Lihat Detail →</button>
        </div>
      )}

      {/* ATM tidak ada di master */}
      {notMast > 0 && (
        <div style={{
          background: "rgba(226,75,74,0.06)", border: "1px solid rgba(226,75,74,0.2)",
          borderRadius: 10, padding: "12px 18px", marginBottom: 16,
          display: "flex", alignItems: "center", gap: 14,
        }}>
          <span style={{ fontSize: 22 }}>⚠</span>
          <div>
            <div style={{ color: "#E24B4A", fontWeight: 700, fontSize: 14 }}>
              {notMast} ATM dari file upload tidak ditemukan di Master SSI
            </div>
            <div style={{ color: "#ffffff", fontSize: 12, marginTop: 2 }}>
              ID ATM ini ada di file monitoring tapi tidak ada di ATM Master. Perlu dicek/ditambahkan ke Master.
            </div>
          </div>
        </div>
      )}

      {/* Middle row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Status Distribution */}
        <Card>
          <Label>Distribusi Status ATM</Label>
          <div style={{ marginTop: 12 }}>
            {Object.entries(ov.status_breakdown || {}).map(([st, count]) => {
              const pct = (count / total * 100).toFixed(1);
              const col = STATUS_COLOR[st] || "#6b7280";
              return (
                <div key={st} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: col, fontSize: 12, fontWeight: 600 }}>{st}</span>
                    <span style={{ color: "#ffffff", fontSize: 12 }}>{count} ({pct}%)</span>
                  </div>
                  <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: col, borderRadius: 2, transition: "width 0.6s ease" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Per Wilayah */}
        <Card>
          <Label>Status Per Wilayah</Label>
          <div style={{ marginTop: 8 }}>
            {(summary.per_wilayah || []).map(w => (
              <div key={w.wilayah} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "9px 12px", marginBottom: 6,
                background: "rgba(255,255,255,0.02)", borderRadius: 8,
                border: "1px solid rgba(99,179,237,0.06)",
              }}>
                <div>
                  <div style={{ color: "#ffffff", fontSize: 13, fontWeight: 600 }}>{w.wilayah}</div>
                  <div style={{ color: "#ffffff", fontSize: 11, marginTop: 1 }}>
                    {w.total} ATM · avg {w.avg_pct_saldo?.toFixed(1)}%
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {w.bongkar > 0 && <Pill color="#E24B4A">{w.bongkar} BONGKAR</Pill>}
                  {w.awas    > 0 && <Pill color="#EF9F27">{w.awas} AWAS</Pill>}
                  {w.bongkar === 0 && w.awas === 0 && <span style={{ color: "#1D9E75", fontSize: 11 }}>✓ Aman</span>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Coverage Summary mini card */}
      {coverage && (
        <Card style={{ marginBottom: 16 }}>
          <Label>Coverage ATM Master SSI</Label>
          <div style={{ display: "flex", gap: 32, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
            <CoverageRing pct={covPct} />
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              {[
                { label: "Total Master SSI",  value: coverage.summary.total_master_ssi,  color: "#60a5fa" },
                { label: "Termonitor",        value: coverage.summary.matched,            color: "#1D9E75" },
                { label: "Belum Ada Upload",  value: coverage.summary.not_monitored,      color: "#EF9F27" },
                { label: "Tidak di Master",   value: coverage.summary.not_in_master,      color: "#E24B4A" },
              ].map(s => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div style={{ color: s.color, fontSize: 22, fontWeight: 700 }}>{s.value}</div>
                  <div style={{ color: "#ffffff", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ marginLeft: "auto" }}>
              <div style={{ color: "#ffffff", fontSize: 11, marginBottom: 8 }}>Per Wilayah:</div>
              {(coverage.wilayah_breakdown || []).map(w => (
                <div key={w.wilayah} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 5 }}>
                  <span style={{ color: "#ffffff", fontSize: 12, minWidth: 110 }}>{w.wilayah}</span>
                  <div style={{ width: 120, height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
                    <div style={{
                      height: "100%", borderRadius: 2, background: "#1D9E75",
                      width: `${(w.monitored / Math.max(w.master, 1)) * 100}%`,
                    }} />
                  </div>
                  <span style={{ color: "#ffffff", fontSize: 11 }}>{w.monitored}/{w.master}</span>
                  {w.not_monitored > 0 && (
                    <span style={{ color: "#EF9F27", fontSize: 10, fontWeight: 600 }}>+{w.not_monitored} belum</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* System Status */}
      <Card>
        <Label>Status Sistem</Label>
        <div style={{ display: "flex", gap: 28, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
          {[
            { label: "ATM Master",    ok: (coverage?.summary?.total_master_ssi ?? 0) > 0, note: "Import ATM Master dulu" },
            { label: "Data Upload",   ok: status?.has_data,   note: "Upload file monitoring dulu" },
            { label: "Model XGBoost", ok: status?.has_model,  note: "Belum di-train" },
            { label: "Cache Prediksi",ok: status?.has_cache,  note: null },
          ].map(s => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: s.ok ? "#00e5a0" : "#ff3b5c",
                boxShadow: `0 0 6px ${s.ok ? "#00e5a0" : "#ff3b5c"}`,
              }} />
              <span style={{ color: s.ok ? "#ffffff" : "#ff3b5c", fontSize: 13 }}>
                {s.label}
                {!s.ok && s.note && <span style={{ fontSize: 10, marginLeft: 5, opacity: 0.65 }}>({s.note})</span>}
              </span>
            </div>
          ))}
          {status?.date_range && (
            <span style={{ color: "#ffffff", fontSize: 12, marginLeft: "auto" }}>
              Data: {status.date_range.from} → {status.date_range.to}
              {status.total_atm && <span style={{ marginLeft: 10 }}>{status.total_atm} ATM</span>}
            </span>
          )}
        </div>
      </Card>
    </div>
  );
}

// ═══ TAB 2 — MASTER VS MONITORING COVERAGE ═════════════════════════════════════
function TabCoverage({ coverage, navigateTo }) {
  const [subTab,  setSubTab]  = useState("not_monitored");
  const [search,  setSearch]  = useState("");

  if (!coverage) {
    return (
      <div style={{ color: "#ffffff", padding: "40px 20px", textAlign: "center", fontSize: 13 }}>
        Data perbandingan tidak tersedia. Pastikan ATM Master sudah diimport dan ada data upload.
      </div>
    );
  }

  const { summary, not_monitored, not_in_master, wilayah_breakdown } = coverage;

  const filteredNotMon = (not_monitored || []).filter(r =>
    !search || r.id_atm?.toLowerCase().includes(search.toLowerCase()) ||
    r.lokasi_atm?.toLowerCase().includes(search.toLowerCase()) ||
    r.wilayah?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredNotMast = (not_in_master || []).filter(r =>
    !search || r.id_atm?.toLowerCase().includes(search.toLowerCase()) ||
    r.lokasi?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Master SSI",    value: summary.total_master_ssi,  color: "#60a5fa", icon: "⊞", desc: "ATM terdaftar di master" },
          { label: "Coverage",            value: summary.coverage_pct + "%", color: summary.coverage_pct >= 90 ? "#1D9E75" : summary.coverage_pct >= 70 ? "#EF9F27" : "#E24B4A", icon: "◉", desc: "Termonitor dari master" },
          { label: "Belum Ada Upload",    value: summary.not_monitored,     color: "#EF9F27", icon: "⊕", desc: "Di master, belum diupload" },
          { label: "Tidak di Master",     value: summary.not_in_master,     color: summary.not_in_master > 0 ? "#E24B4A" : "#1D9E75", icon: "⚠", desc: "Di upload, tak ada di master" },
        ].map(c => (
          <Card key={c.label} style={{ padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ color: c.color, fontSize: 22 }}>{c.icon}</span>
              <div style={{ color: c.color, fontSize: 26, fontWeight: 700 }}>{c.value}</div>
            </div>
            <div style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 600 }}>{c.label}</div>
            <div style={{ color: "#ffffff", fontSize: 11, marginTop: 2 }}>{c.desc}</div>
          </Card>
        ))}
      </div>

      {/* Per Wilayah breakdown */}
      <Card style={{ marginBottom: 16 }}>
        <Label>Coverage Per Wilayah</Label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12, marginTop: 12 }}>
          {(wilayah_breakdown || []).map(w => {
            const pct = Math.round((w.monitored / Math.max(w.master, 1)) * 100);
            const color = pct >= 90 ? "#1D9E75" : pct >= 70 ? "#EF9F27" : "#E24B4A";
            return (
              <div key={w.wilayah} style={{
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(99,179,237,0.08)",
                borderRadius: 10, padding: "14px 16px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 13 }}>{w.wilayah}</span>
                  <span style={{ color, fontSize: 13, fontWeight: 700 }}>{pct}%</span>
                </div>
                <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3, marginBottom: 8 }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3 }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                  <span style={{ color: "#ffffff" }}>Master: <strong style={{ color: "#ffffff" }}>{w.master}</strong></span>
                  <span style={{ color: "#ffffff" }}>Monitoring: <strong style={{ color: "#1D9E75" }}>{w.monitored}</strong></span>
                  {w.not_monitored > 0 && <span style={{ color: "#EF9F27" }}>Belum: {w.not_monitored}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Sub-tab list */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, alignItems: "center" }}>
        {[
          { key: "not_monitored", label: `Belum Ada Upload (${summary.not_monitored})`, color: "#EF9F27" },
          { key: "not_in_master", label: `Tidak di Master SSI (${summary.not_in_master})`, color: "#E24B4A" },
        ].map(t => (
          <button key={t.key} onClick={() => { setSubTab(t.key); setSearch(""); }} style={{
            background: subTab === t.key ? `rgba(${t.color === "#EF9F27" ? "239,159,39" : "226,75,74"},0.12)` : "transparent",
            border:     subTab === t.key ? `1px solid ${t.color}44` : "1px solid rgba(99,179,237,0.1)",
            borderRadius: 8, color: subTab === t.key ? t.color : "#ffffff",
            padding: "7px 16px", fontSize: 12, fontWeight: subTab === t.key ? 700 : 400, cursor: "pointer",
          }}>{t.label}</button>
        ))}
        <input
          placeholder="Cari ID ATM / lokasi / wilayah..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            marginLeft: "auto",
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(99,179,237,0.15)",
            borderRadius: 8, color: "#e2e8f0", padding: "7px 14px", fontSize: 12,
            outline: "none", width: 240,
          }}
        />
      </div>

      {/* List: ATM di master tapi belum diupload */}
      {subTab === "not_monitored" && (
        <Card style={{ padding: 0 }}>
          {filteredNotMon.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#1D9E75", fontSize: 13 }}>
              {search ? "Tidak ada hasil pencarian." : "✓ Semua ATM SSI sudah punya data upload!"}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(99,179,237,0.1)" }}>
                    {["ID ATM", "Merk", "Lokasi", "Wilayah", "Denom", "Limit", "Keterangan"].map(h => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#ffffff", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredNotMon.map((r, i) => (
                    <tr key={r.id_atm} style={{
                      borderBottom: "1px solid rgba(99,179,237,0.05)",
                      background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                    }}>
                      <td style={{ padding: "10px 16px", fontWeight: 600, color: "#e2e8f0", fontFamily: "monospace" }}>{r.id_atm}</td>
                      <td style={{ padding: "10px 16px", color: "#ffffff" }}>{r.merk_atm || "-"}</td>
                      <td style={{ padding: "10px 16px", color: "#ffffff", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.lokasi_atm}>{r.lokasi_atm || "-"}</td>
                      <td style={{ padding: "10px 16px", color: "#ffffff" }}>{r.wilayah || "-"}</td>
                      <td style={{ padding: "10px 16px", color: "#ffffff" }}>{r.denom_options || "-"}</td>
                      <td style={{ padding: "10px 16px", color: "#ffffff" }}>{fmt.rupiah(r.limit)}</td>
                      <td style={{ padding: "10px 16px" }}>
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "rgba(239,159,39,0.08)", color: "#EF9F27", border: "1px solid rgba(239,159,39,0.2)" }}>
                          Belum ada data upload
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* List: ATM di upload tapi tidak di master */}
      {subTab === "not_in_master" && (
        <Card style={{ padding: 0 }}>
          {filteredNotMast.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#1D9E75", fontSize: 13 }}>
              {search ? "Tidak ada hasil pencarian." : "✓ Semua ATM dari upload sudah terdaftar di Master SSI!"}
            </div>
          ) : (
            <>
              <div style={{ padding: "12px 16px", background: "rgba(226,75,74,0.04)", borderBottom: "1px solid rgba(226,75,74,0.1)", fontSize: 12, color: "#ffffff" }}>
                ⚠ ATM ini sudah pernah ada di file upload tapi <strong style={{ color: "#E24B4A" }}>tidak ditemukan di ATM Master SSI</strong>.
                Saldo tidak bisa diperbarui saat upload berikutnya sampai ATM ini ditambahkan ke Master.
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(99,179,237,0.1)" }}>
                      {["ID ATM", "Lokasi", "Wilayah", "Saldo Terakhir", "% Saldo", "Status", "Last Update", "Aksi"].map(h => (
                        <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#ffffff", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredNotMast.map((r, i) => {
                      const sc = STATUS_COLOR[r.status] || "#6b7280";
                      return (
                        <tr key={r.id_atm} style={{
                          borderBottom: "1px solid rgba(99,179,237,0.05)",
                          background: i % 2 === 0 ? "rgba(226,75,74,0.02)" : "transparent",
                        }}>
                          <td style={{ padding: "10px 16px", fontWeight: 600, color: "#e2e8f0", fontFamily: "monospace" }}>{r.id_atm}</td>
                          <td style={{ padding: "10px 16px", color: "#ffffff", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.lokasi}>{r.lokasi || "-"}</td>
                          <td style={{ padding: "10px 16px", color: "#ffffff" }}>{r.wilayah || "-"}</td>
                          <td style={{ padding: "10px 16px", color: "#ffffff", fontWeight: 600 }}>{fmt.rupiah(r.saldo)}</td>
                          <td style={{ padding: "10px 16px", color: sc, fontWeight: 600 }}>{r.pct_saldo?.toFixed(1)}%</td>
                          <td style={{ padding: "10px 16px" }}>
                            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: sc + "18", color: sc, border: `1px solid ${sc}33` }}>{r.status || "-"}</span>
                          </td>
                          <td style={{ padding: "10px 16px", color: "#ffffff", fontSize: 11 }}>{r.last_update ? String(r.last_update).slice(0, 16) : "-"}</td>
                          <td style={{ padding: "10px 16px" }}>
                            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "rgba(226,75,74,0.08)", color: "#E24B4A", border: "1px solid rgba(226,75,74,0.25)" }}>
                              Tambahkan ke Master
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}

// ═══ SHARED COMPONENTS ══════════════════════════════════════════════════════════

function CoverageRing({ pct }) {
  const r   = 36;
  const c   = 2 * Math.PI * r;
  const color = pct >= 90 ? "#1D9E75" : pct >= 70 ? "#EF9F27" : "#E24B4A";
  return (
    <div style={{ position: "relative", width: 90, height: 90, flexShrink: 0 }}>
      <svg width="90" height="90" viewBox="0 0 90 90">
        <circle cx="45" cy="45" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        <circle
          cx="45" cy="45" r={r} fill="none"
          stroke={color} strokeWidth="6"
          strokeDasharray={`${(pct / 100) * c} ${c}`}
          strokeLinecap="round"
          transform="rotate(-90 45 45)"
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color, fontWeight: 700, fontSize: 16 }}>{pct}%</div>
        <div style={{ color: "#ffffff", fontSize: 9, textTransform: "uppercase" }}>coverage</div>
      </div>
    </div>
  );
}

function Pill({ children, color }) {
  return (
    <span style={{
      background: color + "18", color, fontSize: 11, padding: "2px 8px",
      borderRadius: 4, fontWeight: 600, border: `1px solid ${color}33`,
    }}>{children}</span>
  );
}

function LoadingState() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: "#ffffff", flexDirection: "column", gap: 12 }}>
      <div style={{ width: 36, height: 36, border: "2px solid rgba(59,130,246,0.3)", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <span>Memuat data...</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function EmptyState({ navigateTo }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 48, opacity: 0.3 }}>◈</div>
      <h2 style={{ color: "#ffffff", fontWeight: 600, margin: 0 }}>Belum Ada Data</h2>
      <p style={{ color: "#ffffff", margin: 0, fontSize: 14 }}>Import ATM Master terlebih dahulu, lalu upload file monitoring</p>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => navigateTo("data")} style={{
          background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.4)",
          borderRadius: 8, color: "#60a5fa", padding: "10px 20px", fontSize: 13, cursor: "pointer", fontWeight: 600,
        }}>Import ATM Master →</button>
        <button onClick={() => navigateTo("upload")} style={{
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(99,179,237,0.15)",
          borderRadius: 8, color: "#ffffff", padding: "10px 20px", fontSize: 13, cursor: "pointer",
        }}>Upload Monitoring</button>
      </div>
    </div>
  );
}