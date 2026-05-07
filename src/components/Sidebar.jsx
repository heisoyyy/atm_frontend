// src/components/Sidebar.jsx
import { useState } from "react";

const NAV = [
  { id: "dashboard",        label: "Dashboard",},
  { id: "data",             label: "Data ATM",},
  { id: "monitoring",       label: "Monitoring",},
  { id: "history",          label: "Historis",},
  { id: "cashplan",         label: "Cash Plan",},
  { id: "rekapreplacement", label: "Rekap Replacement",},
  { id: "upload",           label: "Upload Data",},
  { id: "training",         label: "Training",},
];

// Menu khusus admin
const NAV_ADMIN = [
  { id: "admin-users",    label: "Kelola User",},
  { id: "admin-cashplan", label: "Kelola Cashplan",},
  { id: "admin-rekap",    label: "Kelola Rekap",},
];

export default function Sidebar({ page, setPage, collapsed, setCollapsed, user, onLogout }) {
  const [openMenu, setOpenMenu] = useState(null);

  const handleCollapse = () => {
    setCollapsed(c => !c);
    if (!collapsed) setOpenMenu(null);
  };

  return (
    <>
      <nav
        style={{
          position:       "fixed",
          left:           0,
          top:            0,
          bottom:         0,
          width:          collapsed ? 64 : 240,
          background:     "linear-gradient(180deg, #000000 0%, #171717 100%)",
          borderRight:    "1px solid rgba(253, 254, 255, 0.08)",
          display:        "flex",
          flexDirection:  "column",
          zIndex:         100,
          transition:     "width 0.3s cubic-bezier(.4,0,.2,1)",
          overflow:       "hidden",
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
            {/* Avatar */}
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 700,
                color: "#fff",
                flexShrink: 0,
              }}
            >
              {(user?.full_name || user?.username || "?")[0].toUpperCase()}
            </div>

            {/* Nama + role */}
            {!collapsed && (
              <div style={{ overflow:"hidden", whiteSpace:"nowrap" }}>
                <div style={{ color:"#ffffff", fontWeight:600, fontSize:13 }}>
                  {user?.full_name || user?.username}
                </div>
                <div style={{
                  fontSize:10,
                  color:"#94a3b8",
                  textTransform:"uppercase",
                  letterSpacing:"0.05em"
                }}>
                  {user?.role || "viewer"}
                </div>
              </div>
            )}
          </div>

          {/* Tombol toggle — hanya muncul saat expanded */}
          {!collapsed && (
            <button
              onClick={handleCollapse}
              title="Tutup sidebar"
              style={{
                background:   "rgba(240, 12, 12, 0.04)",
                border:       "1px solid rgba(0, 0, 0, 0.15)",
                borderRadius: 6,
                color:        "#ffffff",
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
              onMouseEnter={e => { e.currentTarget.style.color="#ffffff"; e.currentTarget.style.borderColor="rgba(96,165,250,0.35)"; }}
              onMouseLeave={e => { e.currentTarget.style.color="#ffffff"; e.currentTarget.style.borderColor="rgba(99,179,237,0.15)"; }}
            >
              ◂
            </button>
          )}
        </div>

        <div style={{ height:1, background:"rgba(99,179,237,0.08)", margin:"0 12px 12px", flexShrink:0 }} />

        {/* ── MENU ── */}
        <div style={{ flex:1, padding:"0 8px", overflowY:"auto", overflowX:"hidden" }}>

          {/* Menu utama */}
          {/* Menu utama */}
          {NAV
            .filter(n => {
              // admin tidak boleh lihat training & upload
              if (
                user?.role === "admin" &&
                ["training", "upload"].includes(n.id)
              ) {
                return false;
              }

              return true;
            })
            .map(n => {
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
                      background:     active ? "rgba(250, 250, 250, 0.15)" : "transparent",
                      border:         active ? "1px solid rgba(255, 255, 255, 0.3)" : "1px solid transparent",
                      borderRadius:   8,
                      color:          active ? "#f4f1f1" : "#f6f6f6",
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

          {/* ── ADMIN SECTION — hanya tampil jika role === "admin" ── */}
          {user?.role === "admin" && (
            <>
              {/* Divider + label */}
              <div style={{
                margin:    collapsed ? "10px 4px 6px" : "10px 6px 6px",
                borderTop: "1px solid rgb(116, 116, 116)",
              }}>
                {!collapsed && (
                  <div style={{
                    color:         "rgb(255, 255, 255)",
                    fontSize:      9,
                    fontWeight:    700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    padding:       "8px 6px 4px",
                    fontFamily:    "'IBM Plex Mono', monospace",
                  }}>
                    Admin
                  </div>
                )}
              </div>

              {NAV_ADMIN.map(n => {
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
                        background:     active
                          ? "rgb(71, 71, 71)"
                          : "transparent",
                        border:         active
                          ? "1px solid rgba(255, 255, 255, 0.35)"
                          : "1px solid transparent",
                        borderRadius:   8,
                        color:          active ? "#ffffff" : "rgb(255, 255, 255)",
                        fontSize:       collapsed ? 18 : 13,
                        cursor:         "pointer",
                        transition:     "all 0.2s",
                        whiteSpace:     "nowrap",
                        overflow:       "hidden",
                      }}
                      onMouseEnter={e => {
                        if (!active) {
                          e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                          e.currentTarget.style.color = "#ffffff";
                        }
                      }}
                      onMouseLeave={e => {
                        if (!active) {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "rgb(255, 255, 255)";
                        }
                      }}
                    >
                      <span style={{ flexShrink:0 }}>{n.icon}</span>
                      {!collapsed && n.label}
                    </button>
                  </Tooltip>
                );
              })}
            </>
          )}
        </div>

        {/* ── FOOTER ──────────────────────────────────────────────────────── */}
        <div
          style={{
            padding: collapsed ? "12px 10px" : "16px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            flexShrink: 0,
            marginTop: "auto", // penting biar nempel bawah
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            background: "rgba(0,0,0,0.25)",
            backdropFilter: "blur(6px)",
          }}
        >
          {collapsed ? (
            <Tooltip label="Buka sidebar">
              <button
                onClick={handleCollapse}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  border: "1px solid rgba(59,130,246,0.3)",
                  background: "rgba(59,130,246,0.12)",
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  transition: "all .2s ease",
                }}
              >
                ▸
              </button>
            </Tooltip>
          ) : (
            <button
              onClick={onLogout}
              style={{
                width: "100%",
                padding: "11px 14px",
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.85)",
                borderRadius: 12,
                color: "#ffffff",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "all .2s ease",
                boxShadow: "0 0 0 rgba(239,68,68,0)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(239,68,68,0.16)";
                e.currentTarget.style.boxShadow =
                  "0 0 18px rgba(239,68,68,0.25)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(239,68,68,0.08)";
                e.currentTarget.style.boxShadow = "0 0 0 rgba(239,68,68,0)";
              }}
            >
              <span style={{ fontSize: 15 }}>⏻</span>
              Logout
            </button>
          )}
        </div>
      </nav>
    </>
  );
}

/* ── TOOLTIP ── */
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
        <div style={{
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
        }}>
          {label}
          <div style={{
            position:    "absolute",
            left:        -5,
            top:         "50%",
            transform:   "translateY(-50%)",
            width:       0,
            height:      0,
            borderTop:   "5px solid transparent",
            borderBottom:"5px solid transparent",
            borderRight: "5px solid rgba(96,165,250,0.25)",
          }} />
        </div>
      )}
    </div>
  );
}