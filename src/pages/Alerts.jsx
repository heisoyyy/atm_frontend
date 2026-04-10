// src/pages/Alerts.jsx
import { useState, useEffect } from "react";
import { apiFetch, fmt, STATUS_COLOR, STATUS_BG } from "../utils/api";

// ── Threshold (konsisten dengan halaman lain) ─────────────
const THR_BONGKAR = 20;
const THR_AWAS    = 30;
const THR_TRIGGER = 35;

const LEVEL_TABS = ["Semua", "BONGKAR", "AWAS", "PERLU PANTAU"];

export default function Alerts({ navigateTo }) {
  const [alerts,  setAlerts]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [level,   setLevel]   = useState("Semua");
  const [ts,      setTs]      = useState(null);

  const fetchAlerts = () => {
    setLoading(true);
    // Backend hanya support level=BONGKAR atau level=AWAS
    // Untuk PERLU PANTAU dan Semua, fetch dari /api/predictions langsung
    const fetchPromise = (level === "BONGKAR" || level === "AWAS")
      ? apiFetch(`/api/alerts?level=${encodeURIComponent(level)}`)
      : level === "PERLU PANTAU"
        ? apiFetch("/api/predictions?status=PERLU+PANTAU&limit=500").then(r => ({
            data:         r.data || [],
            generated_at: r.generated_at,
            total_alerts: r.total,
            breakdown:    { "PERLU PANTAU": r.total },
          }))
        : apiFetch("/api/alerts"); // Semua = BONGKAR + AWAS

    fetchPromise
      .then(r => {
        let data = r.data || [];
        // Jika Semua, tambahkan PERLU PANTAU juga
        if (level === "Semua") {
          return apiFetch("/api/predictions?status=PERLU+PANTAU&limit=500")
            .then(pp => {
              const combined = [...data, ...(pp.data || [])];
              combined.sort((a, b) => (b.skor_urgensi || 0) - (a.skor_urgensi || 0));
              setAlerts(combined);
              setTs(r.generated_at);
              setLoading(false);
            })
            .catch(() => {
              setAlerts(data);
              setTs(r.generated_at);
              setLoading(false);
            });
        }
        setAlerts(data);
        setTs(r.generated_at);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchAlerts(); }, [level]);

  // ── Hitung breakdown ──────────────────────────────────
  const breakdown = {
    BONGKAR:        alerts.filter(a => a.status === "BONGKAR").length,
    AWAS:           alerts.filter(a => a.status === "AWAS").length,
    "PERLU PANTAU": alerts.filter(a => a.status === "PERLU PANTAU").length,
  };

  if (loading) return <Spinner />;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ color: "#e2e8f0", fontSize: 24, fontWeight: 700, margin: "0 0 4px", letterSpacing: "-0.02em" }}>
            Alerts & Prioritas
          </h1>
          <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>
            {alerts.length} ATM perlu perhatian · {ts ? new Date(ts).toLocaleString("id-ID") : "-"}
          </p>
        </div>
        <button onClick={fetchAlerts} style={{
          background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)",
          borderRadius: 8, color: "#60a5fa", padding: "8px 16px", fontSize: 13,
          cursor: "pointer", fontWeight: 600,
        }}>↺ Refresh</button>
      </div>

      {/* Breakdown badges */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { key: "BONGKAR",      color: "#E24B4A", bg: "rgba(226,75,74,0.1)",   border: "rgba(226,75,74,0.3)",   desc: `≤${THR_BONGKAR}%` },
          { key: "AWAS",         color: "#EF9F27", bg: "rgba(239,159,39,0.1)",  border: "rgba(239,159,39,0.3)",  desc: `${THR_BONGKAR}–${THR_AWAS}%` },
          { key: "PERLU PANTAU", color: "#d4b800", bg: "rgba(212,184,0,0.08)",  border: "rgba(212,184,0,0.3)",   desc: `${THR_AWAS}–${THR_TRIGGER}%` },
        ].map(s => (
          <div key={s.key} style={{
            background: s.bg, border: `1px solid ${s.border}`,
            borderRadius: 8, padding: "8px 16px",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ color: s.color, fontSize: 20, fontWeight: 700 }}>{breakdown[s.key]}</span>
            <div>
              <div style={{ color: s.color, fontSize: 11, fontWeight: 600 }}>{s.key}</div>
              <div style={{ color: "#475569", fontSize: 10 }}>{s.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Level filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {LEVEL_TABS.map(l => (
          <button key={l} onClick={() => setLevel(l)} style={{
            background: level === l ? "rgba(59,130,246,0.15)" : "transparent",
            border: level === l ? "1px solid rgba(59,130,246,0.3)" : "1px solid rgba(99,179,237,0.1)",
            borderRadius: 8, color: level === l ? "#60a5fa" : "#64748b",
            padding: "7px 16px", fontSize: 13, cursor: "pointer",
            fontWeight: level === l ? 600 : 400,
          }}>{l}</button>
        ))}
      </div>

      {/* Alert list */}
      {alerts.length === 0 ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", height: 300, color: "#64748b", gap: 12,
          background: "rgba(0,229,160,0.04)", border: "1px solid rgba(0,229,160,0.1)",
          borderRadius: 12,
        }}>
          <span style={{ fontSize: 36 }}>✓</span>
          <span style={{ color: "#00e5a0", fontWeight: 600, fontSize: 16 }}>Tidak ada alert saat ini</span>
          <span style={{ fontSize: 13 }}>Semua ATM dalam kondisi aman</span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {alerts.map((atm, i) => (
            <AlertCard key={atm.id_atm} atm={atm} rank={i + 1} navigateTo={navigateTo} />
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-border {
          0%,100% { border-color: rgba(226,75,74,0.2); }
          50%      { border-color: rgba(226,75,74,0.5); }
        }
      `}</style>
    </div>
  );
}

// ── Alert Card ─────────────────────────────────────────────
function AlertCard({ atm, rank, navigateTo }) {
  const sc      = STATUS_COLOR[atm.status] || "#6b7280";
  const sb      = STATUS_BG[atm.status]   || "transparent";
  const isBongkar = atm.status === "BONGKAR";
  const isAwas    = atm.status === "AWAS";

  return (
    <div style={{
      background: isBongkar
        ? "rgba(226,75,74,0.04)"
        : isAwas
        ? "rgba(239,159,39,0.03)"
        : "rgba(255,255,255,0.02)",
      border: `1px solid ${isBongkar ? "rgba(226,75,74,0.25)" : isAwas ? "rgba(239,159,39,0.15)" : "rgba(99,179,237,0.08)"}`,
      borderLeft: `3px solid ${sc}`,
      borderRadius: 12,
      padding: "16px 20px",
      display: "flex", alignItems: "center", gap: 20,
      transition: "all 0.15s",
      animation: isBongkar ? "pulse-border 2s infinite" : "none",
    }}>
      {/* Rank + Status icon */}
      <div style={{ textAlign: "center", minWidth: 44 }}>
        <div style={{ color: "#64748b", fontSize: 11 }}>#{rank}</div>
        <div style={{ color: sc, fontSize: 22, marginTop: 4 }}>
          {isBongkar ? "⚠" : isAwas ? "⊕" : "◎"}
        </div>
      </div>

      {/* ATM Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
          <span style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 15, fontFamily: "monospace" }}>
            {atm.id_atm}
          </span>
          <span style={{
            background: sb, color: sc,
            fontSize: 11, fontWeight: 600, padding: "2px 8px",
            borderRadius: 4, border: `1px solid ${sc}33`,
          }}>
            {atm.status}
          </span>
          {atm.tipe && (
            <span style={{ color: "#64748b", fontSize: 11 }}>{atm.tipe}</span>
          )}
          {atm.atm_sepi && (
            <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 3,
              background: "rgba(127,119,221,0.12)", color: "#7F77DD",
              border: "1px solid rgba(127,119,221,0.25)", fontWeight: 600 }}>
              ◐ SEPI
            </span>
          )}
        </div>
        <div style={{ color: "#64748b", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          📍 {atm.lokasi || "-"} · {atm.wilayah || "-"}
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
        <Metric
          label="Saldo"
          value={fmt.rupiah(atm.saldo)}
          sub={`${atm.pct_saldo?.toFixed(1)}%`}
          color={atm.pct_saldo <= THR_BONGKAR ? "#E24B4A" : atm.pct_saldo <= THR_AWAS ? "#EF9F27" : "#d4b800"}
        />
        <Metric
          label="Est. Habis"
          value={fmt.jam(atm.est_jam)}
          sub={atm.tgl_habis || "-"}
          color={sc}
        />
        <Metric
          label="Jadwal Isi"
          value={atm.tgl_isi || "-"}
          sub={atm.jam_isi || "-"}
          color="#94a3b8"
        />
        <Metric
          label="Laju Tarik"
          value={fmt.rupiah(atm.tarik_per_jam)}
          sub="/jam"
          color="#64748b"
        />
        <Metric
          label="Skor"
          value={atm.skor_urgensi?.toFixed(0) ?? "-"}
          sub="/100"
          color={sc}
        />
      </div>

      {/* Action */}
      <button onClick={() => navigateTo("history", atm.id_atm)} style={{
        background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)",
        borderRadius: 8, color: "#60a5fa", padding: "8px 16px", fontSize: 12,
        cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0,
      }}>
        Lihat Detail →
      </button>
    </div>
  );
}

function Metric({ label, value, sub, color }) {
  return (
    <div style={{ textAlign: "center", minWidth: 72 }}>
      <div style={{ color: "#64748b", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ color: color || "#e2e8f0", fontWeight: 600, fontSize: 13 }}>{value}</div>
      <div style={{ color: "#64748b", fontSize: 11 }}>{sub}</div>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 12, color: "#64748b" }}>
      <div style={{ width: 32, height: 32, border: "2px solid rgba(59,130,246,0.2)", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <span>Memuat data alerts...</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}