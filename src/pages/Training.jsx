// src/pages/Training.jsx
import { useState, useEffect, useRef } from "react";
import { apiFetch } from "../utils/api";

export default function Training() {
  const [trainStatus, setTrainStatus] = useState(null);
  const [sysStatus,   setSysStatus]   = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [polling,     setPolling]     = useState(false);
  const pollRef = useRef(null);

  const fetchStatus = async () => {
    const [ts, ss] = await Promise.all([
      apiFetch("/api/train/status").catch(() => null),
      apiFetch("/api/status").catch(() => null),
    ]);
    setTrainStatus(ts);
    setSysStatus(ss);
    return ts;
  };

  useEffect(() => { fetchStatus(); }, []);

  const startPolling = () => {
    setPolling(true);
    pollRef.current = setInterval(async () => {
      const ts = await fetchStatus();
      if (ts?.status !== "running") {
        clearInterval(pollRef.current);
        setPolling(false);
      }
    }, 1500);
  };

  useEffect(() => () => clearInterval(pollRef.current), []);

  const triggerTrain = async () => {
    setLoading(true);
    try {
      await apiFetch("/api/train", { method: "POST" });
      await fetchStatus();
      startPolling();
    } catch (e) {
      alert(e.message);
    }
    setLoading(false);
  };

  const ts = trainStatus;
  const isRunning = ts?.status === "running";

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ color: "#e2e8f0", fontSize: 24, fontWeight: 700, margin: "0 0 4px", letterSpacing: "-0.02em" }}>
          Training Model
        </h1>
        <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>
          XGBoost — ATM Cash Prediction v5
        </p>
      </div>

      {/* Model Info */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total ATM",  value: sysStatus?.total_atm ?? "-",   color: "#60a5fa" },
          { label: "Total Rows", value: sysStatus?.total_rows ? sysStatus.total_rows.toLocaleString() : "-", color: "#94a3b8" },
          { label: "Model",      value: sysStatus?.has_model ? "✓ Ada" : "✕ Belum", color: sysStatus?.has_model ? "#00e5a0" : "#ff3b5c" },
        ].map(c => (
          <div key={c.label} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(99,179,237,0.08)", borderRadius: 10, padding: "14px 18px" }}>
            <div style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{c.label}</div>
            <div style={{ color: c.color, fontWeight: 700, fontSize: 20 }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Progress Card */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(99,179,237,0.1)", borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" }}>Status Training</div>
            <div style={{ marginTop: 4 }}>
              <StatusBadge status={ts?.status} />
            </div>
          </div>
          {ts?.last_trained && (
            <div style={{ color: "#64748b", fontSize: 12, textAlign: "right" }}>
              <div>Terakhir dilatih:</div>
              <div style={{ color: "#94a3b8", marginTop: 2 }}>{new Date(ts.last_trained).toLocaleString("id-ID")}</div>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ color: "#94a3b8", fontSize: 12 }}>{ts?.message || "Idle"}</span>
            <span style={{ color: "#60a5fa", fontSize: 12, fontWeight: 600 }}>{ts?.progress ?? 0}%</span>
          </div>
          <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3 }}>
            <div style={{
              height: "100%",
              width: `${ts?.progress ?? 0}%`,
              background: ts?.status === "done" ? "#00e5a0" : ts?.status === "error" ? "#ff3b5c" : "linear-gradient(90deg, #3b82f6, #06b6d4)",
              borderRadius: 3,
              transition: "width 0.5s ease",
              boxShadow: isRunning ? "0 0 10px rgba(59,130,246,0.4)" : "none",
            }} />
          </div>
        </div>

        {/* Log-like display */}
        {isRunning && (
          <div style={{ fontFamily: "monospace", fontSize: 12, color: "#64748b", background: "rgba(0,0,0,0.2)", borderRadius: 6, padding: "8px 12px" }}>
            <span style={{ color: "#3b82f6" }}>▶</span> {ts.message}
            <span style={{ animation: "blink 1s step-end infinite" }}>_</span>
          </div>
        )}

        {/* Trigger button */}
        <button
          onClick={triggerTrain}
          disabled={isRunning || loading || !sysStatus?.has_data}
          style={{
            marginTop: 16, width: "100%",
            background: isRunning || loading || !sysStatus?.has_data
              ? "rgba(255,255,255,0.05)"
              : "linear-gradient(135deg, rgba(59,130,246,0.7), rgba(6,182,212,0.7))",
            border: "1px solid rgba(59,130,246,0.35)",
            borderRadius: 9, color: isRunning || !sysStatus?.has_data ? "#374151" : "#fff",
            padding: "12px", fontSize: 14, cursor: isRunning || !sysStatus?.has_data ? "default" : "pointer",
            fontWeight: 600, transition: "all 0.2s",
          }}
        >
          {isRunning ? "⏳ Training Berjalan..." : loading ? "Memulai..." : !sysStatus?.has_data ? "Upload Data Terlebih Dahulu" : "⚙ Mulai Training Manual"}
        </button>
      </div>

      {/* Last Result */}
      {ts?.last_result && (
        <div style={{ background: "rgba(0,229,160,0.04)", border: "1px solid rgba(0,229,160,0.15)", borderRadius: 12, padding: "20px 24px" }}>
          <div style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>Hasil Training Terakhir</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
            {[
              { label: "MAE",       value: `${ts.last_result.mae_avg} jam`, color: "#60a5fa" },
              { label: "R²",        value: ts.last_result.r2_avg,           color: "#00e5a0" },
              { label: "Data Train",value: ts.last_result.n_train?.toLocaleString(), color: "#94a3b8" },
              { label: "Hari Data", value: `${ts.last_result.n_hari} hari`,  color: "#94a3b8" },
            ].map(m => (
              <div key={m.label} style={{ textAlign: "center", background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "12px" }}>
                <div style={{ color: "#64748b", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>{m.label}</div>
                <div style={{ color: m.color, fontWeight: 700, fontSize: 18, marginTop: 4 }}>{m.value}</div>
              </div>
            ))}
          </div>

          {ts.last_result.top_features?.length > 0 && (
            <>
              <div style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Top Features</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {ts.last_result.top_features.slice(0, 8).map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ color: "#64748b", fontSize: 11, minWidth: 18, textAlign: "right" }}>{i + 1}.</span>
                    <span style={{ color: "#94a3b8", fontSize: 12, flex: 1 }}>{f.fitur}</span>
                    <div style={{ width: 120, height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
                      <div style={{
                        height: "100%",
                        width: `${(f.importance / ts.last_result.top_features[0].importance * 100).toFixed(0)}%`,
                        background: "linear-gradient(90deg, #3b82f6, #06b6d4)",
                        borderRadius: 2,
                      }} />
                    </div>
                    <span style={{ color: "#60a5fa", fontSize: 11, minWidth: 44, textAlign: "right" }}>{f.importance.toFixed(4)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes spin  { to { transform:rotate(360deg); } }
      `}</style>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    idle:    { label: "Idle",      color: "#6b7280", bg: "rgba(107,114,128,0.12)" },
    running: { label: "Running",   color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
    done:    { label: "Selesai ✓", color: "#00e5a0", bg: "rgba(0,229,160,0.1)" },
    error:   { label: "Error ✕",   color: "#ff3b5c", bg: "rgba(255,59,92,0.12)" },
  };
  const s = map[status] || map.idle;
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 5, border: `1px solid ${s.color}33` }}>
      {status === "running" && <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#3b82f6", marginRight: 6, animation: "pulse 1s infinite", boxShadow: "0 0 6px #3b82f6" }} />}
      {s.label}
    </span>
  );
}
