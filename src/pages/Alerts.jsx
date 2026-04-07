// src/pages/Alerts.jsx
import { useState, useEffect } from "react";
import { apiFetch, fmt, STATUS_COLOR, STATUS_BG } from "../utils/api";

const LEVEL_TABS = ["Semua", "BONGKAR", "AWAS" , "PERLU PANTAU"];

export default function Alerts({ navigateTo }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState("Semua");
  const [ts, setTs] = useState(null);

  const fetchAlerts = () => {
    setLoading(true);
    const q = level !== "Semua" ? `?level=${encodeURIComponent(level)}` : "";
    apiFetch(`/api/alerts${q}`)
      .then(r => { setAlerts(r.data || []); setTs(r.generated_at); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchAlerts(); }, [level]);

  const kritis = alerts.filter(a => a.status === "KRITIS");
  const segera = alerts.filter(a => a.status === "SEGERA ISI");

  if (loading) return <Spinner />;

  return (
    <div>
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

      {/* Level filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {LEVEL_TABS.map(l => (
          <button key={l} onClick={() => setLevel(l)} style={{
            background: level === l ? "rgba(59,130,246,0.15)" : "transparent",
            border: level === l ? "1px solid rgba(59,130,246,0.3)" : "1px solid rgba(99,179,237,0.1)",
            borderRadius: 8, color: level === l ? "#60a5fa" : "#64748b",
            padding: "7px 16px", fontSize: 13, cursor: "pointer", fontWeight: level === l ? 600 : 400,
          }}>{l}</button>
        ))}
      </div>

      {alerts.length === 0 ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          height: 300, color: "#64748b", gap: 12,
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
    </div>
  );
}

function AlertCard({ atm, rank, navigateTo }) {
  const sc  = STATUS_COLOR[atm.status] || "#6b7280";
  const sb  = STATUS_BG[atm.status] || "transparent";
  const urgent = atm.status === "KRITIS";

  return (
    <div style={{
      background: urgent ? "rgba(255,59,92,0.04)" : "rgba(255,255,255,0.02)",
      border: `1px solid ${urgent ? "rgba(255,59,92,0.2)" : "rgba(99,179,237,0.08)"}`,
      borderRadius: 12,
      padding: "16px 20px",
      display: "flex", alignItems: "center", gap: 20,
      transition: "all 0.15s",
      animation: urgent ? "pulse-border 2s infinite" : "none",
    }}>
      {/* Rank + Status */}
      <div style={{ textAlign: "center", minWidth: 48 }}>
        <div style={{ color: "#64748b", fontSize: 11 }}>#{rank}</div>
        <div style={{ color: sc, fontSize: 20, marginTop: 4 }}>{urgent ? "⚠" : "⊕"}</div>
      </div>

      {/* ATM Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <span style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 15, fontFamily: "monospace" }}>{atm.id_atm}</span>
          <span style={{ background: sb, color: sc, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, border: `1px solid ${sc}33` }}>
            {atm.status}
          </span>
          <span style={{ color: "#64748b", fontSize: 11 }}>{atm.tipe}</span>
        </div>
        <div style={{ color: "#64748b", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          📍 {atm.lokasi || "-"} · {atm.wilayah}
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
        <Metric label="Saldo" value={fmt.rupiah(atm.saldo)} sub={`${atm.pct_saldo?.toFixed(1)}%`} color={atm.pct_saldo < 20 ? "#ff3b5c" : "#f5c518"} />
        <Metric label="Est. Habis" value={fmt.jam(atm.est_jam)} sub={atm.tgl_habis || "-"} color={sc} />
        <Metric label="Jadwal Isi" value={atm.tgl_isi || "-"} sub={atm.jam_isi || "-"} color="#94a3b8" />
        <Metric label="Laju Tarik" value={fmt.rupiah(atm.tarik_per_jam)} sub="/jam" color="#64748b" />
      </div>

      {/* Action */}
      <button onClick={() => navigateTo("history", atm.id_atm)} style={{
        background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)",
        borderRadius: 8, color: "#60a5fa", padding: "8px 16px", fontSize: 12,
        cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap",
      }}>Lihat Detail →</button>
    </div>
  );
}

function Metric({ label, value, sub, color }) {
  return (
    <div style={{ textAlign: "center", minWidth: 80 }}>
      <div style={{ color: "#64748b", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{label}</div>
      <div style={{ color: color || "#e2e8f0", fontWeight: 600, fontSize: 14 }}>{value}</div>
      <div style={{ color: "#64748b", fontSize: 11 }}>{sub}</div>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 12, color: "#64748b" }}>
      <div style={{ width: 32, height: 32, border: "2px solid rgba(59,130,246,0.2)", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse-border{0%,100%{border-color:rgba(255,59,92,0.2)}50%{border-color:rgba(255,59,92,0.5)}}`}</style>
    </div>
  );
}
