// src/components/Sidebar.jsx
import { useState } from "react";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "⬡" },

  {
    id: "group-monitoring",
    label: "Monitoring",
    icon: "◈",
    children: [
      { id: "monitoring", label: "Monitoring" },
      { id: "alerts", label: "Alerts", hasAlert: true },
      { id: "wilayah", label: "Wilayah" },
    ],
  },

  { id: "history", label: "Historis", icon: "◷" },
  { id: "cashplan", label: "Cash Plan", icon: "◳",},
  { id: "rekapreplacement", label: "Rekap Replacement", icon: "◳",},
  { id: "upload", label: "Upload Data", icon: "⇑" },
  { id: "training", label: "Training", icon: "⚙" },
];

export default function Sidebar({ page, setPage }) {
  const [openMenu, setOpenMenu] = useState(null);

  return (
    <nav
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        bottom: 0,
        width: 240,
        background: "linear-gradient(180deg, #0d1228 0%, #0a0f1e 100%)",
        borderRight: "1px solid rgba(99,179,237,0.08)",
        display: "flex",
        flexDirection: "column",
        zIndex: 100,
      }}
    >
      {/* HEADER */}
      <div style={{ padding: "28px 24px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              fontWeight: 700,
              color: "#fff",
              boxShadow: "0 0 20px rgba(59,130,246,0.4)",
            }}
          >
            A
          </div>
          <div>
            <div
              style={{
                color: "#e2e8f0",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              Smart ATM
            </div>
            <div
              style={{
                color: "#4a9eff",
                fontSize: 10,
                textTransform: "uppercase",
              }}
            >
              BRK Syariah
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          height: 1,
          background: "rgba(99,179,237,0.08)",
          margin: "0 20px 16px",
        }}
      />

      {/* MENU */}
      <div style={{ flex: 1, padding: "0 12px", overflowY: "auto" }}>
        {NAV.map((n) => {
          const isGroup = !!n.children;
          const isOpen = openMenu === n.id;

          // ======================
          // DROPDOWN GROUP
          // ======================
          if (isGroup) {
            return (
              <div key={n.id}>
                {/* Parent */}
                <button
                  onClick={() =>
                    setOpenMenu(isOpen ? null : n.id)
                  }
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    width: "100%",
                    padding: "10px 14px",
                    marginBottom: 4,
                    background: isOpen
                      ? "rgba(59,130,246,0.08)"
                      : "transparent",
                    border: "1px solid transparent",
                    borderRadius: 8,
                    color: "#94a3b8",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  <span>{n.icon}</span>
                  {n.label}

                  {/* Arrow animasi */}
                  <span
                    style={{
                      marginLeft: "auto",
                      transition: "transform 0.25s ease",
                      transform: isOpen
                        ? "rotate(90deg)"
                        : "rotate(0deg)",
                    }}
                  >
                    ▸
                  </span>
                </button>

                {/* CHILDREN (Smooth Animation) */}
                <div
                  style={{
                    maxHeight: isOpen ? 200 : 0,
                    overflow: "hidden",
                    transition: "all 0.3s ease",
                    opacity: isOpen ? 1 : 0,
                  }}
                >
                  {n.children.map((child) => {
                    const active = page === child.id;

                    return (
                      <button
                        key={child.id}
                        onClick={() => setPage(child.id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          width: "100%",
                          padding: "8px 28px",
                          marginBottom: 2,
                          background: active
                            ? "rgba(59,130,246,0.15)"
                            : "transparent",
                          border: "1px solid transparent",
                          borderRadius: 8,
                          color: active
                            ? "#60a5fa"
                            : "#94a3b8",
                          fontSize: 12,
                          cursor: "pointer",
                          transform: isOpen
                            ? "translateY(0)"
                            : "translateY(-5px)",
                          transition: "all 0.25s ease",
                        }}
                      >
                        {child.label}

                        {child.hasAlert && (
                          <span
                            style={{
                              marginLeft: "auto",
                              width: 6,
                              height: 6,
                              background: "#ff3b5c",
                              borderRadius: "50%",
                              boxShadow:
                                "0 0 6px #ff3b5c",
                            }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          }

          // ======================
          // NORMAL MENU
          // ======================
          const active = page === n.id;

          return (
            <button
              key={n.id}
              onClick={() => setPage(n.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                width: "100%",
                padding: "10px 14px",
                marginBottom: 4,
                background: active
                  ? "rgba(59,130,246,0.15)"
                  : "transparent",
                border: active
                  ? "1px solid rgba(59,130,246,0.3)"
                  : "1px solid transparent",
                borderRadius: 8,
                color: active ? "#60a5fa" : "#94a3b8",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              <span>{n.icon}</span>
              {n.label}

              {n.hasBadge && (
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 9,
                    fontWeight: 700,
                    background:
                      "rgba(0,229,160,0.15)",
                    color: "#00e5a0",
                    padding: "2px 6px",
                    borderRadius: 4,
                  }}
                >
                  NEW
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* FOOTER */}
      <div
        style={{
          padding: "16px 24px",
          borderTop:
            "1px solid rgba(99,179,237,0.08)",
        }}
      >
        <div
          style={{
            color: "#374151",
            fontSize: 11,
          }}
        >
          v6.0.0 · 2026
        </div>
      </div>
    </nav>
  );
}