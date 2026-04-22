// src/App.jsx
import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Monitoring from "./pages/Monitoring";
import Alerts from "./pages/Alerts";
import History from "./pages/History";
import Upload from "./pages/Upload";
import Training from "./pages/Training";
import Data from "./pages/Data";
import CashPlan from "./pages/CashPlan";
import RekapReplacement from "./pages/Rekapreplacement";

export default function App() {
  const [page,       setPage]       = useState("dashboard");
  const [selectedAtm, setSelectedAtm] = useState(null);
  const [collapsed,  setCollapsed]  = useState(false);

  const navigateTo = (p, atmId = null) => {
    setPage(p);
    if (atmId) setSelectedAtm(atmId);
  };

  const sidebarWidth = collapsed ? 64 : 240;

  return (
    <div style={{
      display:     "flex",
      minHeight:   "100vh",
      background:  "#0a0f1e",
      fontFamily:  "'IBM Plex Sans', sans-serif",
    }}>
      <Sidebar
        page={page}
        setPage={navigateTo}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      <main
        style={{
          flex:       1,
          marginLeft: sidebarWidth,
          padding:    "32px",
          overflowY:  "auto",
          minHeight:  "100vh",
          transition: "margin-left 0.3s cubic-bezier(.4,0,.2,1)",
        }}
      >
        {page === "dashboard"        && <Dashboard navigateTo={navigateTo} />}
        {page === "monitoring"       && <Monitoring navigateTo={navigateTo} />}
        {page === "alerts"           && <Alerts navigateTo={navigateTo} />}
        {page === "history"          && (
          <History
            atmId={selectedAtm}
            navigateTo={navigateTo}
          />
        )}
        {page === "data"          && <Data navigateTo={navigateTo} />}
        {page === "cashplan"         && <CashPlan navigateTo={navigateTo} />}
        {page === "rekapreplacement" && <RekapReplacement navigateTo={navigateTo} />}
        {page === "upload"           && <Upload />}
        {page === "training"         && <Training />}
      </main>
    </div>
  );
}