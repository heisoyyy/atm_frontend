// src/components/Sidebar.jsx
import { useState } from "react";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "⬡" },
  { id: "data",          label: "Data ATM",          icon: "◷" },
  { id: "monitoring",       label: "Monitoring",          icon: "◈" },
  { id: "history",          label: "Historis",          icon: "◷" },
  { id: "cashplan",         label: "Cash Plan",          icon: "◳" },
  { id: "rekapreplacement", label: "Rekap Replacement",  icon: "◳" },
  { id: "upload",           label: "Upload Data",        icon: "⇑" },
  { id: "training",         label: "Training",           icon: "⚙" },
];

export default function Sidebar({ page, setPage, collapsed, setCollapsed }) {
  const [openMenu, setOpenMenu] = useState(null);

  // Tutup dropdown saat sidebar di-collapse
  const handleCollapse = () => {
    setCollapsed(c => !c);
    if (!collapsed) setOpenMenu(null);
  };

  return (
    <>
      {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
      <nav
        style={{
          position:        "fixed",
          left:            0,
          top:             0,
          bottom:          0,
          width:           collapsed ? 64 : 240,
          background:      "linear-gradient(180deg, #0d1228 0%, #0a0f1e 100%)",
          borderRight:     "1px solid rgba(99,179,237,0.08)",
          display:         "flex",
          flexDirection:   "column",
          zIndex:          100,
          transition:      "width 0.3s cubic-bezier(.4,0,.2,1)",
          overflow:        "hidden",
        }}
      >
        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <div
          style={{
            padding:        collapsed ? "24px 14px 20px" : "28px 24px 20px",
            display:        "flex",
            alignItems:     "center",
            justifyContent: collapsed ? "center" : "space-between",
            gap:            10,
            transition:     "padding 0.3s",
            flexShrink:     0,
          }}
        >
          {/* Logo + nama */}
          <div style={{ display:"flex", alignItems:"center", gap:10, overflow:"hidden", minWidth:0 }}>
            <div
              style={{
                width:          36,
                height:         36,
                background:     "linear-gradient(135deg, #3b82f6, #06b6d4)",
                borderRadius:   8,
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                fontSize:       18,
                fontWeight:     700,
                color:          "#fff",
                boxShadow:      "0 0 20px rgba(59,130,246,0.4)",
                flexShrink:     0,
              }}
            >
              A
            </div>
            {!collapsed && (
              <div style={{ overflow:"hidden", whiteSpace:"nowrap" }}>
                <div style={{ color:"#e2e8f0", fontWeight:700, fontSize:14 }}>Smart ATM</div>
                <div style={{ color:"#4a9eff", fontSize:10, textTransform:"uppercase" }}>BRK Syariah</div>
              </div>
            )}
          </div>

          {/* Tombol toggle — hanya muncul saat expanded */}
          {!collapsed && (
            <button
              onClick={handleCollapse}
              title="Tutup sidebar"
              style={{
                background:   "rgba(255,255,255,0.04)",
                border:       "1px solid rgba(99,179,237,0.15)",
                borderRadius: 6,
                color:        "#64748b",
                width:        28,
                height:       28,
                cursor:       "pointer",
                display:      "flex",
                alignItems:   "center",
                justifyContent: "center",
                fontSize:     14,
                flexShrink:   0,
                transition:   "all 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.color="#60a5fa"; e.currentTarget.style.borderColor="rgba(96,165,250,0.35)"; }}
              onMouseLeave={e => { e.currentTarget.style.color="#64748b"; e.currentTarget.style.borderColor="rgba(99,179,237,0.15)"; }}
            >
              ◂
            </button>
          )}
        </div>

        <div style={{ height:1, background:"rgba(99,179,237,0.08)", margin:"0 12px 12px", flexShrink:0 }} />

        {/* ── MENU ────────────────────────────────────────────────────────── */}
        <div style={{ flex:1, padding:"0 8px", overflowY:"auto", overflowX:"hidden" }}>
          {NAV.map(n => {
            const isGroup = !!n.children;
            const isOpen  = openMenu === n.id;

            /* ── DROPDOWN GROUP ── */
            if (isGroup) {
              const groupActive = n.children.some(c => c.id === page);
              return (
                <div key={n.id}>
                  <Tooltip label={collapsed ? n.label : null}>
                    <button
                      onClick={() => {
                        if (collapsed) { setCollapsed(false); setOpenMenu(n.id); return; }
                        setOpenMenu(isOpen ? null : n.id);
                      }}
                      style={{
                        display:        "flex",
                        alignItems:     "center",
                        gap:            12,
                        width:          "100%",
                        padding:        collapsed ? "10px 0" : "10px 14px",
                        marginBottom:   4,
                        justifyContent: collapsed ? "center" : "flex-start",
                        background:     isOpen || groupActive ? "rgba(59,130,246,0.08)" : "transparent",
                        border:         "1px solid transparent",
                        borderRadius:   8,
                        color:          groupActive ? "#60a5fa" : "#94a3b8",
                        fontSize:       collapsed ? 18 : 13,
                        cursor:         "pointer",
                        transition:     "all 0.2s",
                        whiteSpace:     "nowrap",
                        overflow:       "hidden",
                      }}
                    >
                      <span style={{ flexShrink:0 }}>{n.icon}</span>
                      {!collapsed && (
                        <>
                          <span style={{ flex:1, textAlign:"left" }}>{n.label}</span>
                          <span style={{ transition:"transform 0.25s", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", fontSize:10 }}>▸</span>
                        </>
                      )}
                    </button>
                  </Tooltip>

                  {/* Children — hanya render saat expanded */}
                  {!collapsed && (
                    <div
                      style={{
                        maxHeight:  isOpen ? 200 : 0,
                        overflow:   "hidden",
                        transition: "all 0.3s ease",
                        opacity:    isOpen ? 1 : 0,
                      }}
                    >
                      {n.children.map(child => {
                        const active = page === child.id;
                        return (
                          <button
                            key={child.id}
                            onClick={() => setPage(child.id)}
                            style={{
                              display:      "flex",
                              alignItems:   "center",
                              gap:          12,
                              width:        "100%",
                              padding:      "8px 28px",
                              marginBottom: 2,
                              background:   active ? "rgba(59,130,246,0.15)" : "transparent",
                              border:       "1px solid transparent",
                              borderRadius: 8,
                              color:        active ? "#60a5fa" : "#94a3b8",
                              fontSize:     12,
                              cursor:       "pointer",
                              transform:    isOpen ? "translateY(0)" : "translateY(-5px)",
                              transition:   "all 0.25s",
                              whiteSpace:   "nowrap",
                            }}
                          >
                            {child.label}
                            {child.hasAlert && (
                              <span style={{ marginLeft:"auto", width:6, height:6, background:"#ff3b5c", borderRadius:"50%", boxShadow:"0 0 6px #ff3b5c" }} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            /* ── NORMAL MENU ── */
            const active = page === n.id;
            return (
              <Tooltip key={n.id} label={collapsed ? n.label : null}>
                <button
                  onClick={() => setPage(n.id)}
                  style={{
                    display:        "flex",
                    alignItems:     "center",
                    gap:            12,
                    width:          "100%",
                    padding:        collapsed ? "10px 0" : "10px 14px",
                    marginBottom:   4,
                    justifyContent: collapsed ? "center" : "flex-start",
                    background:     active ? "rgba(59,130,246,0.15)" : "transparent",
                    border:         active ? "1px solid rgba(59,130,246,0.3)" : "1px solid transparent",
                    borderRadius:   8,
                    color:          active ? "#60a5fa" : "#94a3b8",
                    fontSize:       collapsed ? 18 : 13,
                    cursor:         "pointer",
                    transition:     "all 0.2s",
                    whiteSpace:     "nowrap",
                    overflow:       "hidden",
                  }}
                >
                  <span style={{ flexShrink:0 }}>{n.icon}</span>
                  {!collapsed && n.label}
                </button>
              </Tooltip>
            );
          })}
        </div>

        {/* ── FOOTER ──────────────────────────────────────────────────────── */}
        <div
          style={{
            padding:     collapsed ? "16px 0" : "16px 24px",
            borderTop:   "1px solid rgba(99,179,237,0.08)",
            flexShrink:  0,
            textAlign:   collapsed ? "center" : "left",
            transition:  "padding 0.3s",
          }}
        >
          {collapsed ? (
            /* Tombol expand saat collapsed */
            <Tooltip label="Buka sidebar">
              <button
                onClick={handleCollapse}
                style={{
                  background:   "rgba(59,130,246,0.1)",
                  border:       "1px solid rgba(59,130,246,0.25)",
                  borderRadius: 8,
                  color:        "#60a5fa",
                  width:        36,
                  height:       36,
                  cursor:       "pointer",
                  fontSize:     16,
                  display:      "inline-flex",
                  alignItems:   "center",
                  justifyContent: "center",
                  transition:   "all 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background="rgba(59,130,246,0.2)"; }}
                onMouseLeave={e => { e.currentTarget.style.background="rgba(59,130,246,0.1)"; }}
              >
                ▸
              </button>
            </Tooltip>
          ) : (
            <div style={{ color:"#374151", fontSize:11 }}>v6.0.0 · 2026</div>
          )}
        </div>
      </nav>

      {/* ── OVERLAY (mobile/keyboard feel, optional) — tidak ada agar desktop tetap visible ── */}
    </>
  );
}

/* ── TOOLTIP helper (muncul di kanan ikon saat collapsed) ── */
function Tooltip({ label, children }) {
  const [show, setShow] = useState(false);
  if (!label) return children;
  return (
    <div
      style={{ position:"relative" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          style={{
            position:     "absolute",
            left:         "calc(100% + 10px)",
            top:          "50%",
            transform:    "translateY(-50%)",
            background:   "#1e2a45",
            border:       "1px solid rgba(96,165,250,0.25)",
            borderRadius: 6,
            padding:      "5px 10px",
            color:        "#e2e8f0",
            fontSize:     12,
            fontWeight:   600,
            whiteSpace:   "nowrap",
            zIndex:       200,
            pointerEvents:"none",
            boxShadow:    "0 4px 16px rgba(0,0,0,0.5)",
          }}
        >
          {label}
          {/* Arrow kiri tooltip */}
          <div style={{
            position:   "absolute",
            left:       -5,
            top:        "50%",
            transform:  "translateY(-50%)",
            width:      0,
            height:     0,
            borderTop:  "5px solid transparent",
            borderBottom: "5px solid transparent",
            borderRight: "5px solid rgba(96,165,250,0.25)",
          }} />
        </div>
      )}
    </div>
  );
}