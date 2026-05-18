// src/App.jsx
import { useState }      from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Sidebar           from "./components/Sidebar";
import Dashboard         from "./pages/Dashboard";
import Monitoring        from "./pages/Monitoring";
import Alerts            from "./pages/Alerts";
import History           from "./pages/History";
import Upload            from "./pages/Upload";
import Training          from "./pages/Training";
import Data              from "./pages/Data";
import CashPlan          from "./pages/CashPlan";
import RekapReplacement  from "./pages/Rekapreplacement";
import UserCRUD from "./pages/admin/AdminUsers";
import CashplanCRUD from "./pages/admin/AdminCashplan";
import RekapCRUD from "./pages/admin/AdminRekap";
import Login             from "./pages/Login";
import Register          from "./pages/Register";
import AdminActivityLog from "./pages/admin/AdminActivityLog";

// ── Toast sederhana untuk halaman admin inline ─────────────────────────────
function useToast() {
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };
  return { toast, showToast };
}

function AdminPageWrapper({ children, toast }) {
  return (
    <div style={{ position: "relative", minHeight: "60vh" }}>
      {children}
      {toast && (
        <div style={{
          position:   "fixed",
          bottom:     28,
          right:      28,
          padding:    "12px 20px",
          borderRadius: 10,
          border:     "1px solid",
          fontSize:   13,
          fontWeight: 600,
          fontFamily: "'IBM Plex Mono', monospace",
          zIndex:     9999,
          backdropFilter: "blur(8px)",
          background: toast.type === "ok"
            ? "rgba(74,222,128,0.12)"
            : "rgba(248,113,113,0.12)",
          borderColor: toast.type === "ok" ? "#4ade80" : "#f87171",
          color:       toast.type === "ok" ? "#4ade80" : "#f87171",
        }}>
          {toast.type === "ok" ? "✓" : "✕"} {toast.msg}
        </div>
      )}
    </div>
  );
}

// ── Inner app ──────────────────────────────────────────────────────────────
function AppInner() {
  const { user, loading, logout } = useAuth();
  const [authView,    setAuthView]    = useState("login");
  const [page,        setPage]        = useState("dashboard");
  const [selectedAtm, setSelectedAtm] = useState(null);
  const [collapsed,   setCollapsed]   = useState(false);

  const { toast: adminToast, showToast: showAdminToast } = useToast();

  // Loading restore session
  if (loading) {
    return (
      <div style={{
        minHeight:      "100vh",
        background:     "#000",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        fontFamily:     "'IBM Plex Sans', sans-serif",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width:  48, height: 48,
            border: "3px solid rgba(59,130,246,0.2)",
            borderTopColor: "#3b82f6",
            borderRadius:   "50%",
            margin:         "0 auto 16px",
            animation:      "spin 0.8s linear infinite",
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: "#475569", fontSize: 13 }}>Memuat SIPRAS...</p>
        </div>
      </div>
    );
  }

  // Belum login
  if (!user) {
    return authView === "login"
      ? <Login    onGoRegister={() => setAuthView("register")} />
      : <Register onGoLogin={()    => setAuthView("login")}    />;
  }

  const navigateTo = (p, atmId = null) => {
    setPage(p);
    if (atmId) setSelectedAtm(atmId);
  };

  const sidebarWidth = collapsed ? 64 : 240;

  // Halaman admin inline — render dalam main biasa (pakai dark bg sendiri)
  const isAdminPage = ["admin-users", "admin-cashplan", "admin-rekap"].includes(page);

  return (
    <div style={{
      display:    "flex",
      minHeight:  "100vh",
      background: "#000000",
      fontFamily: "'IBM Plex Sans', sans-serif",
    }}>
      <Sidebar
        page={page}
        setPage={navigateTo}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        user={user}
        onLogout={logout}
      />

      <main style={{
        flex:       1,
        marginLeft: sidebarWidth,
        padding:    isAdminPage ? "0" : "32px",
        overflowY:  "auto",
        minHeight:  "100vh",
        transition: "margin-left 0.3s cubic-bezier(.4,0,.2,1)",
        background: isAdminPage ? "#000000" : "#000000",
      }}>

        {/* ── Halaman normal ── */}
        {page === "dashboard"        && <Dashboard navigateTo={navigateTo} />}
        {page === "monitoring"       && <Monitoring navigateTo={navigateTo} />}
        {page === "alerts"           && <Alerts navigateTo={navigateTo} />}
        {page === "history"          && <History atmId={selectedAtm} navigateTo={navigateTo} />}
        {page === "data"             && <Data navigateTo={navigateTo} />}
        {page === "cashplan"         && <CashPlan navigateTo={navigateTo} />}
        {page === "rekapreplacement" && <RekapReplacement navigateTo={navigateTo} />}
        {page === "upload" && user?.role !== "admin" && <Upload />}
        {page === "training" && user?.role !== "admin" && <Training />}

        {/* ── Halaman Admin (hanya role admin) ── */}
        {user?.role === "admin" && (
          <>
            {page === "admin-users" && (
              <AdminPageWrapper toast={adminToast}>
                {/* Header */}
                <div style={{
                  padding:      "20px 32px 16px",
                  borderBottom: "1px solid rgb(252, 252, 252)",
                  background:   "rgba(248,113,113,0.03)",
                }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div>
                      <div style={{ color:"#ffffff", fontSize:15, fontWeight:700,
                        fontFamily:"'IBM Plex Mono',monospace" }}>
                        Kelola User
                      </div>
                      <div style={{ color:"rgb(255, 255, 255)", fontSize:11 }}>
                        Manajemen akun pengguna SIPRAS
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ padding:"24px 32px" }}>
                  <UserCRUD showToast={showAdminToast} />
                </div>
              </AdminPageWrapper>
            )}

            {page === "admin-cashplan" && (
              <AdminPageWrapper toast={adminToast}>
                <div style={{
                  padding:      "20px 32px 16px",
                  borderBottom: "1px solid rgb(255, 255, 255)",
                  background:   "rgba(56,189,248,0.03)",
                }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div>
                      <div style={{ color:"#fefefe", fontSize:15, fontWeight:700,
                        fontFamily:"'IBM Plex Mono',monospace" }}>
                        Kelola Cashplan
                      </div>
                      <div style={{ color:"rgb(255, 255, 255)", fontSize:11 }}>
                        Manajemen antrian pengisian ATM
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ padding:"24px 32px" }}>
                  <CashplanCRUD showToast={showAdminToast} />
                </div>
              </AdminPageWrapper>
            )}

            {page === "admin-rekap" && (
              <AdminPageWrapper toast={adminToast}>
                <div style={{
                  padding:      "20px 32px 16px",
                  borderBottom: "1px solid rgb(255, 255, 255)",
                  background:   "rgba(167,139,250,0.03)",
                }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div>
                      <div style={{ color:"#ffffff", fontSize:15, fontWeight:700,
                        fontFamily:"'IBM Plex Mono',monospace" }}>
                        Kelola Rekap
                      </div>
                      <div style={{ color:"rgb(255, 255, 255)", fontSize:11 }}>
                        Arsip rekap replacement ATM
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ padding:"24px 32px" }}>
                  <RekapCRUD showToast={showAdminToast} />
                </div>
              </AdminPageWrapper>
            )}

            {page === "admin-activity" && (
              <AdminPageWrapper toast={adminToast}>
                <div style={{
                  padding: "20px 32px 16px",
                  borderBottom: "1px solid rgb(255,255,255)",
                  background: "rgba(56,189,248,0.03)",
                }}>
                  <div>
                    <div style={{ color:"#ffffff", fontSize:15, fontWeight:700,
                      fontFamily:"'IBM Plex Mono',monospace" }}>Activity Log</div>
                    <div style={{ color:"rgb(255,255,255)", fontSize:11 }}>
                      Monitor aktivitas semua pengguna SIPRAS
                    </div>
                  </div>
                </div>
                <div style={{ padding:"24px 32px" }}>
                  <AdminActivityLog showToast={showAdminToast} />
                </div>
              </AdminPageWrapper>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}