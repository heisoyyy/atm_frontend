import { useState, useEffect, useRef } from "react";
import { apiFetch, fmt, STATUS_COLOR } from "../utils/api";

export default function History({ atmId }) {
  const [inputId, setInputId] = useState(atmId || "");
  const [days, setDays]       = useState(7);
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState(null);
  const [predData, setPred]   = useState(null);

  const fetch = () => {
    if (!inputId.trim()) return;
    setLoading(true); setErr(null);
    Promise.all([
      apiFetch(`/api/history/${inputId.trim()}?last_n_days=${days}`),
      apiFetch(`/api/predictions/${inputId.trim()}`).catch(() => null),
    ]).then(([h, p]) => {
      setData(h); setPred(p);
      setLoading(false);
    }).catch(e => { setErr(e.message); setLoading(false); });
  };

  useEffect(() => { if (atmId) { setInputId(atmId); } }, [atmId]);
  useEffect(() => { if (inputId && atmId) fetch(); }, [inputId]);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: "#e2e8f0", fontSize: 24, fontWeight: 700, margin: "0 0 4px", letterSpacing: "-0.02em" }}>
          Historis ATM
        </h1>
        <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>Tren saldo & penarikan per ATM</p>
      </div>

      {/* Search */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        <input
          value={inputId}
          onChange={e => setInputId(e.target.value)}
          onKeyDown={e => e.key === "Enter" && fetch()}
          placeholder="Masukkan ID ATM (e.g. EMV10614)"
          style={{
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(99,179,237,0.15)",
            borderRadius: 8, color: "#e2e8f0", padding: "9px 14px", fontSize: 14,
            width: 260, outline: "none",
          }}
        />
        {[3, 7, 14, 30].map(d => (
          <button key={d} onClick={() => setDays(d)} style={{
            background: days === d ? "rgba(59,130,246,0.15)" : "transparent",
            border: days === d ? "1px solid rgba(59,130,246,0.35)" : "1px solid rgba(99,179,237,0.1)",
            borderRadius: 8, color: days === d ? "#60a5fa" : "#64748b",
            padding: "8px 14px", fontSize: 13, cursor: "pointer",
          }}>{d}H</button>
        ))}
        <button onClick={fetch} style={{
          background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.35)",
          borderRadius: 8, color: "#60a5fa", padding: "8px 20px", fontSize: 13,
          cursor: "pointer", fontWeight: 600,
        }}>Tampilkan</button>
      </div>

      {loading && <Spinner />}
      {err && <div style={{ color: "#ff3b5c", background: "rgba(255,59,92,0.08)", border: "1px solid rgba(255,59,92,0.2)", borderRadius: 8, padding: "12px 16px", fontSize: 13 }}>⚠ {err}</div>}

      {data && !loading && (
        <div>
          {/* Pred card */}
          {predData && <PredCard pred={predData} />}

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Saldo Terkini",  value: fmt.rupiah(data.saldo_latest), color: "#60a5fa" },
              { label: "Saldo Min",      value: fmt.rupiah(data.saldo_min),    color: "#ff3b5c" },
              { label: "Saldo Max",      value: fmt.rupiah(data.saldo_max),    color: "#00e5a0" },
              { label: "Jumlah Refill",  value: data.refill_count ?? "-",      color: "#f5c518" },
            ].map(s => (
              <StatCard key={s.label} {...s} />
            ))}
          </div>

          {/* Chart */}
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(99,179,237,0.08)", borderRadius: 12, padding: "20px 24px", marginBottom: 16 }}>
            <div style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>
              Tren Saldo — {data.id_atm} ({data.last_n_days} hari)
            </div>
            <SaldoChart data={data.data} limit={data.limit} />
          </div>

          {/* Raw table (last 48 rows) */}
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(99,179,237,0.08)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(99,179,237,0.08)", color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Data Terbaru (48 entri)
            </div>
            <div style={{ overflowY: "auto", maxHeight: 320 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead style={{ position: "sticky", top: 0, background: "#0d1228" }}>
                  <tr>
                    {["Datetime", "Saldo", "%", "Penarikan", "Refill", "Status"].map(h => (
                      <th key={h} style={{ padding: "8px 14px", color: "#64748b", textAlign: "left", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", fontSize: 10 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...data.data].reverse().slice(0, 48).map((row, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(99,179,237,0.04)", background: i % 2 ? "rgba(255,255,255,0.01)" : "transparent" }}>
                      <td style={{ padding: "6px 14px", color: "#64748b", fontFamily: "monospace" }}>{String(row.datetime).slice(0, 16)}</td>
                      <td style={{ padding: "6px 14px", color: "#e2e8f0", fontWeight: 600 }}>{fmt.rupiah(row.saldo)}</td>
                      <td style={{ padding: "6px 14px" }}>
                        <span style={{ color: row.pct < 20 ? "#ff3b5c" : row.pct < 40 ? "#f5c518" : "#00e5a0", fontWeight: 600 }}>{row.pct?.toFixed(1)}%</span>
                      </td>
                      <td style={{ padding: "6px 14px", color: row.penarikan > 0 ? "#f5c518" : "#374151" }}>{fmt.rupiah(row.penarikan)}</td>
                      <td style={{ padding: "6px 14px" }}>
                        {row.is_refill ? <span style={{ color: "#00e5a0", fontSize: 11, fontWeight: 600 }}>✓ REFILL</span> : <span style={{ color: "#374151" }}>-</span>}
                      </td>
                      <td style={{ padding: "6px 14px" }}>
                        <span style={{ color: STATUS_COLOR[row.status] || "#64748b", fontSize: 11 }}>{row.status || "-"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {!data && !loading && !err && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 300, color: "#64748b", gap: 8 }}>
          <div style={{ fontSize: 40, opacity: 0.2 }}>◈</div>
          <span>Masukkan ID ATM dan klik Tampilkan</span>
        </div>
      )}
    </div>
  );
}

function PredCard({ pred }) {
  const sc = STATUS_COLOR[pred.status] || "#6b7280";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap",
      background: "rgba(255,255,255,0.02)", border: `1px solid ${sc}33`,
      borderRadius: 12, padding: "14px 20px", marginBottom: 16,
    }}>
      <div>
        <div style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }}>Status Prediksi</div>
        <div style={{ color: sc, fontWeight: 700, fontSize: 15, marginTop: 2 }}>{pred.status}</div>
      </div>
      {[
        { label: "Est. Habis", value: fmt.jam(pred.est_jam) },
        { label: "Tgl Habis",  value: pred.tgl_habis || "-" },
        { label: "Jadwal Isi", value: pred.tgl_isi ? `${pred.tgl_isi} ${pred.jam_isi}` : "-" },
        { label: "Laju/Jam",   value: fmt.rupiah(pred.tarik_per_jam) },
        { label: "Metode",     value: pred.metode || "-" },
      ].map(m => (
        <div key={m.label}>
          <div style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }}>{m.label}</div>
          <div style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 14, marginTop: 2 }}>{m.value}</div>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(99,179,237,0.08)", borderRadius: 10, padding: "14px 18px" }}>
      <div style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{label}</div>
      <div style={{ color, fontWeight: 700, fontSize: 20 }}>{value}</div>
    </div>
  );
}

function SaldoChart({ data, limit }) {
  if (!data || data.length === 0) return null;

  const W = 900, H = 200, PAD = { t: 10, b: 40, l: 80, r: 20 };
  const w = W - PAD.l - PAD.r;
  const h = H - PAD.t - PAD.b;

  const maxSaldo = limit || Math.max(...data.map(d => d.saldo));
  const minSaldo = 0;

  const xs = i => PAD.l + (i / (data.length - 1 || 1)) * w;
  const ys = v => PAD.t + h - ((v - minSaldo) / (maxSaldo - minSaldo || 1)) * h;

  const pts = data.map((d, i) => `${xs(i)},${ys(d.saldo)}`).join(" ");
  const area = `M ${PAD.l},${PAD.t + h} L ${pts.split(" ").map((p, i) => (i === 0 ? p : p)).join(" L ")} L ${xs(data.length - 1)},${PAD.t + h} Z`;

  // Y axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(p => ({
    y: PAD.t + h - p * h,
    label: fmt.rupiah(p * maxSaldo),
  }));

  // X axis labels (max 8)
  const xStep = Math.max(1, Math.floor(data.length / 8));
  const xLabels = data.filter((_, i) => i % xStep === 0 || i === data.length - 1)
    .map((d, _, arr) => ({
      x: xs(data.indexOf(d)),
      label: String(d.datetime).slice(5, 13),
    }));

  // Refill markers
  const refills = data.map((d, i) => ({ i, d })).filter(({ d }) => d.is_refill);

  const limitY = ys(limit);

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="dg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff3b5c" stopOpacity="0" />
          <stop offset="100%" stopColor="#ff3b5c" stopOpacity="0.08" />
        </linearGradient>
      </defs>

      {/* Grid */}
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={PAD.l} x2={PAD.l + w} y1={t.y} y2={t.y} stroke="rgba(99,179,237,0.08)" strokeWidth="1" strokeDasharray="4,4" />
          <text x={PAD.l - 8} y={t.y + 4} fontSize="10" fill="#374151" textAnchor="end">{t.label}</text>
        </g>
      ))}

      {/* Danger zone below 20% */}
      {(() => {
        const dangerY = ys(maxSaldo * 0.2);
        return (
          <rect x={PAD.l} y={dangerY} width={w} height={PAD.t + h - dangerY}
            fill="rgba(255,59,92,0.05)" />
        );
      })()}

      {/* Limit line */}
      {limit > 0 && (
        <line x1={PAD.l} x2={PAD.l + w} y1={limitY} y2={limitY}
          stroke="rgba(167,139,250,0.4)" strokeWidth="1" strokeDasharray="6,4" />
      )}

      {/* Area fill */}
      <path d={area} fill="url(#sg)" />

      {/* Line */}
      <polyline points={pts} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" />

      {/* Refill markers */}
      {refills.map(({ i, d }) => (
        <g key={i}>
          <line x1={xs(i)} x2={xs(i)} y1={PAD.t} y2={PAD.t + h} stroke="rgba(0,229,160,0.3)" strokeWidth="1" strokeDasharray="3,3" />
          <circle cx={xs(i)} cy={ys(d.saldo)} r="4" fill="#00e5a0" />
        </g>
      ))}

      {/* Dots for last point */}
      <circle cx={xs(data.length - 1)} cy={ys(data[data.length - 1]?.saldo || 0)} r="5" fill="#3b82f6" />

      {/* X labels */}
      {xLabels.map((l, i) => (
        <text key={i} x={l.x} y={H - 4} fontSize="9" fill="#374151" textAnchor="middle">{l.label}</text>
      ))}
    </svg>
  );
}

function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 12, color: "#64748b" }}>
      <div style={{ width: 32, height: 32, border: "2px solid rgba(59,130,246,0.2)", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
