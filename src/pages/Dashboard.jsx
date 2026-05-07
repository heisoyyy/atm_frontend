// src/pages/Dashboard.jsx
import { useState, useEffect, useRef } from "react";
import { apiFetch, fmt, STATUS_COLOR, STATUS_BG } from "../utils/api";

// ── Shared tiny helpers ───────────────────────────────────────────────────────

function fmtShort(n) {
  if (n == null) return "-";
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "M";
  if (n >= 1e6) return (n / 1e6).toFixed(0) + "jt";
  return n.toLocaleString("id-ID");
}

// ── Shared UI atoms ───────────────────────────────────────────────────────────

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

function Pill({ children, color }) {
  return (
    <span style={{
      background: color + "18", color, fontSize: 11, padding: "2px 8px",
      borderRadius: 4, fontWeight: 600, border: `1px solid ${color}33`, whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

function WilayahBadge({ wilayah }) {
  return (
    <span style={{
      fontSize: 11, padding: "2px 8px", borderRadius: 4,
      background: "rgba(56,130,221,0.12)", color: "#60a5fa", fontWeight: 500,
    }}>{wilayah || "-"}</span>
  );
}

function SectionCard({ children, style = {} }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(99,179,237,0.1)",
      borderRadius: 12,
      overflow: "hidden",
      ...style,
    }}>{children}</div>
  );
}

function SectionHeader({ title, icon, right }) {
  return (
    <div style={{
      padding: "12px 16px",
      borderBottom: "1px solid rgba(99,179,237,0.08)",
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 15, color: "#8a8a9a" }}>{icon}</span>
        {title}
      </span>
      {right}
    </div>
  );
}

function PctBar({ pct, status }) {
  const color = STATUS_COLOR[status] || "#8a8a9a";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color, minWidth: 38 }}>{(pct ?? 0).toFixed(1)}%</span>
      <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, minWidth: 40 }}>
        <div style={{ height: "100%", width: `${Math.min(100, pct || 0)}%`, background: color, borderRadius: 2 }} />
      </div>
    </div>
  );
}

// ── Table primitives ──────────────────────────────────────────────────────────

function Th({ children }) {
  return (
    <th style={{
      padding: "9px 14px", textAlign: "left", fontSize: 11, fontWeight: 600,
      color: "#8a8a9a", borderBottom: "1px solid rgba(99,179,237,0.08)",
      whiteSpace: "nowrap",
    }}>{children}</th>
  );
}

function Td({ children, style = {} }) {
  return (
    <td style={{
      padding: "9px 14px", borderBottom: "1px solid rgba(99,179,237,0.05)",
      color: "#e2e8f0", verticalAlign: "middle", ...style,
    }}>{children}</td>
  );
}

// ── TABS config ───────────────────────────────────────────────────────────────

const TABS = [
  { id: "overview", label: "Overview",},
  { id: "coverage", label: "Master vs Upload",},
];

// ═══════════════════════════════════════════════════════════════════════════════
//  DEFAULT EXPORT — Dashboard
// ═══════════════════════════════════════════════════════════════════════════════

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
              background:   isActive ? "rgba(255,255,255,0.18)" : "transparent",
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

      {activeTab === "overview" && <TabOverview summary={summary} status={status} coverage={coverage} navigateTo={navigateTo} />}
      {activeTab === "coverage" && <TabCoverage coverage={coverage} navigateTo={navigateTo} />}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
        @keyframes spin  { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TAB 1 — OVERVIEW
// ═══════════════════════════════════════════════════════════════════════════════

function TabOverview({ summary, status, coverage, navigateTo }) {
  const ov    = summary.overall;
  const total = ov.total_atm || 1;

  const statCards = [
    { label: "Total ATM Master SSI", value: ov.total_master_ssi || coverage?.summary?.total_master_ssi || "-", color: "#60a5fa", sub: "Di ATM Master" },
    { label: "Termonitor",           value: ov.total_atm,    color: "#378ADD", sub: "Punya data upload" },
    { label: "Bongkar",              value: ov.bongkar,      color: "#E24B4A", sub: "≤ 20% limit" },
    { label: "Awas",                 value: ov.awas,         color: "#EF9F27", sub: "20–30% limit" },
    { label: "Perlu Pantau",         value: ov.perlu_pantau, color: "#d4b800", sub: "30–35% limit" },
    { label: "Aman",                 value: ov.aman,         color: "#1D9E75", sub: "> 35% limit" },
  ];

  const covPct  = coverage?.summary?.coverage_pct ?? 0;
  const notMon  = coverage?.summary?.not_monitored ?? 0;
  const notMast = coverage?.summary?.not_in_master ?? 0;

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
          }}>Lihat Detail →</button>
        </div>
      )}

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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
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

      {coverage && (
        <Card style={{ marginBottom: 16 }}>
          <Label>Coverage ATM Master SSI</Label>
          <div style={{ display: "flex", gap: 32, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
            <CoverageRing pct={covPct} />
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              {[
                { label: "Total Master SSI", value: coverage.summary.total_master_ssi, color: "#60a5fa" },
                { label: "Termonitor",       value: coverage.summary.matched,           color: "#1D9E75" },
                { label: "Belum Ada Upload", value: coverage.summary.not_monitored,     color: "#EF9F27" },
                { label: "Tidak di Master",  value: coverage.summary.not_in_master,     color: "#E24B4A" },
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
                    <div style={{ height: "100%", borderRadius: 2, background: "#1D9E75", width: `${(w.monitored / Math.max(w.master, 1)) * 100}%` }} />
                  </div>
                  <span style={{ color: "#ffffff", fontSize: 11 }}>{w.monitored}/{w.master}</span>
                  {w.not_monitored > 0 && <span style={{ color: "#EF9F27", fontSize: 10, fontWeight: 600 }}>+{w.not_monitored} belum</span>}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      <Card>
        <Label>Status Sistem</Label>
        <div style={{ display: "flex", gap: 28, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
          {[
            { label: "ATM Master",    ok: (coverage?.summary?.total_master_ssi ?? 0) > 0, note: "Import ATM Master dulu" },
            { label: "Data Upload",   ok: status?.has_data,  note: "Upload file monitoring dulu" },
            { label: "Model XGBoost", ok: status?.has_model, note: "Belum di-train" },
            { label: "Cache Prediksi",ok: status?.has_cache, note: null },
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

// ═══════════════════════════════════════════════════════════════════════════════
//  TAB 2 — MASTER VS MONITORING COVERAGE (ENHANCED)
// ═══════════════════════════════════════════════════════════════════════════════

// ── Chart.js loader (lazy, sekali) ───────────────────────────────────────────
function useChartJs() {
  const [ready, setReady] = useState(typeof window !== "undefined" && !!window.Chart);
  useEffect(() => {
    if (window.Chart) { setReady(true); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
    s.onload = () => setReady(true);
    document.head.appendChild(s);
  }, []);
  return ready;
}

// ── Insight panel ─────────────────────────────────────────────────────────────
function InsightPanel({ coverage }) {
  const s  = coverage.summary;
  const wb = coverage.wilayah_breakdown || [];
  const worst = wb.reduce(
    (a, b) => (b.not_monitored / Math.max(b.master, 1)) > (a.not_monitored / Math.max(a.master, 1)) ? b : a,
    wb[0] || { not_monitored: 0, master: 1, wilayah: "-" }
  );
  const worstPct = Math.round((worst.not_monitored / Math.max(worst.master, 1)) * 100);

  const clsMap = {
    err:  { bg: "rgba(226,75,74,0.06)",   border: "rgba(226,75,74,0.2)",   color: "#E24B4A" },
    warn: { bg: "rgba(239,159,39,0.06)",  border: "rgba(239,159,39,0.2)",  color: "#EF9F27" },
    ok:   { bg: "rgba(29,158,117,0.06)",  border: "rgba(29,158,117,0.2)", color: "#1D9E75" },
    info: { bg: "rgba(56,130,221,0.06)",  border: "rgba(56,130,221,0.2)", color: "#60a5fa" },
  };

  const insights = [];
  if (s.coverage_pct < 70)
    insights.push({ cls: "err", text: `Coverage hanya ${s.coverage_pct}% — kurang dari 70%. Banyak ATM SSI belum pernah masuk data upload.` });
  else if (s.coverage_pct < 90)
    insights.push({ cls: "warn", text: `Coverage ${s.coverage_pct}% — ada ${s.not_monitored} ATM SSI yang belum pernah muncul di file monitoring.` });
  else
    insights.push({ cls: "ok", text: `Coverage ${s.coverage_pct}% — sangat baik! Hampir semua ATM SSI sudah terpantau.` });

  if (s.not_in_master > 0)
    insights.push({ cls: "err", text: `${s.not_in_master} ATM ada di file upload tapi tidak ada di ATM Master SSI. Saldo mereka tidak terhitung dalam kalkulasi wilayah.` });

  if (worst.not_monitored > 0)
    insights.push({ cls: "info", text: `Wilayah ${worst.wilayah} punya gap terbesar: ${worst.not_monitored} ATM (${worstPct}%) belum ada data upload.` });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
      {insights.map((ins, i) => {
        const c = clsMap[ins.cls];
        return (
          <div key={i} style={{
            background: c.bg, border: `1px solid ${c.border}`,
            borderRadius: 8, padding: "10px 14px",
            display: "flex", gap: 8, alignItems: "flex-start",
          }}>
            <span style={{ color: c.color, fontSize: 15, flexShrink: 0, marginTop: 1 }}>{ins.icon}</span>
            <span style={{ color: "#e2e8f0", fontSize: 12 }}>{ins.text}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Coverage donut chart ──────────────────────────────────────────────────────
function CoverageDonutChart({ summary, chartReady }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    if (!chartReady || !canvasRef.current) return;
    chartRef.current?.destroy();
    const { matched, not_monitored, not_in_master } = summary;
    chartRef.current = new window.Chart(canvasRef.current, {
      type: "doughnut",
      data: {
        labels: ["Termonitor", "Belum upload", "Tidak di master"],
        datasets: [{
          data: [matched, not_monitored, not_in_master],
          backgroundColor: ["#1D9E75", "#EF9F27", "#E24B4A"],
          borderWidth: 2,
          borderColor: "#0d1117",
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: "68%",
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw} ATM` } },
        },
      },
    });
    return () => chartRef.current?.destroy();
  }, [chartReady, summary]);

  const covColor = summary.coverage_pct >= 90 ? "#1D9E75" : summary.coverage_pct >= 70 ? "#EF9F27" : "#E24B4A";
  return (
    <div style={{ padding: "14px 16px" }}>
      <div style={{ position: "relative", width: "100%", height: 180 }}>
        <canvas ref={canvasRef} />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 10, alignItems: "center" }}>
        {[
          { label: `Termonitor (${summary.matched})`,         color: "#1D9E75" },
          { label: `Belum upload (${summary.not_monitored})`, color: "#EF9F27" },
          { label: `Tidak di master (${summary.not_in_master})`, color: "#E24B4A" },
        ].map(l => (
          <span key={l.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#8a8a9a" }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: l.color, flexShrink: 0 }} />
            {l.label}
          </span>
        ))}
        <span style={{ marginLeft: "auto", color: covColor, fontWeight: 700, fontSize: 18 }}>
          {summary.coverage_pct}%
        </span>
      </div>
    </div>
  );
}

// ── Wilayah grouped bar chart ─────────────────────────────────────────────────
function WilayahBarChart({ breakdown, chartReady }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    if (!chartReady || !canvasRef.current || !breakdown?.length) return;
    chartRef.current?.destroy();
    chartRef.current = new window.Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels: breakdown.map(w => w.wilayah),
        datasets: [
          { label: "Master SSI",   data: breakdown.map(w => w.master),        backgroundColor: "rgba(55,138,221,0.25)", borderRadius: 4 },
          { label: "Termonitor",   data: breakdown.map(w => w.monitored),      backgroundColor: "#1D9E75", borderRadius: 4 },
          { label: "Belum upload", data: breakdown.map(w => w.not_monitored),  backgroundColor: "#EF9F27", borderRadius: 4 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: "#8a8a9a", font: { size: 11 } } },
          y: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "#8a8a9a", font: { size: 10 } } },
        },
      },
    });
    return () => chartRef.current?.destroy();
  }, [chartReady, breakdown]);

  return (
    <div style={{ padding: "14px 16px" }}>
      <div style={{ display: "flex", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
        {[
          { label: "Master SSI",   color: "rgba(55,138,221,0.4)" },
          { label: "Termonitor",   color: "#1D9E75" },
          { label: "Belum upload", color: "#EF9F27" },
        ].map(l => (
          <span key={l.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#8a8a9a" }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: l.color, flexShrink: 0 }} />
            {l.label}
          </span>
        ))}
      </div>
      <div style={{ position: "relative", width: "100%", height: 160 }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

// ── Heatmap per wilayah ───────────────────────────────────────────────────────
function WilayahHeatmap({ breakdown }) {
  return (
    <div style={{ padding: "14px 16px" }}>
      <div style={{
        display: "grid", gridTemplateColumns: "110px 1fr 44px 44px 44px",
        gap: 10, paddingBottom: 6,
        borderBottom: "1px solid rgba(99,179,237,0.08)", marginBottom: 4,
      }}>
        {["Wilayah", "Progress", "Master", "Monitor", "Belum"].map((h, i) => (
          <span key={h} style={{ fontSize: 11, color: "#8a8a9a", textAlign: i >= 2 ? "center" : "left" }}>{h}</span>
        ))}
      </div>
      {(breakdown || []).map(w => {
        const pct      = Math.round((w.monitored / Math.max(w.master, 1)) * 100);
        const barColor = pct >= 90 ? "#1D9E75" : pct >= 70 ? "#EF9F27" : "#E24B4A";
        return (
          <div key={w.wilayah} style={{
            display: "grid", gridTemplateColumns: "110px 1fr 44px 44px 44px",
            alignItems: "center", gap: 10,
            padding: "8px 0", borderBottom: "1px solid rgba(99,179,237,0.05)",
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{w.wilayah}</div>
              <div style={{ fontSize: 10, color: "#8a8a9a" }}>{pct}% coverage</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#8a8a9a", textAlign: "right", marginBottom: 3 }}>{w.monitored}/{w.master}</div>
              <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 3, transition: "width 0.5s" }} />
              </div>
            </div>
            {[
              { val: w.master,        color: "#60a5fa", bg: "rgba(56,130,221,0.1)" },
              { val: w.monitored,     color: "#1D9E75", bg: "rgba(29,158,117,0.1)" },
              { val: w.not_monitored, color: w.not_monitored > 0 ? "#EF9F27" : "#1D9E75", bg: w.not_monitored > 0 ? "rgba(239,159,39,0.1)" : "rgba(29,158,117,0.1)" },
            ].map((b, i) => (
              <div key={i} style={{
                textAlign: "center", fontSize: 11, fontWeight: 600,
                padding: "2px 4px", borderRadius: 4, color: b.color, background: b.bg,
              }}>{b.val}</div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ── Goal tracker ──────────────────────────────────────────────────────────────
function CoverageGoals({ summary }) {
  const goals = [
    { label: "Target coverage 95%",     current: summary.coverage_pct,  target: 95, unit: "%",  invert: false },
    { label: "ATM tanpa upload = 0",    current: summary.not_monitored, target: 0,  unit: "",   invert: true  },
    { label: "ATM tidak di master = 0", current: summary.not_in_master, target: 0,  unit: "",   invert: true  },
  ];
  return (
    <div style={{ padding: "14px 16px" }}>
      {goals.map(g => {
        let pct, color, labelStr;
        if (g.invert) {
          pct      = g.current === 0 ? 100 : Math.max(5, 100 - Math.round((g.current / Math.max(g.current * 1.5, 1)) * 100));
          color    = g.current === 0 ? "#1D9E75" : "#E24B4A";
          labelStr = g.current === 0 ? "✓ Tercapai!" : `Masih ${g.current} ATM`;
        } else {
          pct      = Math.min(100, Math.round((g.current / g.target) * 100));
          color    = g.current >= g.target ? "#1D9E75" : g.current >= g.target * 0.8 ? "#EF9F27" : "#E24B4A";
          labelStr = `${g.current}${g.unit} / ${g.target}${g.unit}`;
        }
        return (
          <div key={g.label} style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: "#e2e8f0" }}>{g.label}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color }}>{labelStr}</span>
            </div>
            <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width 0.6s" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Table: belum ada upload ───────────────────────────────────────────────────
function TableNotMonitored({ data }) {
  if (!data.length) return (
    <div style={{ padding: "40px 20px", textAlign: "center", color: "#1D9E75", fontSize: 13 }}>
      ✓ Semua ATM SSI sudah punya data upload!
    </div>
  );
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead><tr><Th>ID ATM</Th><Th>Merk</Th><Th>Lokasi</Th><Th>Wilayah</Th><Th>Denom</Th><Th>Limit</Th><Th>Status</Th></tr></thead>
        <tbody>
          {data.map((r, i) => (
            <tr key={r.id_atm} style={{ background: i % 2 ? "rgba(255,255,255,0.01)" : "transparent" }}>
              <Td><span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 600 }}>{r.id_atm}</span></Td>
              <Td style={{ color: "#8a8a9a", fontSize: 11 }}>{r.merk_atm || "-"}</Td>
              <Td style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.lokasi_atm || "-"}</Td>
              <Td><WilayahBadge wilayah={r.wilayah} /></Td>
              <Td style={{ fontFamily: "monospace", fontSize: 11 }}>{r.denom_options || "-"}</Td>
              <Td style={{ fontSize: 11, color: "#8a8a9a" }}>{fmt.rupiah(r.limit)}</Td>
              <Td><Pill color="#EF9F27">Belum ada upload</Pill></Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Table: tidak di master ────────────────────────────────────────────────────
function TableNotInMaster({ data }) {
  if (!data.length) return (
    <div style={{ padding: "40px 20px", textAlign: "center", color: "#1D9E75", fontSize: 13 }}>
      ✓ Semua ATM dari upload sudah terdaftar di Master SSI!
    </div>
  );
  return (
    <>
      <div style={{ padding: "10px 14px", background: "rgba(226,75,74,0.04)", borderBottom: "1px solid rgba(226,75,74,0.08)", fontSize: 12, color: "#8a8a9a" }}>
        ⚠ ATM ini ada di file upload tapi <strong style={{ color: "#E24B4A" }}>tidak ditemukan di ATM Master SSI</strong>. Tambahkan ke Master agar saldo terhitung saat upload berikutnya.
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead><tr><Th>ID ATM</Th><Th>Lokasi</Th><Th>Wilayah</Th><Th>Saldo</Th><Th>% Saldo</Th><Th>Status</Th><Th>Last Update</Th><Th>Aksi</Th></tr></thead>
          <tbody>
            {data.map((r, i) => {
              const sc  = STATUS_COLOR[r.status] || "#8a8a9a";
              const sbg = (STATUS_BG && STATUS_BG[r.status]) || sc + "18";
              return (
                <tr key={r.id_atm} style={{ background: i % 2 ? "rgba(226,75,74,0.015)" : "transparent" }}>
                  <Td><span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 600 }}>{r.id_atm}</span></Td>
                  <Td style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.lokasi || "-"}</Td>
                  <Td><WilayahBadge wilayah={r.wilayah} /></Td>
                  <Td style={{ fontWeight: 600, fontSize: 11 }}>{fmtShort(r.saldo)}</Td>
                  <Td><PctBar pct={r.pct_saldo} status={r.status} /></Td>
                  <Td><span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: sbg, color: sc, fontWeight: 600 }}>{r.status || "-"}</span></Td>
                  <Td style={{ fontSize: 10, color: "#8a8a9a" }}>{(r.last_update || "-").slice(0, 16)}</Td>
                  <Td>
                    <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, background: "rgba(226,75,74,0.08)", color: "#E24B4A", border: "1px solid rgba(226,75,74,0.25)", cursor: "pointer" }}>
                      + Tambah ke Master
                    </span>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Table: termonitor (matched) ───────────────────────────────────────────────
function TableMatched({ data }) {
  if (!data.length) return (
    <div style={{ padding: "40px 20px", textAlign: "center", color: "#8a8a9a", fontSize: 13 }}>
      Data matched_detail belum tersedia — tambahkan ke response backend (lihat patch).
    </div>
  );
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead><tr><Th>ID ATM</Th><Th>Merk</Th><Th>Lokasi</Th><Th>Wilayah</Th><Th>Saldo</Th><Th>% Saldo</Th><Th>Status</Th><Th>Last Update</Th></tr></thead>
        <tbody>
          {data.map((r, i) => {
            const sc  = STATUS_COLOR[r.status] || "#8a8a9a";
            const sbg = (STATUS_BG && STATUS_BG[r.status]) || sc + "18";
            return (
              <tr key={r.id_atm} style={{ background: i % 2 ? "rgba(255,255,255,0.01)" : "transparent" }}>
                <Td><span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 600 }}>{r.id_atm}</span></Td>
                <Td style={{ color: "#8a8a9a", fontSize: 11 }}>{r.merk_atm || "-"}</Td>
                <Td style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.lokasi_atm || "-"}</Td>
                <Td><WilayahBadge wilayah={r.wilayah} /></Td>
                <Td style={{ fontWeight: 600, fontSize: 11 }}>{fmtShort(r.saldo)}</Td>
                <Td><PctBar pct={r.pct_saldo} status={r.status} /></Td>
                <Td><span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: sbg, color: sc, fontWeight: 600 }}>{r.status || "-"}</span></Td>
                <Td style={{ fontSize: 10, color: "#8a8a9a" }}>{(r.last_update || "-").slice(0, 16)}</Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Main TabCoverage ──────────────────────────────────────────────────────────
function TabCoverage({ coverage, navigateTo }) {
  const [subTab,        setSubTab]        = useState("not_monitored");
  const [search,        setSearch]        = useState("");
  const [filterWilayah, setFilterWilayah] = useState("");
  const [sortKey,       setSortKey]       = useState("id");
  const [page,          setPage]          = useState(1);
  const PAGE_SIZE  = 10;
  const chartReady = useChartJs();

  if (!coverage) {
    return (
      <div style={{ color: "#8a8a9a", padding: "40px 20px", textAlign: "center", fontSize: 13 }}>
        Data perbandingan tidak tersedia. Pastikan ATM Master sudah diimport dan ada data upload.
      </div>
    );
  }

  const {
    summary,
    not_monitored  = [],
    not_in_master  = [],
    matched_detail = [],
    wilayah_breakdown = [],
  } = coverage;

  // ── Filter & sort ───────────────────────────────────────────────────────────
  const rawData = subTab === "not_monitored" ? not_monitored
    : subTab === "not_in_master" ? not_in_master
    : matched_detail;

  const filtered = rawData.filter(r => {
    const id  = (r.id_atm || "").toLowerCase();
    const lok = (r.lokasi_atm || r.lokasi || "").toLowerCase();
    const wil = (r.wilayah || "").toLowerCase();
    const q   = search.toLowerCase();
    return (!q || id.includes(q) || lok.includes(q) || wil.includes(q))
        && (!filterWilayah || r.wilayah === filterWilayah);
  }).sort((a, b) => {
    if (sortKey === "wilayah")    return (a.wilayah || "").localeCompare(b.wilayah || "");
    if (sortKey === "limit_desc") return (b.limit || 0) - (a.limit || 0);
    if (sortKey === "pct_asc")    return (a.pct_saldo || 0) - (b.pct_saldo || 0);
    return (a.id_atm || "").localeCompare(b.id_atm || "");
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const wilayahOpts = [...new Set(rawData.map(r => r.wilayah).filter(Boolean))];

  function handleSubtab(tab) {
    setSubTab(tab); setSearch(""); setFilterWilayah(""); setSortKey("id"); setPage(1);
  }

  function exportCSV() {
    if (!filtered.length) return;
    const keys   = Object.keys(filtered[0]);
    const header = keys.join(",");
    const rows   = filtered.map(r => keys.map(k => JSON.stringify(r[k] ?? "")).join(","));
    const blob   = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const a      = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(blob),
      download: `atm_${subTab}_${new Date().toISOString().slice(0, 10)}.csv`,
    });
    a.click(); URL.revokeObjectURL(a.href);
  }

  const covColor = summary.coverage_pct >= 90 ? "#1D9E75" : summary.coverage_pct >= 70 ? "#EF9F27" : "#E24B4A";

  // ── Shared input/select styles ──────────────────────────────────────────────
  const inputStyle = {
    fontSize: 12, padding: "6px 10px", borderRadius: 7,
    border: "1px solid rgba(99,179,237,0.15)",
    background: "rgba(255,255,255,0.04)", color: "#e2e8f0", outline: "none",
  };

  return (
    <div>
      {/* ── METRIC CARDS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
        {[
          { label: "Total Master SSI",   value: summary.total_master_ssi, color: "#60a5fa",                                                                    sub: "ATM terdaftar di master" },
          { label: "Coverage",           value: `${summary.coverage_pct}%`, color: covColor,                                                                   sub: "Termonitor dari master"  },
          { label: "Belum ada upload",   value: summary.not_monitored, color: "#EF9F27",                                                                    sub: "Di master, belum diupload" },
          { label: "Tidak di Master",    value: summary.not_in_master, color: summary.not_in_master > 0 ? "#E24B4A" : "#1D9E75",                           sub: "Di upload, tak ada di master" },
        ].map(c => (
          <div key={c.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(99,179,237,0.08)", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 18, color: c.color, marginBottom: 6 }}>{c.icon}</div>
            <div style={{ color: c.color, fontSize: 24, fontWeight: 700, lineHeight: 1.1 }}>{c.value}</div>
            <div style={{ color: "#e2e8f0", fontSize: 12, marginTop: 4, fontWeight: 600 }}>{c.label}</div>
            <div style={{ color: "#8a8a9a", fontSize: 11, marginTop: 2 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* ── INSIGHT PANEL ── */}
      <InsightPanel coverage={coverage} />

      {/* ── ROW 1: Donut + Heatmap ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <SectionCard>
          <SectionHeader title="Coverage overview"
            right={<span style={{ fontSize: 12, fontWeight: 700, color: covColor }}>{summary.coverage_pct}%</span>}
          />
          <CoverageDonutChart summary={summary} chartReady={chartReady} />
        </SectionCard>

        <SectionCard>
          <SectionHeader title="Status per wilayah" />
          <WilayahHeatmap breakdown={wilayah_breakdown} />
        </SectionCard>
      </div>

      {/* ── ROW 2: Bar chart + Goals ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <SectionCard>
          <SectionHeader title="Distribusi ATM per wilayah"/>
          <WilayahBarChart breakdown={wilayah_breakdown} chartReady={chartReady} />
        </SectionCard>

        <SectionCard>
          <SectionHeader title="Coverage goal tracker"/>
          <CoverageGoals summary={summary} />
        </SectionCard>
      </div>

      {/* ── DETAIL TABLE ── */}
      <SectionCard>
        <SectionHeader title="Detail ATM"
          right={
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "#8a8a9a" }}>{filtered.length} ATM</span>
              <button onClick={exportCSV} style={{
                fontSize: 11, padding: "4px 12px", borderRadius: 6,
                border: "1px solid rgba(56,130,221,0.3)", background: "rgba(56,130,221,0.08)",
                color: "#60a5fa", cursor: "pointer",
              }}>⬇ Export CSV</button>
            </div>
          }
        />

        {/* Subtabs */}
        <div style={{ display: "flex", gap: 6, padding: "12px 16px 0" }}>
          {[
            { key: "not_monitored", label: `Belum ada upload (${not_monitored.length})`,    color: "#EF9F27" },
            { key: "not_in_master", label: `Tidak di Master (${not_in_master.length})`,     color: "#E24B4A" },
            { key: "matched",       label: `Termonitor (${matched_detail.length || summary.matched})`, color: "#1D9E75" },
          ].map(t => (
            <button key={t.key} onClick={() => handleSubtab(t.key)} style={{
              padding: "6px 14px", borderRadius: 7, fontSize: 12, cursor: "pointer",
              background: subTab === t.key ? `${t.color}18` : "transparent",
              border:     subTab === t.key ? `1px solid ${t.color}44` : "1px solid rgba(99,179,237,0.1)",
              color:      subTab === t.key ? t.color : "#8a8a9a",
              fontWeight: subTab === t.key ? 700 : 400,
            }}>{t.label}</button>
          ))}
        </div>

        {/* Toolbar */}
        <div style={{
          padding: "10px 16px", display: "flex", gap: 8, alignItems: "center",
          borderBottom: "1px solid rgba(99,179,237,0.08)", flexWrap: "wrap",
        }}>
          <input
            placeholder="Cari ID ATM, lokasi, wilayah..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ ...inputStyle, flex: 1, minWidth: 180 }}
          />
          <select value={filterWilayah} onChange={e => { setFilterWilayah(e.target.value); setPage(1); }} style={inputStyle}>
            <option value="">Semua wilayah</option>
            {wilayahOpts.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
          <select value={sortKey} onChange={e => { setSortKey(e.target.value); setPage(1); }} style={inputStyle}>
            <option value="id">Urut: ID ATM</option>
            <option value="wilayah">Urut: Wilayah</option>
            <option value="limit_desc">Urut: Limit ↓</option>
            <option value="pct_asc">Urut: % Saldo ↑</option>
          </select>
          <button onClick={() => { setSearch(""); setFilterWilayah(""); setSortKey("id"); setPage(1); }} style={{
            ...inputStyle, cursor: "pointer", padding: "6px 12px",
          }}>↺ Reset</button>
        </div>

        {/* Table content */}
        {subTab === "not_monitored" && <TableNotMonitored data={pageData} />}
        {subTab === "not_in_master" && <TableNotInMaster  data={pageData} />}
        {subTab === "matched"       && <TableMatched       data={pageData} />}

        {/* Pagination */}
        {filtered.length > PAGE_SIZE && (
          <div style={{
            padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
            borderTop: "1px solid rgba(99,179,237,0.08)", fontSize: 12, color: "#8a8a9a",
          }}>
            <span>
              Menampilkan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length}
            </span>
            <div style={{ display: "flex", gap: 4 }}>
              {[
                { label: "← Prev", dir: -1, disabled: page <= 1 },
                { label: "Next →", dir:  1, disabled: page >= totalPages },
              ].map(b => (
                <button key={b.label} disabled={b.disabled} onClick={() => setPage(p => p + b.dir)} style={{
                  padding: "3px 10px", borderRadius: 6,
                  border: "1px solid rgba(99,179,237,0.12)", background: "transparent",
                  color: b.disabled ? "#4a4a5a" : "#e2e8f0",
                  cursor: b.disabled ? "default" : "pointer", fontSize: 12,
                }}>{b.label}</button>
              ))}
              <span style={{ padding: "3px 10px", fontSize: 12 }}>{page}/{totalPages}</span>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function CoverageRing({ pct }) {
  const r     = 36;
  const c     = 2 * Math.PI * r;
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