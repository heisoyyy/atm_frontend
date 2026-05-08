// src/components/Sidebar.jsx
import { useState } from "react";

// Tabler Icons — pastikan sudah install: npm install @tabler/icons-react
import {
  IconLayoutDashboard,
  IconCreditCard,
  IconActivity,
  IconHistory,
  IconCalendarDue,
  IconArrowsExchange,
  IconUpload,
  IconBrain,
  IconUsers,
  IconFileInvoice,
  IconClipboardList,
  IconPower,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";

const NAV = [
  { id: "dashboard",        label: "Dashboard",        icon: IconLayoutDashboard },
  { id: "data",             label: "Data ATM",          icon: IconCreditCard },
  { id: "monitoring",       label: "Monitoring",        icon: IconActivity },
  { id: "history",          label: "Historis",          icon: IconHistory },
  { id: "cashplan",         label: "Cash Plan",         icon: IconCalendarDue },
  { id: "rekapreplacement", label: "Rekap Replacement", icon: IconArrowsExchange },
  { id: "upload",           label: "Upload Data",       icon: IconUpload },
  { id: "training",         label: "Training",          icon: IconBrain },
];

const NAV_ADMIN = [
  { id: "admin-users",    label: "Kelola User",     icon: IconUsers },
  { id: "admin-cashplan", label: "Kelola Cashplan", icon: IconFileInvoice },
  { id: "admin-rekap",    label: "Kelola Rekap",    icon: IconClipboardList },
];

export default function Sidebar({ page, setPage, collapsed, setCollapsed, user, onLogout }) {
  const handleCollapse = () => setCollapsed(c => !c);

  const isAdmin = user?.role === "admin";

  return (
    <nav style={{
      position:      "fixed",
      left:          0, top: 0, bottom: 0,
      width:         collapsed ? 64 : 240,
      background:    "#0a0a0a",
      borderRight:   "1px solid rgba(255,255,255,0.07)",
      display:       "flex",
      flexDirection: "column",
      zIndex:        100,
      transition:    "width 0.25s cubic-bezier(.4,0,.2,1)",
      overflow:      "hidden",
    }}>

      {/* ── HEADER ── */}
      <div style={{
        padding:        collapsed ? "20px 14px 16px" : "20px 14px 16px",
        display:        "flex",
        alignItems:     "center",
        gap:            10,
        flexShrink:     0,
        justifyContent: collapsed ? "center" : "flex-start",
      }}>
        {/* Avatar */}
        <div style={{
          width: 34, height: 34,
          borderRadius: 10,
          background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 700, color: "#fff",
          flexShrink: 0,
        }}>
          {(user?.full_name || user?.username || "?")[0].toUpperCase()}
        </div>

        {!collapsed && (
          <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                color: "#f1f5f9", fontWeight: 600, fontSize: 13,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {user?.full_name || user?.username}
              </div>
              {/* Role badge — amber untuk admin, slate untuk lainnya */}
              <div style={{
                display:       "inline-block",
                marginTop:     2,
                fontSize:      10,
                fontWeight:    700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                borderRadius:  4,
                padding:       "1px 6px",
                ...(isAdmin
                  ? { background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)", color: "#fbbf24" }
                  : { background: "rgba(59,130,246,0.1)",  border: "1px solid rgba(59,130,246,0.2)",  color: "#60a5fa"  }
                ),
              }}>
                {user?.role || "viewer"}
              </div>
            </div>

            <button
              onClick={handleCollapse}
              title="Tutup sidebar"
              style={{
                width: 26, height: 26,
                borderRadius: 6,
                border:       "1px solid rgba(255,255,255,0.1)",
                background:   "transparent",
                color:        "#64748b",
                cursor:       "pointer",
                display:      "flex", alignItems: "center", justifyContent: "center",
                fontSize:     12,
                flexShrink:   0,
                transition:   "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.color = "#cbd5e1"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "#64748b"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
            >
              <IconChevronLeft size={14} stroke={2} />
            </button>
          </>
        )}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "0 12px", flexShrink: 0 }} />

      {/* ── MENU BODY ── */}
      <div style={{ flex: 1, padding: "10px 8px", overflowY: "auto", overflowX: "hidden" }}>

        {/* Label seksi utama */}
        {!collapsed && (
          <div style={styles.sectionLabel}>Menu Utama</div>
        )}

        {/* Nav utama */}
        {NAV
          .filter(n => !(isAdmin && ["training", "upload"].includes(n.id)))
          .map(n => (
            <NavItem
              key={n.id}
              n={n}
              active={page === n.id}
              collapsed={collapsed}
              onClick={() => setPage(n.id)}
              variant="default"
            />
          ))
        }

        {/* ── ADMIN SECTION ── */}
        {isAdmin && (
          <div style={{ marginTop: 8 }}>
            {/* Divider bergaris dua sisi + badge tengah */}
            <div style={{
              display:    "flex",
              alignItems: "center",
              gap:        8,
              padding:    "10px 8px 6px",
            }}>
              <div style={{ flex: 1, height: 1, background: "rgba(251,191,36,0.2)" }} />
              {!collapsed && (
                <span style={{
                  fontSize:      9,
                  fontWeight:    700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color:         "#f59e0b",
                  background:    "rgba(251,191,36,0.1)",
                  border:        "1px solid rgba(251,191,36,0.2)",
                  borderRadius:  4,
                  padding:       "2px 7px",
                  whiteSpace:    "nowrap",
                }}>
                  Admin
                </span>
              )}
              <div style={{ flex: 1, height: 1, background: "rgba(251,191,36,0.2)" }} />
            </div>

            {NAV_ADMIN.map(n => (
              <NavItem
                key={n.id}
                n={n}
                active={page === n.id}
                collapsed={collapsed}
                onClick={() => setPage(n.id)}
                variant="admin"
              />
            ))}
          </div>
        )}
      </div>

      {/* ── FOOTER ── */}
      <div style={{
        padding:    collapsed ? "12px 10px" : "12px",
        borderTop:  "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
      }}>
        {collapsed ? (
          <Tooltip label="Buka sidebar">
            <button
              onClick={handleCollapse}
              style={{
                width: 40, height: 40,
                borderRadius:  10,
                border:        "1px solid rgba(255,255,255,0.1)",
                background:    "rgba(255,255,255,0.04)",
                color:         "#94a3b8",
                cursor:        "pointer",
                display:       "flex", alignItems: "center", justifyContent: "center",
                fontSize:      15,
                margin:        "0 auto",
                transition:    "all 0.15s",
              }}
            >
              <IconChevronRight size={16} stroke={2} />
            </button>
          </Tooltip>
        ) : (
          <button
            onClick={onLogout}
            style={{
              width:          "100%",
              padding:        "10px 14px",
              borderRadius:   10,
              border:         "1px solid rgba(239,68,68,0.3)",
              background:     "rgba(239,68,68,0.06)",
              color:          "#f87171",
              fontSize:       13,
              fontWeight:     500,
              cursor:         "pointer",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              gap:            7,
              transition:     "all 0.15s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background    = "rgba(239,68,68,0.12)";
              e.currentTarget.style.borderColor   = "rgba(239,68,68,0.5)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background    = "rgba(239,68,68,0.06)";
              e.currentTarget.style.borderColor   = "rgba(239,68,68,0.3)";
            }}
          >
            <IconPower size={15} stroke={2} />
            Logout
          </button>
        )}
      </div>
    </nav>
  );
}

/* ── NAV ITEM ── */
function NavItem({ n, active, collapsed, onClick, variant }) {
  const isAdmin = variant === "admin";

  const defaultColors = {
    base:        { color: "#94a3b8" },
    hover:       { background: "rgba(255,255,255,0.05)", color: "#e2e8f0", border: "1px solid transparent" },
    active:      { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "#f1f5f9" },
  };

  const adminColors = {
    base:        { color: "#a8916e" },
    hover:       { background: "rgba(251,191,36,0.07)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.15)" },
    active:      { background: "rgba(251,191,36,0.1)",  border: "1px solid rgba(251,191,36,0.25)", color: "#fbbf24" },
  };

  const scheme = isAdmin ? adminColors : defaultColors;

  return (
    <Tooltip label={collapsed ? n.label : null}>
      <button
        onClick={onClick}
        style={{
          display:        "flex",
          alignItems:     "center",
          gap:            10,
          width:          "100%",
          padding:        collapsed ? "10px 0" : "9px 12px",
          marginBottom:   2,
          justifyContent: collapsed ? "center" : "flex-start",
          borderRadius:   8,
          cursor:         "pointer",
          transition:     "all 0.15s",
          whiteSpace:     "nowrap",
          overflow:       "hidden",
          fontSize:       13,
          fontWeight:     active ? 500 : 400,
          ...(active ? scheme.active : { background: "transparent", border: "1px solid transparent", ...scheme.base }),
        }}
        onMouseEnter={e => {
          if (!active) Object.assign(e.currentTarget.style, scheme.hover);
        }}
        onMouseLeave={e => {
          if (!active) Object.assign(e.currentTarget.style, { background: "transparent", border: "1px solid transparent", ...scheme.base });
        }}
      >
        <span style={{
          width:          18,
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          flexShrink:     0,
          color:          "inherit",
        }}>
          <n.icon size={collapsed ? 18 : 16} stroke={1.75} />
        </span>
        {!collapsed && <span>{n.label}</span>}
      </button>
    </Tooltip>
  );
}

/* ── TOOLTIP ── */
function Tooltip({ label, children }) {
  const [show, setShow] = useState(false);
  if (!label) return children;
  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div style={{
          position:      "absolute",
          left:          "calc(100% + 10px)",
          top:           "50%",
          transform:     "translateY(-50%)",
          background:    "#1e293b",
          border:        "1px solid rgba(148,163,184,0.15)",
          borderRadius:  6,
          padding:       "5px 10px",
          color:         "#e2e8f0",
          fontSize:      12,
          fontWeight:    500,
          whiteSpace:    "nowrap",
          zIndex:        200,
          pointerEvents: "none",
          boxShadow:     "0 4px 16px rgba(0,0,0,0.5)",
        }}>
          {label}
          <div style={{
            position:    "absolute",
            left:        -5, top: "50%",
            transform:   "translateY(-50%)",
            width: 0, height: 0,
            borderTop:    "5px solid transparent",
            borderBottom: "5px solid transparent",
            borderRight:  "5px solid rgba(148,163,184,0.15)",
          }} />
        </div>
      )}
    </div>
  );
}

const styles = {
  sectionLabel: {
    fontSize:      10,
    fontWeight:    700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color:         "#475569",
    padding:       "6px 8px 6px",
  },
};