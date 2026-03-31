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
  <div style={{ color: "#64748b", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
    {children}
  </div>
);

export default function Dashboard({ navigateTo }) {
  const [summary, setSummary] = useState(null);
  const [status, setStatus]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr]         = useState(null);

  useEffect(() => {
    Promise.all([
      apiFetch("/api/summary").catch(() => null),
      apiFetch("/api/status").catch(() => null),
    ]).then(([s, st]) => {
      setSummary(s);
      setStatus(st);
      setLoading(false);
    }).catch(e => { setErr(e.message); setLoading(false); });
  }, []);

  if (loading) return <LoadingState />;
  if (err || !summary) return <EmptyState navigateTo={navigateTo} />;

  const ov = summary.overall;
  const total = ov.total_atm || 1;

  const statCards = [
    { label: "Total ATM",     value: ov.total_atm,    color: "#60a5fa", icon: "◈" },
    { label: "KRITIS",        value: ov.kritis,        color: "#ff3b5c", icon: "⚠" },
    { label: "Segera Isi",    value: ov.segera_isi,    color: "#ff8c00", icon: "⊕" },
    { label: "Perlu Pantau",  value: ov.perlu_pantau,  color: "#f5c518", icon: "◎" },
    { label: "Aman",          value: ov.aman,          color: "#00e5a0", icon: "✓" },
    { label: "ATM Sepi",      value: ov.atm_sepi,      color: "#a78bfa", icon: "◐" },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ color: "#e2e8f0", fontSize: 26, fontWeight: 700, margin: "0 0 4px", letterSpacing: "-0.02em" }}>
              Dashboard Monitoring
            </h1>
            <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>
              BRK Syariah — {ov.total_atm} ATM aktif · Diperbarui {summary.generated_at ? new Date(summary.generated_at).toLocaleString("id-ID") : "-"}
            </p>
          </div>
          {ov.kritis > 0 && (
            <button onClick={() => navigateTo("alerts")} style={{
              background: "rgba(255,59,92,0.15)", border: "1px solid rgba(255,59,92,0.4)",
              borderRadius: 8, color: "#ff3b5c", padding: "8px 16px", fontSize: 13,
              cursor: "pointer", fontWeight: 600,
              animation: "pulse 2s infinite",
            }}>
              ⚠ {ov.kritis} ATM KRITIS
            </button>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginBottom: 24 }}>
        {statCards.map(c => (
          <Card key={c.label} style={{ textAlign: "center", padding: "16px 12px" }}>
            <div style={{ fontSize: 20, color: c.color, marginBottom: 8 }}>{c.icon}</div>
            <div style={{ color: c.color, fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{c.value ?? "-"}</div>
            <div style={{ color: "#64748b", fontSize: 10, marginTop: 6, letterSpacing: "0.08em", textTransform: "uppercase" }}>{c.label}</div>
          </Card>
        ))}
      </div>

      {/* Middle row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Status Distribution */}
        <Card>
          <Label>Distribusi Status ATM</Label>
          <div style={{ marginTop: 16 }}>
            {Object.entries(ov.status_breakdown || {}).map(([status, count]) => {
              const pct = (count / total * 100).toFixed(1);
              const col = STATUS_COLOR[status] || "#6b7280";
              return (
                <div key={status} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: col, fontSize: 12, fontWeight: 600 }}>{status}</span>
                    <span style={{ color: "#94a3b8", fontSize: 12 }}>{count} ({pct}%)</span>
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
          <div style={{ marginTop: 12 }}>
            {(summary.per_wilayah || []).map(w => (
              <div key={w.wilayah} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 14px", marginBottom: 8,
                background: "rgba(255,255,255,0.03)", borderRadius: 8,
                border: "1px solid rgba(99,179,237,0.06)",
              }}>
                <div>
                  <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>{w.wilayah}</div>
                  <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>
                    {w.total} ATM · Rata-rata {w.avg_pct_saldo?.toFixed(1)}%
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {w.kritis > 0 && (
                    <span style={{ background: "rgba(255,59,92,0.15)", color: "#ff3b5c", fontSize: 11, padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>
                      {w.kritis} KRITIS
                    </span>
                  )}
                  {w.segera_isi > 0 && (
                    <span style={{ background: "rgba(255,140,0,0.12)", color: "#ff8c00", fontSize: 11, padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>
                      {w.segera_isi} SEGERA
                    </span>
                  )}
                  {w.kritis === 0 && w.segera_isi === 0 && (
                    <span style={{ color: "#00e5a0", fontSize: 11 }}>✓ Aman</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* System Status */}
      <Card>
        <Label>Status Sistem</Label>
        <div style={{ display: "flex", gap: 32, marginTop: 12, flexWrap: "wrap" }}>
          {[
            { label: "Data", ok: status?.has_data },
            { label: "Model XGBoost", ok: status?.has_model },
            { label: "Cache Prediksi", ok: status?.has_cache },
          ].map(s => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.ok ? "#00e5a0" : "#ff3b5c", boxShadow: `0 0 6px ${s.ok ? "#00e5a0" : "#ff3b5c"}` }} />
              <span style={{ color: s.ok ? "#94a3b8" : "#ff3b5c", fontSize: 13 }}>{s.label}</span>
            </div>
          ))}
          {status?.date_range && (
            <div style={{ color: "#64748b", fontSize: 12, marginLeft: "auto" }}>
              Data: {status.date_range.from} → {status.date_range.to}
              <span style={{ marginLeft: 16 }}>{status.total_atm} ATM · {status.total_rows?.toLocaleString()} rows</span>
            </div>
          )}
        </div>
      </Card>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
      `}</style>
    </div>
  );
}

function LoadingState() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: "#64748b", flexDirection: "column", gap: 12 }}>
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
      <h2 style={{ color: "#94a3b8", fontWeight: 600, margin: 0 }}>Belum Ada Data</h2>
      <p style={{ color: "#64748b", margin: 0, fontSize: 14 }}>Upload file processed_data.csv terlebih dahulu</p>
      <button onClick={() => navigateTo("upload")} style={{
        background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.4)",
        borderRadius: 8, color: "#60a5fa", padding: "10px 20px", fontSize: 13,
        cursor: "pointer", fontWeight: 600,
      }}>Upload Data →</button>
    </div>
  );
}
