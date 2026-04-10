// src/App.jsx — MySQL version (cashplan state tidak lagi di React state)
import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Monitoring from "./pages/Monitoring";
import Alerts from "./pages/Alerts";
import History from "./pages/History";
import Upload from "./pages/Upload";
import Training from "./pages/Training";
import Wilayah from "./pages/Wilayah";
import CashPlan from "./pages/CashPlan";
import RekapReplacement from "./pages/Rekapreplacement";

export default function App() {
  const [page, setPage]               = useState("dashboard");
  const [selectedAtm, setSelectedAtm] = useState(null);

  const navigateTo = (p, atmId = null) => {
    setPage(p);
    if (atmId) setSelectedAtm(atmId);
  };

  return (
    <div style={{
      display: "flex", minHeight: "100vh",
      background: "#0a0f1e", fontFamily: "'IBM Plex Sans', sans-serif",
    }}>
      <Sidebar page={page} setPage={navigateTo} />
      <main style={{ flex: 1, marginLeft: 240, padding: "32px", overflowY: "auto", minHeight: "100vh" }}>
        {page === "dashboard"        && <Dashboard navigateTo={navigateTo} />}
        {page === "monitoring"       && <Monitoring navigateTo={navigateTo} />}
        {page === "alerts"           && <Alerts navigateTo={navigateTo} />}
        {page === "history"          && (
          <History
            atmId={selectedAtm}
            // onAddCashPlan kini langsung memanggil /api/cashplan dari History
            navigateTo={navigateTo}
          />
        )}
        {page === "wilayah"          && <Wilayah navigateTo={navigateTo} />}
        {page === "cashplan"         && <CashPlan navigateTo={navigateTo} />}
        {page === "rekapreplacement" && <RekapReplacement navigateTo={navigateTo} />}
        {page === "upload"           && <Upload />}
        {page === "training"         && <Training />}
      </main>
    </div>
  );
}