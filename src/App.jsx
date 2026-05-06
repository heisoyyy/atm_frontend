// src/App.jsx
import { useState }    from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Sidebar         from "./components/Sidebar";
import Dashboard       from "./pages/Dashboard";
import Monitoring      from "./pages/Monitoring";
import Alerts          from "./pages/Alerts";
import History         from "./pages/History";
import Upload          from "./pages/Upload";
import Training        from "./pages/Training";
import Data            from "./pages/Data";
import CashPlan        from "./pages/CashPlan";
import RekapReplacement from "./pages/Rekapreplacement";
import AdminPanel      from "./pages/AdminPanel";
import Login           from "./pages/Login";
import Register        from "./pages/Register";

function isAdminRoute() {
  return window.location.hash === "#/admin" || window.location.hash.startsWith("#/admin?");
}

// ── Inner app — sudah di dalam AuthProvider ────────────────────────────────
function AppInner() {
  const { user, loading, logout } = useAuth();
  const [authView,    setAuthView]    = useState("login"); // "login" | "register"
  const [page,        setPage]        = useState("dashboard");
  const [selectedAtm, setSelectedAtm] = useState(null);
  const [collapsed,   setCollapsed]   = useState(false);

  // Admin route bypass auth check
  if (isAdminRoute()) return <AdminPanel />;

  // Tunggu restore session dari localStorage
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
            borderRadius: "50%",
            margin: "0 auto 16px",
            animation: "spin 0.8s linear infinite",
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: "#475569", fontSize: 13 }}>Memuat SIPRAS...</p>
        </div>
      </div>
    );
  }

  // Belum login → tampilkan Login / Register
  if (!user) {
    return authView === "login"
      ? <Login    onGoRegister={() => setAuthView("register")} />
      : <Register onGoLogin={()    => setAuthView("login")}    />;
  }

  // Sudah login
  const navigateTo = (p, atmId = null) => {
    setPage(p);
    if (atmId) setSelectedAtm(atmId);
  };

  const sidebarWidth = collapsed ? 64 : 240;

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
        padding:    "32px",
        overflowY:  "auto",
        minHeight:  "100vh",
        transition: "margin-left 0.3s cubic-bezier(.4,0,.2,1)",
      }}>
        {page === "dashboard"        && <Dashboard navigateTo={navigateTo} />}
        {page === "monitoring"       && <Monitoring navigateTo={navigateTo} />}
        {page === "alerts"           && <Alerts navigateTo={navigateTo} />}
        {page === "history"          && <History atmId={selectedAtm} navigateTo={navigateTo} />}
        {page === "data"             && <Data navigateTo={navigateTo} />}
        {page === "cashplan"         && <CashPlan navigateTo={navigateTo} />}
        {page === "rekapreplacement" && <RekapReplacement navigateTo={navigateTo} />}
        {page === "upload"           && <Upload />}
        {page === "training"         && <Training />}
      </main>
    </div>
  );
}

// ── Root export — bungkus dengan AuthProvider ──────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}