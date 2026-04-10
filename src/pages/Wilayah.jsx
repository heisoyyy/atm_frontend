// src/pages/Wilayah.jsx
import { useState, useEffect } from "react";
import { apiFetch, fmt, STATUS_COLOR, STATUS_BG } from "../utils/api";

// ── Threshold (konsisten dengan halaman lain) ─────────────
const THR_BONGKAR = 20;
const THR_AWAS    = 30;
const THR_TRIGGER = 35;

export default function Wilayah({ navigateTo }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [active,  setActive]  = useState(null);
  const [search,  setSearch]  = useState("");

  useEffect(() => {
    apiFetch("/api/wilayah")
      .then(r => {
        setData(r);
        setLoading(false);
        // Set wilayah pertama sebagai default
        const keys = Object.keys(r.data || {});
        if (keys.length > 0) setActive(keys[0]);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (!data)   return (
    <div style={{ color: "#E24B4A", padding: 20 }}>Gagal memuat data wilayah.</div>
  );

  const wilayahList = data.wilayah_list || [];
  const allAtms     = active ? (data.data[active] || []) : [];

  // Filter search
  const atmList = search
    ? allAtms.filter(a =>
        a.id_atm?.toLowerCase().includes(search.toLowerCase()) ||
        a.lokasi?.toLowerCase().includes(search.toLowerCase())
      )
    : allAtms;

  // Sort by skor_urgensi
  const sortedAtms = [...atmList].sort((a, b) => (b.skor_urgensi || 0) - (a.skor_urgensi || 0));

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: "#e2e8f0", fontSize: 24, fontWeight: 700, margin: "0 0 4px", letterSpacing: "-0.02em" }}>
          Peta Wilayah
        </h1>
        <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>
          ATM per wilayah operasional BRK Syariah
        </p>
      </div>

      {/* Wilayah Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {wilayahList.map(w => {
          const atms    = data.data[w] || [];
          const bongkar = atms.filter(a => a.status === "BONGKAR").length;
          const awas    = atms.filter(a => a.status === "AWAS").length;
          const pantau  = atms.filter(a => a.status === "PERLU PANTAU").length;
          const isActive = active === w;

          return (
            <button key={w} onClick={() => { setActive(w); setSearch(""); }} style={{
              background: isActive ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.02)",
              border: isActive
                ? "1px solid rgba(59,130,246,0.4)"
                : bongkar > 0
                ? "1px solid rgba(226,75,74,0.3)"
                : "1px solid rgba(99,179,237,0.08)",
              borderRadius: 10, padding: "10px 20px",
              cursor: "pointer", transition: "all 0.15s", textAlign: "left",
            }}>
              <div style={{ color: isActive ? "#60a5fa" : "#94a3b8", fontWeight: 700, fontSize: 14 }}>
                {w}
              </div>
              <div style={{ fontSize: 11, marginTop: 3, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={{ color: "#64748b" }}>{atms.length} ATM</span>
                {bongkar > 0 && (
                  <span style={{ color: "#E24B4A", fontWeight: 600 }}>⚠ {bongkar} BONGKAR</span>
                )}
                {awas > 0 && (
                  <span style={{ color: "#EF9F27", fontWeight: 600 }}>⊕ {awas} AWAS</span>
                )}
                {pantau > 0 && (
                  <span style={{ color: "#d4b800", fontWeight: 600 }}>◎ {pantau} PANTAU</span>
                )}
                {bongkar === 0 && awas === 0 && pantau === 0 && (
                  <span style={{ color: "#1D9E75" }}>✓ Aman</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Active wilayah content */}
      {active && (
        <>
          {/* Wilayah summary bar */}
          <div style={{
            display: "flex", gap: 12, marginBottom: 16,
            padding: "12px 16px",
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(99,179,237,0.06)",
            borderRadius: 10, flexWrap: "wrap", alignItems: "center",
          }}>
            <span style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600 }}>{active}</span>
            <span style={{ color: "#475569", fontSize: 12 }}>—</span>
            {[
              { label: "Total",         value: allAtms.length,                                     color: "#94a3b8" },
              { label: "BONGKAR",       value: allAtms.filter(a => a.status === "BONGKAR").length, color: "#E24B4A" },
              { label: "AWAS",          value: allAtms.filter(a => a.status === "AWAS").length,    color: "#EF9F27" },
              { label: "PERLU PANTAU",  value: allAtms.filter(a => a.status === "PERLU PANTAU").length, color: "#d4b800" },
              { label: "AMAN",          value: allAtms.filter(a => a.status === "AMAN").length,    color: "#1D9E75" },
              { label: "ATM Sepi",      value: allAtms.filter(a => a.atm_sepi).length,             color: "#7F77DD" },
            ].map(s => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ color: s.color, fontSize: 15, fontWeight: 700 }}>{s.value}</span>
                <span style={{ color: "#475569", fontSize: 11 }}>{s.label}</span>
              </div>
            ))}

            {/* Search */}
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari ID / lokasi..."
              style={{
                marginLeft: "auto",
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(99,179,237,0.15)",
                borderRadius: 7, color: "#e2e8f0", padding: "6px 12px",
                fontSize: 12, outline: "none", width: 180,
              }}
            />
          </div>

          {/* Threshold legend */}
          <div style={{
            display: "flex", gap: 16, marginBottom: 14,
            flexWrap: "wrap", alignItems: "center",
          }}>
            <span style={{ color: "#475569", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Threshold:
            </span>
            {[
              { label: "BONGKAR",      color: "#E24B4A", desc: `≤${THR_BONGKAR}%` },
              { label: "AWAS",         color: "#EF9F27", desc: `${THR_BONGKAR}–${THR_AWAS}%` },
              { label: "PERLU PANTAU", color: "#d4b800", desc: `${THR_AWAS}–${THR_TRIGGER}%` },
              { label: "AMAN",         color: "#1D9E75", desc: `>${THR_TRIGGER}%` },
            ].map(s => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, display: "inline-block" }} />
                <span style={{ color: s.color, fontSize: 11, fontWeight: 600 }}>{s.label}</span>
                <span style={{ color: "#475569", fontSize: 11 }}>{s.desc}</span>
              </div>
            ))}
          </div>

          {/* ATM Grid */}
          {sortedAtms.length === 0 ? (
            <div style={{ color: "#64748b", padding: "40px 20px", textAlign: "center", fontSize: 13 }}>
              Tidak ada ATM yang sesuai pencarian.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
              {sortedAtms.map(atm => {
                const sc       = STATUS_COLOR[atm.status] || "#6b7280";
                const isBongkar = atm.status === "BONGKAR";
                const isAwas    = atm.status === "AWAS";
                const isPantau  = atm.status === "PERLU PANTAU";

                const barColor = atm.pct_saldo <= THR_BONGKAR
                  ? "#E24B4A"
                  : atm.pct_saldo <= THR_AWAS
                  ? "#EF9F27"
                  : atm.pct_saldo <= THR_TRIGGER
                  ? "#d4b800"
                  : "#1D9E75";

                return (
                  <button
                    key={atm.id_atm}
                    onClick={() => navigateTo && navigateTo("history", atm.id_atm)}
                    style={{
                      background: isBongkar
                        ? "rgba(226,75,74,0.04)"
                        : isAwas
                        ? "rgba(239,159,39,0.03)"
                        : "rgba(255,255,255,0.02)",
                      border: isBongkar
                        ? "1px solid rgba(226,75,74,0.3)"
                        : isAwas
                        ? "1px solid rgba(239,159,39,0.2)"
                        : isPantau
                        ? "1px solid rgba(212,184,0,0.15)"
                        : "1px solid rgba(99,179,237,0.08)",
                      borderLeft: `3px solid ${sc}`,
                      borderRadius: 10, padding: "12px 14px",
                      cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = "rgba(59,130,246,0.06)";
                      e.currentTarget.style.borderColor = "rgba(59,130,246,0.25)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = isBongkar
                        ? "rgba(226,75,74,0.04)"
                        : isAwas
                        ? "rgba(239,159,39,0.03)"
                        : "rgba(255,255,255,0.02)";
                      e.currentTarget.style.borderColor = isBongkar
                        ? "rgba(226,75,74,0.3)"
                        : isAwas
                        ? "rgba(239,159,39,0.2)"
                        : "rgba(99,179,237,0.08)";
                    }}
                  >
                    {/* Header row */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 13, fontFamily: "monospace" }}>
                        {atm.id_atm}
                      </span>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4,
                        background: `${sc}18`, color: sc,
                      }}>
                        {atm.tipe || "-"}
                      </span>
                    </div>

                    {/* Lokasi */}
                    <div style={{
                      color: "#64748b", fontSize: 11, marginBottom: 8,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {atm.lokasi || "-"}
                    </div>

                    {/* Saldo bar */}
                    <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, marginBottom: 6 }}>
                      <div style={{
                        height: "100%",
                        width: `${Math.min(atm.pct_saldo || 0, 100)}%`,
                        background: barColor,
                        borderRadius: 2, transition: "width 0.3s",
                      }} />
                    </div>

                    {/* Bottom row */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: barColor, fontSize: 11, fontWeight: 600 }}>
                        {atm.pct_saldo?.toFixed(0) ?? "-"}%
                      </span>
                      <span style={{
                        color: sc, fontSize: 10, fontWeight: 600,
                        padding: "1px 6px", background: `${sc}12`, borderRadius: 3,
                      }}>
                        {atm.status}
                      </span>
                    </div>

                    {/* Badges */}
                    <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                      {atm.atm_sepi && (
                        <span style={{ color: "#7F77DD", fontSize: 9, fontWeight: 600,
                          background: "rgba(127,119,221,0.1)", padding: "1px 5px", borderRadius: 3,
                          border: "1px solid rgba(127,119,221,0.2)" }}>
                          ◐ SEPI
                        </span>
                      )}
                      {atm.skor_urgensi > 70 && (
                        <span style={{ color: "#E24B4A", fontSize: 9, fontWeight: 600,
                          background: "rgba(226,75,74,0.08)", padding: "1px 5px", borderRadius: 3 }}>
                          URGENSI {atm.skor_urgensi?.toFixed(0)}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 12, color: "#64748b" }}>
      <div style={{ width: 32, height: 32, border: "2px solid rgba(59,130,246,0.2)", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <span>Memuat data wilayah...</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}