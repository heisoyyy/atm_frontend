// src/pages/History.jsx
import { useState, useEffect } from "react";
import { apiFetch, fmt, STATUS_COLOR, STATUS_BG } from "../utils/api";

const Card = ({ children, title, style = {} }) => (
  <div style={{
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(99,179,237,0.1)",
    borderRadius: 12,
    padding: "20px 24px",
    ...style,
  }}>
    {title && <Label>{title}</Label>}
    {children}
  </div>
);

const Label = ({ children }) => (
  <div style={{
    color: "#64748b",
    fontSize: 11,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    marginBottom: 10,
  }}>
    {children}
  </div>
);

// ── Tab Bar Component ──────────────────────────────────────
const TabBar = ({ tabs, active, onChange }) => (
  <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
    {tabs.map((tab) => (
      <button
        key={tab.key}
        onClick={() => onChange(tab.key)}
        style={{
          background: active === tab.key
            ? "rgba(99,179,237,0.12)"
            : "transparent",
          border: active === tab.key
            ? "1px solid rgba(99,179,237,0.35)"
            : "1px solid rgba(99,179,237,0.08)",
          borderRadius: 8,
          color: active === tab.key ? "#93c5fd" : "#64748b",
          padding: "7px 16px",
          fontSize: 12,
          fontWeight: active === tab.key ? 600 : 400,
          cursor: "pointer",
          letterSpacing: "0.03em",
          transition: "all 0.15s",
          whiteSpace: "nowrap",
        }}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

export default function History({ atmId: initialAtmId }) {
  const [inputId, setInputId] = useState(initialAtmId || "");
  const [days, setDays] = useState(7);
  const [data, setData] = useState(null);
  const [predData, setPredData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  // ── Tab state ──
  const [chartTab, setChartTab] = useState("historis");

  const fetchData = async () => {
    if (!inputId.trim()) return;
    setLoading(true);
    setErr(null);
    try {
      const [historyRes, predRes] = await Promise.all([
        apiFetch(`/api/history/${inputId.trim()}?last_n_days=${days}`),
        apiFetch(`/api/predictions/${inputId.trim()}`).catch(() => null),
      ]);
      setData(historyRes);
      setPredData(predRes);
    } catch (e) {
      setErr(e.message || "Gagal memuat data historis ATM");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialAtmId) setInputId(initialAtmId);
  }, [initialAtmId]);

  useEffect(() => {
    if (inputId.trim()) fetchData();
  }, [inputId, days]);

  // ── Pagination ──
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  useEffect(() => { setCurrentPage(1); }, [data]);

  const allRows = data?.data ? [...data.data].reverse() : [];
  const totalPages = Math.ceil(allRows.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentRows = allRows.slice(startIndex, startIndex + rowsPerPage);

  // ── Build prediksi 24 jam ──
  const predRows24 = predData
    ? Array.from({ length: 25 }, (_, i) => {
        const saldo = Math.max(0, (data?.saldo_latest || 0) - i * (predData.tarik_per_jam || 0));
        const limit = data?.limit || 1;
        const pct   = limit > 0 ? (saldo / limit) * 100 : 0;
        const status =
          pct > 100      ? "OVERFUND"
          : pct <= 20    ? "BONGKAR"
          : pct <= 25    ? "AWAS"
          : pct <= 40    ? "PERLU PANTAU"
          : "AMAN";
        const sc = {
          BONGKAR:        { color: "#ef4444", bg: "rgba(239,68,68,0.08)"   },
          AWAS:           { color: "#f59e0b", bg: "rgba(245,158,11,0.08)"  },
          "PERLU PANTAU": { color: "#60a5fa", bg: "rgba(96,165,250,0.08)"  },
          AMAN:           { color: "#22c55e", bg: "rgba(34,197,94,0.08)"   },
          OVERFUND:       { color: "#a78bfa", bg: "rgba(167,139,250,0.08)" },
        }[status];
        return { jam: i, saldo, pct, status, sc };
      })
    : [];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ color: "#e2e8f0", fontSize: 26, fontWeight: 700, margin: "0 0 4px", letterSpacing: "-0.02em" }}>
          Historis & Prediksi ATM
        </h1>
        <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>
          Analisis tren saldo historis dan prediksi sisa saldo 24 jam ke depan
        </p>
      </div>

      {/* Search & Filter */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24, alignItems: "center" }}>
        <input
          value={inputId}
          onChange={(e) => setInputId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchData()}
          placeholder="Masukkan ID ATM (contoh: CRM10101 atau EMV82901)"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(99,179,237,0.15)",
            borderRadius: 8,
            color: "#e2e8f0",
            padding: "10px 16px",
            fontSize: 14,
            width: 340,
            outline: "none",
          }}
        />
        <div style={{ display: "flex", gap: 6 }}>
          {[3, 7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              style={{
                background: days === d ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.03)",
                border: days === d ? "1px solid rgba(59,130,246,0.5)" : "1px solid rgba(99,179,237,0.1)",
                borderRadius: 8,
                color: days === d ? "#60a5fa" : "#94a3b8",
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: days === d ? 600 : 400,
                cursor: "pointer",
              }}
            >
              {d} Hari
            </button>
          ))}
        </div>
        <button
          onClick={fetchData}
          disabled={loading || !inputId.trim()}
          style={{
            background: "rgba(59,130,246,0.15)",
            border: "1px solid rgba(59,130,246,0.4)",
            borderRadius: 8,
            color: "#60a5fa",
            padding: "9px 24px",
            fontSize: 13,
            fontWeight: 600,
            cursor: loading || !inputId.trim() ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Memuat..." : "Tampilkan Data"}
        </button>
      </div>

      {err && (
        <div style={{
          color: "#ff3b5c",
          background: "rgba(255,59,92,0.08)",
          border: "1px solid rgba(255,59,92,0.3)",
          borderRadius: 10,
          padding: "14px 18px",
          marginBottom: 20,
        }}>
          ⚠ {err}
        </div>
      )}

      {loading && <Spinner />}

      {data && !loading && (
        <>
          {predData && <PredCard pred={predData} />}

          {/* Statistik Cepat */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Saldo Terkini",  value: fmt.rupiah(data.saldo_latest), color: "#60a5fa" },
              { label: "Saldo Terendah", value: fmt.rupiah(data.saldo_min),    color: "#ff3b5c" },
              { label: "Limit ATM",      value: fmt.rupiah(data.limit),        color: "#00e5a0" },
              { label: "Total Refill",   value: data.refill_count ?? 0,        color: "#f5c518" },
            ].map((s, i) => (
              <Card key={i} style={{ padding: "16px 20px" }}>
                <div style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase" }}>{s.label}</div>
                <div style={{ color: s.color, fontSize: 22, fontWeight: 700, marginTop: 4 }}>{s.value}</div>
              </Card>
            ))}
          </div>

          {/* ══ TAB 1: Chart ══ */}
          <Card style={{ marginBottom: 20, padding: "20px 24px" }}>
            <TabBar
              tabs={[
                { key: "historis", label: "Tren Saldo Historis" },
                { key: "prediksi", label: "Prediksi Sisa Saldo 24 Jam ke Depan" },
              ]}
              active={chartTab}
              onChange={setChartTab}
            />

            {chartTab === "historis" && (
              <>
                <Label>Tren Saldo Historis — {data.id_atm} ({days} hari terakhir)</Label>
                <SaldoChart data={data.data} limit={data.limit} />
              </>
            )}

            {chartTab === "prediksi" && predData && (
              <>
                <Label>Prediksi Sisa Saldo 24 Jam ke Depan — {data.id_atm}</Label>
                <PredictionFutureChart
                  currentSaldo={data.saldo_latest}
                  tarikPerJam={predData.tarik_per_jam || 0}
                  estJamHabis={predData.est_jam}
                  limit={data.limit}
                />
              </>
            )}

            {chartTab === "prediksi" && !predData && (
              <div style={{ textAlign: "center", color: "#64748b", padding: "60px 20px", fontSize: 13 }}>
                Data prediksi tidak tersedia untuk ATM ini.
              </div>
            )}
          </Card>

          {/* ══ TAB 2: Data Table ══ */}
          <DataTableSection
            currentRows={currentRows}
            allRows={allRows}
            currentPage={currentPage}
            totalPages={totalPages}
            rowsPerPage={rowsPerPage}
            setCurrentPage={setCurrentPage}
            predRows24={predRows24}
            hasPred={!!predData}
          />
        </>
      )}
    </div>
  );
}

// ── Data Table Section dengan Tab ─────────────────────────
function DataTableSection({ currentRows, allRows, currentPage, totalPages, rowsPerPage, setCurrentPage, predRows24, hasPred }) {
  const [dataTab, setDataTab] = useState("historis");

  return (
    <Card style={{ padding: "20px 24px" }}>
      <TabBar
        tabs={[
          { key: "historis", label: "Data Historis" },
          { key: "prediksi", label: "Data Prediksi 24 Jam" },
        ]}
        active={dataTab}
        onChange={setDataTab}
      />

      {/* ── DATA HISTORIS ── */}
      {dataTab === "historis" && (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid rgba(99,179,237,0.15)" }}>
                  {["Waktu", "Saldo", "Persentase", "Penarikan", "Refill", "Status"].map((h) => (
                    <th key={h} style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      color: "#64748b",
                      fontWeight: 600,
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentRows.map((row, i) => (
                  <tr key={i} style={{
                    borderBottom: "1px solid rgba(99,179,237,0.06)",
                    background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent",
                  }}>
                    <td style={{ padding: "10px 16px", color: "#94a3b8", fontFamily: "monospace" }}>
                      {String(row.datetime).slice(0, 16)}
                    </td>
                    <td style={{ padding: "10px 16px", color: "#e2e8f0", fontWeight: 600 }}>
                      {fmt.rupiah(row.saldo)}
                    </td>
                    <td style={{ padding: "10px 16px" }}>
                      <span style={{ color: row.pct <= 20 ? "#ff3b5c" : row.pct <= 25 ? "#f5c518" : "#00e5a0" }}>
                        {row.pct?.toFixed(1)}%
                      </span>
                    </td>
                    <td style={{ padding: "10px 16px", color: "#94a3b8" }}>
                      {row.penarikan > 0 ? fmt.rupiah(row.penarikan) : "—"}
                    </td>
                    <td style={{ padding: "10px 16px" }}>
                      {row.is_refill ? (
                        <span style={{
                          background: "rgba(0,229,160,0.1)",
                          color: "#00e5a0",
                          borderRadius: 4,
                          padding: "2px 8px",
                          fontSize: 11,
                          fontWeight: 600,
                        }}>
                          ✓ Refill
                        </span>
                      ) : "—"}
                    </td>
                    <td style={{ padding: "10px 16px" }}>
                      <span style={{
                        background: STATUS_BG?.[row.status] || "rgba(100,116,139,0.1)",
                        color: STATUS_COLOR?.[row.status] || "#64748b",
                        borderRadius: 5,
                        padding: "3px 10px",
                        fontSize: 11,
                        fontWeight: 600,
                      }}>
                        {row.status || "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 16,
              flexWrap: "wrap",
              gap: 8,
            }}>
              <span style={{ color: "#64748b", fontSize: 12 }}>
                Menampilkan {(currentPage - 1) * rowsPerPage + 1}–{Math.min(currentPage * rowsPerPage, allRows.length)} dari {allRows.length} baris
              </span>
              <div style={{ display: "flex", gap: 4 }}>
                <PaginBtn onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>←</PaginBtn>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const p = totalPages <= 7 ? i + 1
                    : currentPage <= 4 ? i + 1
                    : currentPage >= totalPages - 3 ? totalPages - 6 + i
                    : currentPage - 3 + i;
                  return (
                    <PaginBtn key={p} onClick={() => setCurrentPage(p)} active={currentPage === p}>{p}</PaginBtn>
                  );
                })}
                <PaginBtn onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>→</PaginBtn>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── DATA PREDIKSI 24 JAM ── */}
      {dataTab === "prediksi" && (
        <>
          {!hasPred ? (
            <div style={{ textAlign: "center", color: "#64748b", padding: "60px 20px", fontSize: 13 }}>
              Data prediksi tidak tersedia untuk ATM ini.
            </div>
          ) : (
            <>
              {/* Legend */}
              <div style={{
                display: "flex",
                gap: 16,
                flexWrap: "wrap",
                marginBottom: 16,
                padding: "10px 14px",
                background: "rgba(99,179,237,0.04)",
                border: "1px solid rgba(99,179,237,0.1)",
                borderRadius: 8,
              }}>
                {[
                  { label: "AMAN",         color: "#22c55e", desc: "> 40% limit"  },
                  { label: "PERLU PANTAU", color: "#60a5fa", desc: "25–40% limit" },
                  { label: "AWAS",         color: "#f59e0b", desc: "20–25% limit" },
                  { label: "BONGKAR",      color: "#ef4444", desc: "< 20% limit"  },
                ].map((s) => (
                  <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                    <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: s.color }} />
                    <span style={{ color: s.color, fontWeight: 600 }}>{s.label}</span>
                    <span style={{ color: "#475569" }}>{s.desc}</span>
                  </div>
                ))}
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid rgba(99,179,237,0.15)" }}>
                      {["Jam ke Depan", "Waktu Estimasi", "Prediksi Saldo", "% Saldo", "Status"].map((h) => (
                        <th key={h} style={{
                          padding: "12px 16px",
                          textAlign: "left",
                          color: "#64748b",
                          fontWeight: 600,
                          fontSize: 11,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {predRows24.map((row, i) => {
                      const now     = new Date();
                      const estTime = new Date(now.getTime() + row.jam * 3600 * 1000);
                      const timeStr = row.jam === 0
                        ? "Sekarang"
                        : estTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

                      return (
                        <tr
                          key={i}
                          style={{
                            borderBottom: "1px solid rgba(99,179,237,0.06)",
                            background: row.jam === 0
                              ? "rgba(99,179,237,0.06)"
                              : i % 2 === 0
                                ? "rgba(255,255,255,0.01)"
                                : "transparent",
                          }}
                        >
                          {/* Jam ke Depan */}
                          <td style={{ padding: "10px 16px" }}>
                            <span style={{
                              display: "inline-block",
                              padding: "2px 10px",
                              borderRadius: 5,
                              background: row.jam === 0 ? "rgba(99,179,237,0.15)" : "rgba(255,255,255,0.04)",
                              color: row.jam === 0 ? "#93c5fd" : "#94a3b8",
                              fontFamily: "monospace",
                              fontSize: 12,
                              fontWeight: row.jam === 0 ? 700 : 400,
                            }}>
                              {row.jam === 0 ? "Sekarang" : `+${row.jam} Jam`}
                            </span>
                          </td>

                          {/* Waktu Estimasi */}
                          <td style={{ padding: "10px 16px", color: "#64748b", fontFamily: "monospace", fontSize: 12 }}>
                            {timeStr}
                          </td>

                          {/* Prediksi Saldo */}
                          <td style={{ padding: "10px 16px", color: "#e2e8f0", fontWeight: 600 }}>
                            {fmt.rupiah(row.saldo)}
                          </td>

                          {/* % Saldo dengan mini bar */}
                          <td style={{ padding: "10px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ width: 56, height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                                <div style={{
                                  width: `${Math.min(row.pct, 100)}%`,
                                  height: "100%",
                                  background: row.sc.color,
                                  borderRadius: 3,
                                  transition: "width 0.3s",
                                }} />
                              </div>
                              <span style={{ color: row.sc.color, fontSize: 12, fontWeight: 600, fontFamily: "monospace" }}>
                                {row.pct.toFixed(1)}%
                              </span>
                            </div>
                          </td>

                          {/* Status */}
                          <td style={{ padding: "10px 16px" }}>
                            <span style={{
                              background: row.sc.bg,
                              color: row.sc.color,
                              border: `1px solid ${row.sc.color}33`,
                              borderRadius: 5,
                              padding: "3px 10px",
                              fontSize: 11,
                              fontWeight: 600,
                            }}>
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </Card>
  );
}

// ── PaginBtn ──────────────────────────────────────────────
function PaginBtn({ children, onClick, disabled, active }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: active ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.03)",
        border: active ? "1px solid rgba(59,130,246,0.5)" : "1px solid rgba(99,179,237,0.1)",
        borderRadius: 6,
        color: disabled ? "#334155" : active ? "#60a5fa" : "#94a3b8",
        padding: "5px 10px",
        fontSize: 12,
        cursor: disabled ? "not-allowed" : "pointer",
        minWidth: 32,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </button>
  );
}

// ── PredCard ──────────────────────────────────────────────
function PredCard({ pred }) {
  const statusColors = {
    BONGKAR:        { color: "#ef4444", bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.25)"   },
    AWAS:           { color: "#f59e0b", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.25)"  },
    "PERLU PANTAU": { color: "#60a5fa", bg: "rgba(96,165,250,0.08)",  border: "rgba(96,165,250,0.25)"  },
    AMAN:           { color: "#22c55e", bg: "rgba(34,197,94,0.08)",   border: "rgba(34,197,94,0.25)"   },
    OVERFUND:       { color: "#a78bfa", bg: "rgba(167,139,250,0.08)", border: "rgba(167,139,250,0.25)" },
  };
  const sc = statusColors[pred.status] || { color: "#64748b", bg: "rgba(100,116,139,0.08)", border: "rgba(100,116,139,0.25)" };

  return (
    <div style={{
      background: sc.bg,
      border: `1px solid ${sc.border}`,
      borderRadius: 12,
      padding: "16px 22px",
      marginBottom: 20,
      display: "flex",
      flexWrap: "wrap",
      gap: 24,
      alignItems: "center",
    }}>
      <div>
        <div style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
          Status Prediksi
        </div>
        <div style={{ color: sc.color, fontSize: 20, fontWeight: 700 }}>{pred.status}</div>
      </div>
      {[
        { label: "Est. Jam Habis", value: pred.est_jam != null ? `${pred.est_jam.toFixed(1)} jam` : "—" },
        { label: "Tarik/Jam",      value: fmt.rupiah(pred.tarik_per_jam) },
        { label: "Jadwal Isi",     value: pred.tgl_isi || "—" },
        { label: "Skor Urgensi",   value: pred.skor_urgensi != null ? `${pred.skor_urgensi}/100` : "—" },
      ].map((s, i) => (
        <div key={i}>
          <div style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{s.label}</div>
          <div style={{ color: "#e2e8f0", fontSize: 15, fontWeight: 600 }}>{s.value}</div>
        </div>
      ))}
    </div>
  );
}

// ── SaldoChart ────────────────────────────────────────────
function SaldoChart({ data, limit }) {
  if (!data || data.length === 0) return null;

  const W = 900, H = 200, PAD = { t: 10, b: 40, l: 80, r: 20 };
  const w = W - PAD.l - PAD.r;
  const h = H - PAD.t - PAD.b;

  const maxSaldo = limit || Math.max(...data.map((d) => d.saldo));
  const xs = (i) => PAD.l + (i / (data.length - 1 || 1)) * w;
  const ys = (v) => PAD.t + h - (v / (maxSaldo || 1)) * h;

  const pts  = data.map((d, i) => `${xs(i)},${ys(d.saldo)}`).join(" ");
  const area = `M ${PAD.l},${PAD.t + h} L ${pts.split(" ").join(" L ")} L ${xs(data.length - 1)},${PAD.t + h} Z`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((p) => ({
    y: PAD.t + h - p * h,
    label: fmt.rupiah(p * maxSaldo),
  }));

  const xStep  = Math.max(1, Math.floor(data.length / 8));
  const xLabels = data
    .filter((_, i) => i % xStep === 0 || i === data.length - 1)
    .map((d) => ({ x: xs(data.indexOf(d)), label: String(d.datetime).slice(5, 13) }));

  const refills = data.map((d, i) => ({ i, d })).filter(({ d }) => d.is_refill);
  const limitY  = ys(limit);

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
      </defs>
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={PAD.l} x2={PAD.l + w} y1={t.y} y2={t.y} stroke="rgba(99,179,237,0.08)" strokeWidth="1" strokeDasharray="4,4" />
          <text x={PAD.l - 8} y={t.y + 4} fontSize="10" fill="#374151" textAnchor="end">{t.label}</text>
        </g>
      ))}
      {(() => {
        const dangerY = ys(maxSaldo * 0.2);
        return <rect x={PAD.l} y={dangerY} width={w} height={PAD.t + h - dangerY} fill="rgba(255,59,92,0.05)" />;
      })()}
      {limit > 0 && (
        <line x1={PAD.l} x2={PAD.l + w} y1={limitY} y2={limitY} stroke="rgba(167,139,250,0.4)" strokeWidth="1" strokeDasharray="6,4" />
      )}
      <path d={area} fill="url(#sg)" />
      <polyline points={pts} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" />
      {refills.map(({ i, d }) => (
        <g key={i}>
          <line x1={xs(i)} x2={xs(i)} y1={PAD.t} y2={PAD.t + h} stroke="rgba(0,229,160,0.3)" strokeWidth="1" strokeDasharray="3,3" />
          <circle cx={xs(i)} cy={ys(d.saldo)} r="4" fill="#00e5a0" />
        </g>
      ))}
      <circle cx={xs(data.length - 1)} cy={ys(data[data.length - 1]?.saldo || 0)} r="5" fill="#3b82f6" />
      {xLabels.map((l, i) => (
        <text key={i} x={l.x} y={H - 4} fontSize="9" fill="#374151" textAnchor="middle">{l.label}</text>
      ))}
    </svg>
  );
}

// ── PredictionFutureChart ─────────────────────────────────
function PredictionFutureChart({ currentSaldo, tarikPerJam, estJamHabis, limit }) {
  const W = 920, H = 260, PAD = { t: 20, b: 50, l: 80, r: 30 };
  const w = W - PAD.l - PAD.r;
  const h = H - PAD.t - PAD.b;

  const hours     = Array.from({ length: 25 }, (_, i) => i);
  const maxSaldo  = limit || currentSaldo * 1.3;
  const getSaldo  = (hr) => Math.max(0, currentSaldo - hr * tarikPerJam);
  const xs        = (i) => PAD.l + (i / 24) * w;
  const ys        = (v) => PAD.t + h - (v / maxSaldo) * h;
  const points    = hours.map((i) => `${xs(i)},${ys(getSaldo(i))}`).join(" ");
  const danger20Y = ys(maxSaldo * 0.2);
  const danger10Y = ys(maxSaldo * 0.1);

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="futureGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
        const y = PAD.t + h * (1 - p);
        return (
          <g key={idx}>
            <line x1={PAD.l} x2={PAD.l + w} y1={y} y2={y} stroke="rgba(99,179,237,0.08)" strokeDasharray="4,4" />
            <text x={PAD.l - 12} y={y + 4} fontSize="10" fill="#64748b" textAnchor="end">
              {fmt.rupiah(Math.round(p * maxSaldo))}
            </text>
          </g>
        );
      })}
      <rect x={PAD.l} y={danger20Y} width={w} height={h - (danger20Y - PAD.t)} fill="rgba(255,59,92,0.06)" />
      <rect x={PAD.l} y={danger10Y} width={w} height={h - (danger10Y - PAD.t)} fill="rgba(255,59,92,0.12)" />
      <path
        d={`M ${PAD.l},${ys(currentSaldo)} L ${points} L ${xs(24)},${PAD.t + h} L ${PAD.l},${PAD.t + h} Z`}
        fill="url(#futureGrad)"
      />
      <polyline points={points} fill="none" stroke="#a78bfa" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={xs(0)} cy={ys(currentSaldo)} r="7" fill="#60a5fa" stroke="#0f172a" strokeWidth="2" />
      {[0, 4, 8, 12, 16, 20, 24].map((i) => (
        <text key={i} x={xs(i)} y={H - 12} fontSize="11" fill="#64748b" textAnchor="middle">+{i}j</text>
      ))}
      {estJamHabis && estJamHabis <= 24 && (
        <>
          <line x1={xs(estJamHabis)} x2={xs(estJamHabis)} y1={PAD.t} y2={PAD.t + h} stroke="#ff3b5c" strokeWidth="2.5" strokeDasharray="5,3" />
          <text x={xs(estJamHabis)} y={PAD.t - 10} fontSize="12" fill="#ff3b5c" fontWeight="700" textAnchor="middle">HABIS</text>
        </>
      )}
    </svg>
  );
}

// ── Spinner ───────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, flexDirection: "column", gap: 12, color: "#64748b" }}>
      <div style={{
        width: 36, height: 36,
        border: "3px solid rgba(59,130,246,0.2)",
        borderTopColor: "#3b82f6",
        borderRadius: "50%",
        animation: "spin 0.9s linear infinite",
      }} />
      <span>Memuat data historis dan prediksi...</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}