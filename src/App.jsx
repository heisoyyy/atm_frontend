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
import Replacement from "./pages/Replacement";
// import CashPlan2 from "./pages/CashPlan2";

export default function App() {
  const [page, setPage]             = useState("dashboard");
  const [selectedAtm, setSelectedAtm] = useState(null);

  // ── Cash Plan shared state ───────────────────────────
  // Key unik: `${id_atm}_+${jam_ke}j`
  // cashPlanIds = Set of keys yang sudah ditambahkan (untuk cek duplikat di History)
  const [cashPlanItems, setCashPlanItems] = useState([]);
  const cashPlanIds = new Set(cashPlanItems.map(i => i.key));

  const addCashPlan = (item) => {
    setCashPlanItems(prev => {
      if (prev.some(p => p.key === item.key)) return prev; // skip duplikat
      return [...prev, item];
    });
  };

  const removeCashPlan = (key) => {
    setCashPlanItems(prev => prev.filter(p => p.key !== key));
  };
  // ────────────────────────────────────────────────────

  const navigateTo = (p, atmId = null) => {
    setPage(p);
    if (atmId) setSelectedAtm(atmId);
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0a0f1e", fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <Sidebar page={page} setPage={navigateTo} cashPlanCount={cashPlanItems.length} />
      <main style={{ flex: 1, marginLeft: 240, padding: "32px", overflowY: "auto", minHeight: "100vh" }}>
        {page === "dashboard"  && <Dashboard navigateTo={navigateTo} />}
        {page === "monitoring" && <Monitoring navigateTo={navigateTo} />}
        {page === "alerts"     && <Alerts navigateTo={navigateTo} />}
        {page === "history"    && (
          <History
            atmId={selectedAtm}
            onAddCashPlan={addCashPlan}
            cashPlanIds={cashPlanIds}
          />
        )}
        {page === "wilayah"    && <Wilayah navigateTo={navigateTo} />}
        {page === "cashplan"   && (
          <CashPlan
            items={cashPlanItems}
            onRemove={removeCashPlan}
            navigateTo={navigateTo}
          />
        )}
        {page === "replacement"   && (
          <Replacement
            items={cashPlanItems}
            onRemove={removeCashPlan}
            navigateTo={navigateTo}
          />
        )}
        {page === "upload"     && <Upload />}
        {page === "training"   && <Training />}
      </main>
    </div>
  );
}