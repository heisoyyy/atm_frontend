// src/pages/Wilayah.jsx
import { useState, useEffect } from "react";
import { apiFetch, fmt, STATUS_COLOR } from "../utils/api";

export default function Wilayah({ navigateTo }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive]   = useState(null);

  useEffect(() => {
    apiFetch("/api/wilayah")
      .then(r => { setData(r); setLoading(false); setActive(Object.keys(r.data || {})[0]); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (!data)   return <div style={{ color: "#ff3b5c", padding: 20 }}>Gagal memuat data wilayah.</div>;

  const wilayahList = data.wilayah_list || [];
  const atmList     = active ? (data.data[active] || []) : [];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: "#e2e8f0", fontSize: 24, fontWeight: 700, margin: "0 0 4px", letterSpacing: "-0.02em" }}>
          Peta Wilayah
        </h1>
        <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>ATM per wilayah operasional BRK Syariah</p>
      </div>

      {/* Wilayah Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {wilayahList.map(w => {
          const atms = data.data[w] || [];
          const kritis = atms.filter(a => a.status === "KRITIS").length;
          const segera  = atms.filter(a => a.status === "SEGERA ISI").length;
          const isActive = active === w;
          return (
            <button key={w} onClick={() => setActive(w)} style={{
              background: isActive ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.02)",
              border: isActive ? "1px solid rgba(59,130,246,0.4)" : "1px solid rgba(99,179,237,0.08)",
              borderRadius: 10, padding: "10px 20px",
              cursor: "pointer", transition: "all 0.15s",
              textAlign: "left",
            }}>
              <div style={{ color: isActive ? "#60a5fa" : "#94a3b8", fontWeight: 700, fontSize: 14 }}>{w}</div>
              <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>
                {atms.length} ATM
                {kritis > 0  && <span style={{ color: "#ff3b5c", marginLeft: 8 }}>⚠ {kritis} KRITIS</span>}
                {segera > 0  && <span style={{ color: "#ff8c00", marginLeft: 8 }}>⊕ {segera} SEGERA</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* ATM Grid for selected wilayah */}
      {active && (
        <div>
          <div style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>
            {active} — {atmList.length} ATM
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
            {[...atmList]
              .sort((a, b) => (b.skor_urgensi || 0) - (a.skor_urgensi || 0))
              .map(atm => {
                const sc = STATUS_COLOR[atm.status] || "#6b7280";
                return (
                  <button key={atm.id_atm} onClick={() => navigateTo && navigateTo("history", atm.id_atm)}
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: `1px solid ${atm.status === "KRITIS" ? "rgba(255,59,92,0.3)" : "rgba(99,179,237,0.08)"}`,
                      borderRadius: 10, padding: "12px 14px",
                      cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(59,130,246,0.06)"; e.currentTarget.style.borderColor = "rgba(59,130,246,0.25)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor = atm.status === "KRITIS" ? "rgba(255,59,92,0.3)" : "rgba(99,179,237,0.08)"; }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 13, fontFamily: "monospace" }}>{atm.id_atm}</span>
                      <span style={{ color: sc, fontSize: 10, fontWeight: 600, padding: "2px 7px", background: `${sc}18`, borderRadius: 4 }}>{atm.tipe}</span>
                    </div>
                    <div style={{ color: "#64748b", fontSize: 11, marginBottom: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {atm.lokasi || "-"}
                    </div>
                    {/* Saldo bar */}
                    <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, marginBottom: 6 }}>
                      <div style={{
                        height: "100%",
                        width: `${Math.min(atm.pct_saldo || 0, 100)}%`,
                        background: atm.pct_saldo <= 20 ? "#ff3b5c" : atm.pct_saldo <= 40 ? "#f5c518" : "#00e5a0",
                        borderRadius: 2,
                      }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "#94a3b8", fontSize: 11 }}>{atm.pct_saldo?.toFixed(0)}% saldo</span>
                      <span style={{ color: sc, fontSize: 11, fontWeight: 600 }}>{atm.status}</span>
                    </div>
                    {atm.atm_sepi && (
                      <div style={{ marginTop: 6, color: "#a78bfa", fontSize: 10, fontWeight: 600 }}>◐ ATM Sepi</div>
                    )}
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 12, color: "#64748b" }}>
      <div style={{ width: 32, height: 32, border: "2px solid rgba(59,130,246,0.2)", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
