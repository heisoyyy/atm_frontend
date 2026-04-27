// src/pages/History.jsx
import { useState, useEffect, useCallback } from "react";
import { apiFetch, fmt, STATUS_COLOR, STATUS_BG, addCashplanAPI } from "../utils/api";

// ── Threshold Constants ────────────────────────────────────
const THR_BONGKAR    = 20;
const THR_AWAS       = 30;
const THR_TRIGGER    = 35;
const THR_AUTO_CP    = 25;
const THR_LAJU_NOTIF = 5;

// ── LocalStorage key untuk track ATM yg sudah masuk cashplan ──
const CP_STORAGE_KEY = "cashplan_added_atms";

const getCashplanAdded = () => {
  try {
    return JSON.parse(localStorage.getItem(CP_STORAGE_KEY) || "{}");
  } catch { return {}; }
};
const markCashplanAdded = (atmId) => {
  const existing = getCashplanAdded();
  existing[atmId] = new Date().toISOString();
  localStorage.setItem(CP_STORAGE_KEY, JSON.stringify(existing));
};
const isAlreadyAdded = (atmId) => !!getCashplanAdded()[atmId];

// ── Helpers ────────────────────────────────────────────────
const getPctStatus = (pct) => {
  if (pct == null) return "NO DATA";
  if (pct > 100)   return "OVERFUND";
  if (pct <= THR_BONGKAR) return "BONGKAR";
  if (pct <= THR_AWAS)    return "AWAS";
  if (pct <= THR_TRIGGER) return "PERLU PANTAU";
  return "AMAN";
};

const STATUS_SC = {
  BONGKAR:        { color: "#E24B4A", bg: "rgba(226,75,74,0.08)",    border: "rgba(226,75,74,0.25)"    },
  AWAS:           { color: "#EF9F27", bg: "rgba(239,159,39,0.08)",   border: "rgba(239,159,39,0.25)"   },
  "PERLU PANTAU": { color: "#d4b800", bg: "rgba(212,184,0,0.08)",    border: "rgba(212,184,0,0.25)"    },
  AMAN:           { color: "#1D9E75", bg: "rgba(29,158,117,0.08)",   border: "rgba(29,158,117,0.25)"   },
  OVERFUND:       { color: "#7F77DD", bg: "rgba(127,119,221,0.08)",  border: "rgba(127,119,221,0.25)"  },
  "NO DATA":      { color: "#888780", bg: "rgba(136,135,128,0.08)",  border: "rgba(136,135,128,0.25)"  },
};

// ── Sub-components ─────────────────────────────────────────
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
  <div style={{ color: "#ffffff", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
    {children}
  </div>
);

const TabBar = ({ tabs, active, onChange }) => (
  <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
    {tabs.map((tab) => (
      <button key={tab.key} onClick={() => onChange(tab.key)} style={{
        background: active === tab.key ? "rgba(99,179,237,0.12)" : "transparent",
        border: active === tab.key ? "1px solid rgba(99,179,237,0.35)" : "1px solid rgba(99,179,237,0.08)",
        borderRadius: 8,
        color: active === tab.key ? "#93c5fd" : "#ffffff",
        padding: "7px 16px", fontSize: 12,
        fontWeight: active === tab.key ? 600 : 400,
        cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
      }}>
        {tab.label}
      </button>
    ))}
  </div>
);

// ── Main ───────────────────────────────────────────────────
export default function History({ atmId: initialAtmId, navigateTo }) {
  const [inputId,   setInputId]   = useState(initialAtmId || "");
  const [days,      setDays]      = useState(7);
  const [data,      setData]      = useState(null);
  const [predData,  setPredData]  = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [err,       setErr]       = useState(null);
  const [chartTab,  setChartTab]  = useState("historis");

  // ── Track apakah ATM ini sudah ditambahkan ke cashplan ──
  const [cpAdded, setCpAdded] = useState(false);

  const isLajuTinggi = predData && data
    ? (predData.tarik_per_jam || 0) >= (data.limit || 1) * (THR_LAJU_NOTIF / 100)
    : false;

  const isAtmSepi = (histData) => {
    if (!histData || histData.length === 0) return false;
    const cutoff = new Date(Date.now() - 14 * 24 * 3600 * 1000);
    const recent = histData.filter((d) => new Date(d.datetime) >= cutoff);
    if (recent.length === 0) return true;
    return !recent.some((d) => (d.penarikan || 0) > 0);
  };

  const fetchData = useCallback(async () => {
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
      // Cek apakah sudah pernah ditambahkan ke cashplan
      setCpAdded(isAlreadyAdded(inputId.trim()));
    } catch (e) {
      setErr(e.message || "Gagal memuat data historis ATM");
    } finally {
      setLoading(false);
    }
  }, [inputId, days]);

  useEffect(() => { if (initialAtmId) setInputId(initialAtmId); }, [initialAtmId]);
  useEffect(() => { if (inputId.trim()) fetchData(); }, [inputId, days]);

  // ── Handler tambah ke cashplan (dipanggil dari PredCard) ──
  const handleAddedToCashplan = useCallback((atmId) => {
    markCashplanAdded(atmId);
    setCpAdded(true);
  }, []);

  // ── Auto-add ke cashplan jika pct <= 25% ───────────────
  useEffect(() => {
    if (!predData || !data) return;
    const pct = predData.pct_saldo ?? 0;
    if (pct <= THR_AUTO_CP && !isAlreadyAdded(predData.id_atm)) {
      const payload = {
        id_atm:       predData.id_atm,
        lokasi:       predData.lokasi    || "-",
        wilayah:      predData.wilayah   || "-",
        tipe:         predData.tipe      || "-",
        saldo:        data.saldo_latest,
        limit:        data.limit         || 0,
        pct_saldo:    pct,
        status_awal:  predData.status,
        tgl_isi:      predData.tgl_isi   || null,
        jam_isi:      predData.jam_isi   || null,
        est_jam:      predData.est_jam   || null,
        skor_urgensi: predData.skor_urgensi || 0,
        added_by:     "system",
      };
      addCashplanAPI(payload)
        .then(() => handleAddedToCashplan(predData.id_atm))
        .catch(console.error);
    }
  }, [predData, data]);

  // ── Pagination ─────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  useEffect(() => { setCurrentPage(1); }, [data]);

  const allRows     = data?.data ? [...data.data].reverse() : [];
  const totalPages  = Math.ceil(allRows.length / rowsPerPage);
  const startIndex  = (currentPage - 1) * rowsPerPage;
  const currentRows = allRows.slice(startIndex, startIndex + rowsPerPage);

  // ── Prediksi 24 jam ke depan ───────────────────────────
  const predRows24 = predData
    ? Array.from({ length: 25 }, (_, i) => {
        const saldo  = Math.max(0, (data?.saldo_latest || 0) - i * (predData.tarik_per_jam || 0));
        const limit  = data?.limit || 1;
        const pct    = limit > 0 ? (saldo / limit) * 100 : 0;
        const status = getPctStatus(pct);
        const sc     = STATUS_SC[status] || STATUS_SC["NO DATA"];
        return { jam: i, saldo, pct, status, sc };
      })
    : [];

  const atmSepi = data ? isAtmSepi(data.data || []) : false;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ color: "#e2e8f0", fontSize: 26, fontWeight: 700, margin: "0 0 4px", letterSpacing: "-0.02em" }}>
          Historis & Prediksi ATM
        </h1>
        <p style={{ color: "#ffffff", fontSize: 13, margin: 0 }}>
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
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(99,179,237,0.15)",
            borderRadius: 8, color: "#e2e8f0", padding: "10px 16px",
            fontSize: 14, width: 340, outline: "none",
          }}
        />
        <div style={{ display: "flex", gap: 6 }}>
          {[3, 7, 14, 30].map((d) => (
            <button key={d} onClick={() => setDays(d)} style={{
              background: days === d ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.03)",
              border: days === d ? "1px solid rgba(59,130,246,0.5)" : "1px solid rgba(99,179,237,0.1)",
              borderRadius: 8, color: days === d ? "#60a5fa" : "#ffffff",
              padding: "8px 16px", fontSize: 13,
              fontWeight: days === d ? 600 : 400, cursor: "pointer",
            }}>
              {d} Hari
            </button>
          ))}
        </div>
        <button onClick={fetchData} disabled={loading || !inputId.trim()} style={{
          background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.4)",
          borderRadius: 8, color: "#60a5fa", padding: "9px 24px",
          fontSize: 13, fontWeight: 600,
          cursor: loading || !inputId.trim() ? "not-allowed" : "pointer",
        }}>
          {loading ? "Memuat..." : "Tampilkan Data"}
        </button>
      </div>

      {err && (
        <div style={{
          color: "#ff3b5c", background: "rgba(255,59,92,0.08)",
          border: "1px solid rgba(255,59,92,0.3)",
          borderRadius: 10, padding: "14px 18px", marginBottom: 20,
        }}>⚠ {err}</div>
      )}

      {loading && <Spinner />}

      {data && !loading && (
        <>
          {/* Notif Laju Tinggi */}
          {isLajuTinggi && (
            <div style={{ background: "rgba(212,184,0,0.08)", border: "1px solid rgba(212,184,0,0.35)", borderRadius: 10, padding: "12px 18px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 20 }}>⚡</span>
              <div>
                <div style={{ color: "#d4b800", fontWeight: 700, fontSize: 14 }}>Perlu Pantau — Laju Penarikan Tinggi</div>
                <div style={{ color: "#ffffff", fontSize: 12, marginTop: 2 }}>
                  Penarikan per jam mencapai <strong style={{ color: "#d4b800" }}>{fmt.rupiah(predData.tarik_per_jam)}</strong>
                  {" "}({((predData.tarik_per_jam / (data.limit || 1)) * 100).toFixed(1)}% dari limit) — melebihi ambang {THR_LAJU_NOTIF}%.
                </div>
              </div>
            </div>
          )}

          {/* ATM Sepi Banner */}
          {atmSepi && (
            <div style={{ background: "rgba(127,119,221,0.08)", border: "1px solid rgba(127,119,221,0.3)", borderRadius: 10, padding: "12px 18px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 20 }}>◐</span>
              <div>
                <div style={{ color: "#7F77DD", fontWeight: 700, fontSize: 14 }}>ATM Sepi</div>
                <div style={{ color: "#ffffff", fontSize: 12, marginTop: 2 }}>Tidak ada transaksi selama 14 hari terakhir.</div>
              </div>
            </div>
          )}

          {/* ── NOTIF SUDAH DI CASHPLAN ── */}
          {cpAdded && (
            <div style={{
              background: "rgba(0,229,160,0.08)", border: "1px solid rgba(0,229,160,0.3)",
              borderRadius: 10, padding: "12px 18px", marginBottom: 16,
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <span style={{ fontSize: 20 }}>✅</span>
              <div>
                <div style={{ color: "#00e5a0", fontWeight: 700, fontSize: 14 }}>
                  ATM ini sudah masuk Cash Plan
                </div>
                <div style={{ color: "#ffffff", fontSize: 12, marginTop: 2 }}>
                  Data akan otomatis diperbarui saat ada upload data baru dari Colab.
                  Pantau status di halaman <button onClick={() => navigateTo?.("cashplan")} style={{ background: "none", border: "none", color: "#00e5a0", cursor: "pointer", textDecoration: "underline", padding: 0, fontSize: 12 }}>Cash Plan →</button>
                </div>
              </div>
            </div>
          )}

          {/* PredCard */}
          {predData && (
            <PredCard
              pred={predData}
              saldoLatest={data.saldo_latest}
              limit={data.limit}
              atmSepi={atmSepi}
              isLajuTinggi={isLajuTinggi}
              alreadyAdded={cpAdded}
              onAdded={handleAddedToCashplan}
              atmInfo={{
                id_atm:        data.id_atm,
                lokasi:        predData.lokasi,
                wilayah:       predData.wilayah,
                tipe:          predData.tipe,
                limit:         data.limit,
                saldo:         data.saldo_latest,
                pct_saldo:     predData.pct_saldo,
                status:        predData.status,
                tarik_per_jam: predData.tarik_per_jam,
                tgl_isi:       predData.tgl_isi,
                jam_isi:       predData.jam_isi,
                est_jam:       predData.est_jam,
                skor_urgensi:  predData.skor_urgensi,
              }}
            />
          )}

          {/* Statistik Cepat */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Saldo Terkini",  value: fmt.rupiah(data.saldo_latest), color: "#60a5fa" },
              { label: "Saldo Terendah", value: fmt.rupiah(data.saldo_min),    color: "#ff3b5c" },
              { label: "Limit ATM",      value: fmt.rupiah(data.limit),        color: "#00e5a0" },
              { label: "Total Refill",   value: data.refill_count ?? 0,        color: "#f5c518" },
            ].map((s, i) => (
              <Card key={i} style={{ padding: "16px 20px" }}>
                <div style={{ color: "#ffffff", fontSize: 11, textTransform: "uppercase" }}>{s.label}</div>
                <div style={{ color: s.color, fontSize: 22, fontWeight: 700, marginTop: 4 }}>{s.value}</div>
              </Card>
            ))}
          </div>

          {/* Chart Tab */}
          <Card style={{ marginBottom: 20 }}>
            <TabBar
              tabs={[
                { key: "historis", label: "Tren Saldo Historis" },
                { key: "prediksi", label: "Prediksi Sisa Saldo 24 Jam" },
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
              <div style={{ textAlign: "center", color: "#ffffff", padding: "60px 20px", fontSize: 13 }}>
                Data prediksi tidak tersedia untuk ATM ini.
              </div>
            )}
          </Card>

          {/* Data Table */}
          <DataTableSection
            currentRows={currentRows}
            allRows={allRows}
            currentPage={currentPage}
            totalPages={totalPages}
            rowsPerPage={rowsPerPage}
            setCurrentPage={setCurrentPage}
            predRows24={predRows24}
            hasPred={!!predData}
            alreadyAdded={cpAdded}
            onAdded={handleAddedToCashplan}
            atmInfo={predData ? {
              id_atm:        data.id_atm,
              lokasi:        predData.lokasi,
              wilayah:       predData.wilayah,
              tipe:          predData.tipe,
              limit:         data.limit,
              saldo:         data.saldo_latest,
              pct_saldo:     predData.pct_saldo,
              status:        predData.status,
              tarik_per_jam: predData.tarik_per_jam,
              tgl_isi:       predData.tgl_isi,
              jam_isi:       predData.jam_isi,
              est_jam:       predData.est_jam,
              skor_urgensi:  predData.skor_urgensi,
            } : null}
          />
        </>
      )}
    </div>
  );
}

// ── PredCard ───────────────────────────────────────────────
function PredCard({ pred, saldoLatest, limit, atmSepi, isLajuTinggi, alreadyAdded, onAdded, atmInfo }) {
  const [adding, setAdding] = useState(false);

  const pct = pred.pct_saldo ?? (saldoLatest && limit ? (saldoLatest / limit) * 100 : null);
  const sc  = STATUS_SC[pred.status] || STATUS_SC["NO DATA"];

  const isAutoMasuk  = pct != null && pct <= THR_AUTO_CP;
  const isTriggerBtn = pct != null && pct > THR_AUTO_CP && pct <= THR_TRIGGER;

  const handleAddCP = async () => {
    if (alreadyAdded || adding || !atmInfo) return;
    setAdding(true);
    try {
      await addCashplanAPI({
        id_atm:       atmInfo.id_atm,
        lokasi:       atmInfo.lokasi    || "-",
        wilayah:      atmInfo.wilayah   || "-",
        tipe:         atmInfo.tipe      || "-",
        saldo:        atmInfo.saldo,
        limit:        atmInfo.limit     || 0,
        pct_saldo:    atmInfo.pct_saldo,
        status_awal:  atmInfo.status,
        tgl_isi:      atmInfo.tgl_isi   || null,
        jam_isi:      atmInfo.jam_isi   || null,
        est_jam:      atmInfo.est_jam   || null,
        skor_urgensi: atmInfo.skor_urgensi || 0,
        added_by:     "user",
        denom_options: predData?.denom_options || "100000",
      });
      onAdded?.(atmInfo.id_atm);
    } catch (e) {
      alert("Gagal menambahkan ke Cash Plan: " + e.message);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div style={{
      background: sc.bg, border: `1px solid ${sc.border}`,
      borderRadius: 12, padding: "16px 22px",
      marginBottom: 20, display: "flex",
      flexWrap: "wrap", gap: 24, alignItems: "center",
    }}>
      {/* Status */}
      <div>
        <div style={{ color: "#ffffff", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
          Status Prediksi
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ color: sc.color, fontSize: 20, fontWeight: 700 }}>{pred.status}</div>
          {atmSepi && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "rgba(127,119,221,0.15)", color: "#7F77DD", border: "1px solid rgba(127,119,221,0.3)", fontWeight: 600 }}>◐ ATM SEPI</span>}
          {isLajuTinggi && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "rgba(212,184,0,0.12)", color: "#d4b800", border: "1px solid rgba(212,184,0,0.3)", fontWeight: 600 }}>⚡ LAJU TINGGI</span>}
        </div>
      </div>

      {/* Info metrics */}
      {[
        { label: "Est. Jam Habis", value: pred.est_jam != null ? `${pred.est_jam.toFixed(1)} jam` : "—" },
        { label: "Tarik/Jam",      value: fmt.rupiah(pred.tarik_per_jam) },
        { label: "Jadwal Isi",     value: pred.tgl_isi ? `${pred.tgl_isi} ${pred.jam_isi || ""}` : "—" },
        { label: "Skor Urgensi",   value: pred.skor_urgensi != null ? `${pred.skor_urgensi}/100` : "—" },
        { label: "% Saldo",        value: pct != null ? `${pct.toFixed(1)}%` : "—" },
      ].map((s, i) => (
        <div key={i}>
          <div style={{ color: "#ffffff", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{s.label}</div>
          <div style={{ color: "#e2e8f0", fontSize: 15, fontWeight: 600 }}>{s.value}</div>
        </div>
      ))}

      {/* Cash Plan Action */}
      <div style={{ marginLeft: "auto" }}>
        {/* Sudah ditambahkan */}
        {alreadyAdded && (
          <div style={{
            fontSize: 12, fontWeight: 700, padding: "8px 18px", borderRadius: 8,
            background: "rgba(0,229,160,0.1)", color: "#00e5a0",
            border: "1px solid rgba(0,229,160,0.3)", textAlign: "center",
          }}>
            ✅ Sudah di Cash Plan
            <div style={{ fontSize: 10, fontWeight: 400, marginTop: 2, color: "#ffffff" }}>
              Tunggu upload data baru
            </div>
          </div>
        )}

        {/* Auto masuk (pct ≤ 25%) dan belum ditandai */}
        {!alreadyAdded && isAutoMasuk && (
          <div style={{
            fontSize: 11, fontWeight: 700, padding: "6px 14px", borderRadius: 7,
            background: "rgba(255,59,92,0.1)", color: "#ff3b5c",
            border: "1px solid rgba(255,59,92,0.3)", textAlign: "center",
          }}>
            <div>⚡ Otomatis Masuk</div>
            <div style={{ fontSize: 9, fontWeight: 400, marginTop: 2, color: "#f87171" }}>Cash Plan (saldo ≤25%)</div>
          </div>
        )}

        {/* Tombol manual (25% < pct ≤ 35%) */}
        {!alreadyAdded && isTriggerBtn && (
          <button onClick={handleAddCP} disabled={adding} style={{
            fontSize: 12, fontWeight: 700, padding: "8px 18px", borderRadius: 8,
            background: adding ? "rgba(212,184,0,0.05)" : "rgba(212,184,0,0.12)",
            color: "#d4b800", border: "1px solid rgba(212,184,0,0.35)",
            cursor: adding ? "not-allowed" : "pointer",
            transition: "all 0.15s", whiteSpace: "nowrap",
          }}>
            {adding ? "Menyimpan..." : "+ Tambah ke Cash Plan"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── DataTableSection ───────────────────────────────────────
function DataTableSection({ currentRows, allRows, currentPage, totalPages, rowsPerPage, setCurrentPage, predRows24, hasPred, alreadyAdded, onAdded, atmInfo }) {
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

      {dataTab === "historis" && (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid rgba(99,179,237,0.15)" }}>
                  {["Waktu", "Saldo", "Persentase", "Penarikan", "Refill", "Status"].map((h) => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#ffffff", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentRows.map((row, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(99,179,237,0.06)", background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent" }}>
                    <td style={{ padding: "10px 16px", color: "#ffffff", fontFamily: "monospace" }}>{String(row.datetime).slice(0, 16)}</td>
                    <td style={{ padding: "10px 16px", color: "#e2e8f0", fontWeight: 600 }}>{fmt.rupiah(row.saldo)}</td>
                    <td style={{ padding: "10px 16px" }}>
                      <span style={{ color: row.pct <= THR_BONGKAR ? "#E24B4A" : row.pct <= THR_AWAS ? "#EF9F27" : "#1D9E75" }}>
                        {row.pct?.toFixed(1)}%
                      </span>
                    </td>
                    <td style={{ padding: "10px 16px", color: "#ffffff" }}>{row.penarikan > 0 ? fmt.rupiah(row.penarikan) : "—"}</td>
                    <td style={{ padding: "10px 16px" }}>
                      {row.is_refill ? (
                        <span style={{ background: "rgba(0,229,160,0.1)", color: "#00e5a0", borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>✓ Refill</span>
                      ) : "—"}
                    </td>
                    <td style={{ padding: "10px 16px" }}>
                      <span style={{ background: STATUS_BG?.[row.status] || "rgba(100,116,139,0.1)", color: STATUS_COLOR?.[row.status] || "#ffffff", borderRadius: 5, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>
                        {row.status || "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, flexWrap: "wrap", gap: 8 }}>
              <span style={{ color: "#ffffff", fontSize: 12 }}>
                {(currentPage - 1) * rowsPerPage + 1}–{Math.min(currentPage * rowsPerPage, allRows.length)} dari {allRows.length} baris
              </span>
              <div style={{ display: "flex", gap: 4 }}>
                <PaginBtn onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>←</PaginBtn>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const p = totalPages <= 7 ? i + 1 : currentPage <= 4 ? i + 1 : currentPage >= totalPages - 3 ? totalPages - 6 + i : currentPage - 3 + i;
                  return <PaginBtn key={p} onClick={() => setCurrentPage(p)} active={currentPage === p}>{p}</PaginBtn>;
                })}
                <PaginBtn onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>→</PaginBtn>
              </div>
            </div>
          )}
        </>
      )}

      {dataTab === "prediksi" && (
        <>
          {!hasPred ? (
            <div style={{ textAlign: "center", color: "#ffffff", padding: "60px 20px", fontSize: 13 }}>Data prediksi tidak tersedia untuk ATM ini.</div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16, padding: "10px 14px", background: "rgba(99,179,237,0.04)", border: "1px solid rgba(99,179,237,0.1)", borderRadius: 8 }}>
                {[
                  { label: "AMAN",         color: "#1D9E75", desc: `> ${THR_TRIGGER}% limit` },
                  { label: "PERLU PANTAU", color: "#d4b800", desc: `${THR_AWAS}–${THR_TRIGGER}% · ada tombol Cash Plan` },
                  { label: "AWAS",         color: "#EF9F27", desc: `${THR_BONGKAR}–${THR_AWAS}% · otomatis Cash Plan` },
                  { label: "BONGKAR",      color: "#E24B4A", desc: `≤ ${THR_BONGKAR}% · otomatis Cash Plan` },
                ].map((s) => (
                  <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                    <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: s.color }} />
                    <span style={{ color: s.color, fontWeight: 600 }}>{s.label}</span>
                    <span style={{ color: "#ffffff" }}>{s.desc}</span>
                  </div>
                ))}
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid rgba(99,179,237,0.15)" }}>
                      {["Jam ke Depan", "Waktu Estimasi", "Prediksi Saldo", "% Saldo", "Status", "Cash Plan"].map(h => (
                        <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#ffffff", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {predRows24.map((row, i) => {
                      const now     = new Date();
                      const estTime = new Date(now.getTime() + row.jam * 3600 * 1000);
                      const timeStr = row.jam === 0 ? "Sekarang" : estTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
                      const showAutoLabel  = row.pct <= THR_AUTO_CP;
                      const showTriggerBtn = row.pct > THR_AUTO_CP && row.pct <= THR_TRIGGER;

                      return (
                        <tr key={i} style={{ borderBottom: "1px solid rgba(99,179,237,0.06)", background: row.jam === 0 ? "rgba(99,179,237,0.06)" : row.pct <= THR_AUTO_CP ? "rgba(226,75,74,0.025)" : i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent" }}>
                          <td style={{ padding: "10px 16px" }}>
                            <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 5, background: row.jam === 0 ? "rgba(99,179,237,0.15)" : "rgba(255,255,255,0.04)", color: row.jam === 0 ? "#93c5fd" : "#ffffff", fontFamily: "monospace", fontSize: 12, fontWeight: row.jam === 0 ? 700 : 400 }}>
                              {row.jam === 0 ? "Sekarang" : `+${row.jam} Jam`}
                            </span>
                          </td>
                          <td style={{ padding: "10px 16px", color: "#ffffff", fontFamily: "monospace", fontSize: 12 }}>{timeStr}</td>
                          <td style={{ padding: "10px 16px", color: "#e2e8f0", fontWeight: 600 }}>{fmt.rupiah(row.saldo)}</td>
                          <td style={{ padding: "10px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ width: 56, height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                                <div style={{ width: `${Math.min(row.pct, 100)}%`, height: "100%", background: row.sc.color, borderRadius: 3 }} />
                              </div>
                              <span style={{ color: row.sc.color, fontSize: 12, fontWeight: 600, fontFamily: "monospace" }}>{row.pct.toFixed(1)}%</span>
                            </div>
                          </td>
                          <td style={{ padding: "10px 16px" }}>
                            <span style={{ background: row.sc.bg, color: row.sc.color, border: `1px solid ${row.sc.border}`, borderRadius: 5, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>{row.status}</span>
                          </td>
                          <td style={{ padding: "10px 16px" }}>
                            <CashPlanCell
                              showAutoLabel={showAutoLabel}
                              showTriggerBtn={showTriggerBtn}
                              row={row}
                              atmInfo={atmInfo}
                              alreadyAdded={alreadyAdded}
                              onAdded={onAdded}
                            />
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

// ── CashPlanCell ───────────────────────────────────────────
function CashPlanCell({ showAutoLabel, showTriggerBtn, row, atmInfo, alreadyAdded, onAdded }) {
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (alreadyAdded || adding || !atmInfo) return;
    setAdding(true);
    try {
      await addCashplanAPI({
        id_atm:       atmInfo.id_atm,
        lokasi:       atmInfo.lokasi    || "-",
        wilayah:      atmInfo.wilayah   || "-",
        tipe:         atmInfo.tipe      || "-",
        saldo:        row.saldo,
        limit:        atmInfo.limit     || 0,
        pct_saldo:    row.pct,
        status_awal:  row.status,
        tgl_isi:      atmInfo.tgl_isi   || null,
        jam_isi:      atmInfo.jam_isi   || null,
        est_jam:      atmInfo.est_jam   || null,
        skor_urgensi: atmInfo.skor_urgensi || 0,
        added_by:     "user",
      });
      onAdded?.(atmInfo.id_atm);
    } catch (e) {
      alert("Gagal: " + e.message);
    } finally {
      setAdding(false);
    }
  };

  // Jika sudah ditambahkan (dari manapun di halaman ini)
  if (alreadyAdded) {
    return <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 5, background: "rgba(0,229,160,0.08)", color: "#00e5a0", border: "1px solid rgba(0,229,160,0.25)" }}>✅ Di Cash Plan</span>;
  }

  if (showAutoLabel) {
    return <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 5, background: "rgba(226,75,74,0.08)", color: "#E24B4A", border: "1px solid rgba(226,75,74,0.25)", whiteSpace: "nowrap" }}>⚡ Otomatis Masuk</span>;
  }

  if (showTriggerBtn) {
    return (
      <button onClick={handleAdd} disabled={adding} style={{
        fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 5,
        background: "rgba(212,184,0,0.1)", color: "#d4b800",
        border: "1px solid rgba(212,184,0,0.3)",
        cursor: adding ? "default" : "pointer",
        transition: "all 0.15s", whiteSpace: "nowrap",
      }}>
        {adding ? "..." : "+ Cash Plan"}
      </button>
    );
  }

  return <span style={{ color: "#ffffff", fontSize: 11 }}>—</span>;
}

// ── PaginBtn ───────────────────────────────────────────────
function PaginBtn({ children, onClick, disabled, active }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: active ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.03)",
      border: active ? "1px solid rgba(59,130,246,0.5)" : "1px solid rgba(99,179,237,0.1)",
      borderRadius: 6, color: disabled ? "#334155" : active ? "#60a5fa" : "#ffffff",
      padding: "5px 10px", fontSize: 12, cursor: disabled ? "not-allowed" : "pointer",
      minWidth: 32, opacity: disabled ? 0.4 : 1,
    }}>{children}</button>
  );
}

// ── SaldoChart ─────────────────────────────────────────────
function SaldoChart({ data, limit }) {
  if (!data || data.length === 0) return null;
  const W = 900, H = 200, PAD = { t: 10, b: 40, l: 100, r: 30 };
  const w = W - PAD.l - PAD.r, h = H - PAD.t - PAD.b;
  const maxSaldo = limit || Math.max(...data.map(d => d.saldo));
  const xs = i => PAD.l + (i / (data.length - 1 || 1)) * w;
  const ys = v => PAD.t + h - (v / (maxSaldo || 1)) * h;
  const pts = data.map((d, i) => `${xs(i)},${ys(d.saldo)}`).join(" ");
  const area = `M ${PAD.l},${PAD.t + h} L ${pts.split(" ").join(" L ")} L ${xs(data.length - 1)},${PAD.t + h} Z`;
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(p => ({ y: PAD.t + h - p * h, label: fmt.rupiah(p * maxSaldo) }));
  const xStep  = Math.max(1, Math.floor(data.length / 8));
  const xLabels = data.filter((_, i) => i % xStep === 0 || i === data.length - 1).map(d => ({ x: xs(data.indexOf(d)), label: String(d.datetime).slice(5, 13) }));
  const refills  = data.map((d, i) => ({ i, d })).filter(({ d }) => d.is_refill);
  const awasY    = ys(maxSaldo * (THR_AWAS / 100));
  const bongkarY = ys(maxSaldo * (THR_BONGKAR / 100));

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
          <text x={PAD.l - 8} y={t.y + 4} fontSize="10" fill="#ffffff" textAnchor="end">{t.label}</text>
        </g>
      ))}
      <rect x={PAD.l} y={bongkarY} width={w} height={PAD.t + h - bongkarY} fill="rgba(226,75,74,0.06)" />
      <rect x={PAD.l} y={awasY} width={w} height={bongkarY - awasY} fill="rgba(239,159,39,0.04)" />
      <line x1={PAD.l} x2={PAD.l + w} y1={awasY} y2={awasY} stroke="rgba(239,159,39,0.4)" strokeWidth="1" strokeDasharray="5,4" />
      <text x={PAD.l + w + 4} y={awasY + 4} fontSize="9" fill="#EF9F27">{THR_AWAS}%</text>
      <line x1={PAD.l} x2={PAD.l + w} y1={bongkarY} y2={bongkarY} stroke="rgba(226,75,74,0.5)" strokeWidth="1" strokeDasharray="5,4" />
      <text x={PAD.l + w + 4} y={bongkarY + 4} fontSize="9" fill="#E24B4A">{THR_BONGKAR}%</text>
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
        <text key={i} x={l.x} y={H - 4} fontSize="9" fill="#ffffff" textAnchor="middle">{l.label}</text>
      ))}
    </svg>
  );
}

// ── PredictionFutureChart ──────────────────────────────────
function PredictionFutureChart({ currentSaldo, tarikPerJam, estJamHabis, limit }) {
  // ── Guard: sanitize semua input ──────────────────────────
  const safeSaldo   = (isFinite(currentSaldo) && currentSaldo > 0) ? currentSaldo : 0;
  const safeTarik   = (isFinite(tarikPerJam)  && tarikPerJam  > 0) ? tarikPerJam  : 0;
  const safeLimit   = (isFinite(limit)        && limit        > 0) ? limit        : 0;

  // Jangan render kalau tidak ada data bermakna
  if (safeSaldo === 0 && safeLimit === 0) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: 200, color: "#ffffff", fontSize: 13,
        border: "1px dashed rgba(99,179,237,0.1)", borderRadius: 8,
      }}>
        Data saldo tidak tersedia untuk chart prediksi
      </div>
    );
  }

  const W = 920, H = 260, PAD = { t: 20, b: 50, l: 100, r: 30 };
  const w = W - PAD.l - PAD.r, h = H - PAD.t - PAD.b;

  const hours    = Array.from({ length: 25 }, (_, i) => i);
  // ── maxSaldo: pakai limit jika ada, fallback ke saldo * 1.3, minimum 1 ──
  const maxSaldo = safeLimit > 0 ? safeLimit
                 : safeSaldo > 0 ? safeSaldo * 1.3
                 : 1; // hindari division by zero

  const getSaldo = (hr) => Math.max(0, safeSaldo - hr * safeTarik);
  const xs       = (i) => PAD.l + (i / 24) * w;
  const ys       = (v) => {
    const val = PAD.t + h - (v / maxSaldo) * h;
    return isFinite(val) ? val : PAD.t + h; // fallback ke bottom
  };

  const points   = hours.map(i => `${xs(i)},${ys(getSaldo(i))}`).join(" ");
  const awasY    = ys(maxSaldo * (THR_AWAS / 100));
  const bongkarY = ys(maxSaldo * (THR_BONGKAR / 100));
  const startY   = ys(safeSaldo);

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
            <line x1={PAD.l} x2={PAD.l + w} y1={y} y2={y}
              stroke="rgba(99,179,237,0.08)" strokeDasharray="4,4" />
            <text x={PAD.l - 12} y={y + 4} fontSize="10" fill="#ffffff" textAnchor="end">
              {fmt.rupiah(Math.round(p * maxSaldo))}
            </text>
          </g>
        );
      })}

      <rect x={PAD.l} y={awasY}    width={w} height={Math.max(0, bongkarY - awasY)}          fill="rgba(239,159,39,0.05)" />
      <rect x={PAD.l} y={bongkarY} width={w} height={Math.max(0, h - (bongkarY - PAD.t))}    fill="rgba(226,75,74,0.08)" />

      <line x1={PAD.l} x2={PAD.l + w} y1={awasY}    y2={awasY}    stroke="rgba(239,159,39,0.5)" strokeWidth="1"   strokeDasharray="5,3" />
      <text x={PAD.l + w + 4} y={awasY + 4}    fontSize="9" fill="#EF9F27">{THR_AWAS}%</text>
      <line x1={PAD.l} x2={PAD.l + w} y1={bongkarY} y2={bongkarY} stroke="rgba(226,75,74,0.5)" strokeWidth="1.5" strokeDasharray="5,3" />
      <text x={PAD.l + w + 4} y={bongkarY + 4} fontSize="9" fill="#E24B4A">{THR_BONGKAR}%</text>

      <path
        d={`M ${PAD.l},${startY} L ${points} L ${xs(24)},${PAD.t + h} L ${PAD.l},${PAD.t + h} Z`}
        fill="url(#futureGrad)"
      />
      <polyline points={points} fill="none" stroke="#a78bfa" strokeWidth="3.5"
        strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={xs(0)} cy={startY} r="7" fill="#60a5fa" stroke="#0f172a" strokeWidth="2" />

      {[0, 4, 8, 12, 16, 20, 24].map(i => (
        <text key={i} x={xs(i)} y={H - 12} fontSize="11" fill="#ffffff" textAnchor="middle">
          +{i}j
        </text>
      ))}

      {estJamHabis != null && isFinite(estJamHabis) && estJamHabis > 0 && estJamHabis <= 24 && (
        <>
          <line x1={xs(estJamHabis)} x2={xs(estJamHabis)} y1={PAD.t} y2={PAD.t + h}
            stroke="#ff3b5c" strokeWidth="2.5" strokeDasharray="5,3" />
          <text x={xs(estJamHabis)} y={PAD.t - 10} fontSize="12" fill="#ff3b5c"
            fontWeight="700" textAnchor="middle">HABIS</text>
        </>
      )}
    </svg>
  );
}

function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, flexDirection: "column", gap: 12, color: "#ffffff" }}>
      <div style={{ width: 36, height: 36, border: "3px solid rgba(59,130,246,0.2)", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.9s linear infinite" }} />
      <span>Memuat data historis dan prediksi...</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}