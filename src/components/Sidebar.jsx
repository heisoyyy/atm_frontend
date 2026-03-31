const NAV = [
  { id: "dashboard",  label: "Dashboard",   icon: "⬡" },
  { id: "monitoring", label: "Monitoring",  icon: "◈" },
  { id: "alerts",     label: "Alerts",      icon: "◉", hasAlert: true },
  { id: "wilayah",    label: "Wilayah",     icon: "◫" },
  { id: "history",    label: "Historis",    icon: "◷" },
  { id: "upload",     label: "Upload Data", icon: "⇑" },
  { id: "training",   label: "Training",    icon: "⚙" },
];

export default function Sidebar({ page, setPage }) {
  return (
    <nav style={{
      position: "fixed", left: 0, top: 0, bottom: 0, width: 240,
      background: "linear-gradient(180deg, #0d1228 0%, #0a0f1e 100%)",
      borderRight: "1px solid rgba(99,179,237,0.08)",
      display: "flex", flexDirection: "column",
      zIndex: 100,
    }}>
      <div style={{ padding: "28px 24px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36,
            background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
            borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 700, color: "#fff",
            boxShadow: "0 0 20px rgba(59,130,246,0.4)",
          }}>A</div>
          <div>
            <div style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 14, letterSpacing: "0.02em" }}>Smart ATM</div>
            <div style={{ color: "#4a9eff", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase" }}>BRK Syariah</div>
          </div>
        </div>
      </div>
      <div style={{ height: 1, background: "rgba(99,179,237,0.08)", margin: "0 20px 16px" }} />
      <div style={{ flex: 1, padding: "0 12px", overflowY: "auto" }}>
        {NAV.map(n => {
          const active = page === n.id;
          return (
            <button key={n.id} onClick={() => setPage(n.id)} style={{
              display: "flex", alignItems: "center", gap: 12,
              width: "100%", padding: "10px 14px", marginBottom: 4,
              background: active ? "rgba(59,130,246,0.15)" : "transparent",
              border: active ? "1px solid rgba(59,130,246,0.3)" : "1px solid transparent",
              borderRadius: 8,
              color: active ? "#60a5fa" : "#94a3b8",
              fontSize: 13, fontWeight: active ? 600 : 400,
              cursor: "pointer", transition: "all 0.15s",
              letterSpacing: "0.01em", textAlign: "left",
            }}>
              <span style={{ fontSize: 16, opacity: active ? 1 : 0.6 }}>{n.icon}</span>
              {n.label}
              {n.hasAlert && (
                <span style={{
                  marginLeft: "auto", width: 7, height: 7,
                  background: "#ff3b5c", borderRadius: "50%",
                  boxShadow: "0 0 6px #ff3b5c", display: "inline-block",
                  animation: "pulse 2s infinite",
                }} />
              )}
            </button>
          );
        })}
      </div>
      <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(99,179,237,0.08)" }}>
        <div style={{ color: "#374151", fontSize: 11, letterSpacing: "0.06em" }}>v5.0.0 · 2026</div>
      </div>
    </nav>
  );
}
