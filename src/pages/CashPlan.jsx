// src/pages/CashPlan.jsx
// Halaman List Penambahan Saldo ATM — berdasarkan prediksi & threshold AWAS ≤30%
import { useState, useEffect, useMemo } from "react";
import { apiFetch, fmt } from "../utils/api";

// ── Konstanta denominasi ATM BRK Syariah ────────────────
const DENOM_OPTIONS = [
  { label: "Rp 50.000", value: 50_000 },
  { label: "Rp 100.000", value: 100_000 },
];

const WILAYAH_LIST  = ["Semua", "PEKANBARU", "BATAM", "DUMAI", "Tanjung Pinang"];
const STATUS_FILTER = ["Semua", "BONGKAR", "AWAS"];
const BULAN_ID = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember",
];

// ── Helpers ──────────────────────────────────────────────
const fmtRp = (v) => {
  if (v == null || isNaN(v)) return "—";
  return "Rp " + Number(v).toLocaleString("id-ID");
};

const fmtLembar = (total, denom) => {
  if (!total || !denom) return "—";
  return Math.ceil(total / denom).toLocaleString("id-ID") + " lembar";
};

const nowBulan = () => BULAN_ID[new Date().getMonth()];
const nowTahun = () => new Date().getFullYear();

// Target saldo setelah isi = 100% dari limit
const targetSaldo = (limit) => Math.round(limit * 1);
const jumlahIsi   = (saldo, limit) => Math.max(0, targetSaldo(limit) - saldo);

// Warna status
const STATUS_STYLE = {
  BONGKAR:        { color: "#ff3b5c", bg: "rgba(255,59,92,0.12)",   border: "rgba(255,59,92,0.3)"   },
  AWAS:           { color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.3)"  },
  "PERLU PANTAU": { color: "#60a5fa", bg: "rgba(96,165,250,0.12)",  border: "rgba(96,165,250,0.3)"  },
  AMAN:           { color: "#22c55e", bg: "rgba(34,197,94,0.12)",   border: "rgba(34,197,94,0.3)"   },
};

const DONE_STYLE  = { color: "#00e5a0", bg: "rgba(0,229,160,0.12)", border: "rgba(0,229,160,0.3)"  };
const PRED_STYLE  = { color: "#a78bfa", bg: "rgba(167,139,250,0.1)", border: "rgba(167,139,250,0.25)" };

// ════════════════════════════════════════════════════════
export default function CashPlan({ navigateTo, externalItems = [], onDoneChange }) {
  const [rawData,  setRawData]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [genAt,    setGenAt]    = useState(null);

  // Filter state
  const [filterWilayah, setFilterWilayah] = useState("Semua");
  const [filterStatus,  setFilterStatus]  = useState("Semua");
  const [filterBulan,   setFilterBulan]   = useState(nowBulan());
  const [filterTipe,    setFilterTipe]    = useState("Semua");
  const [search,        setSearch]        = useState("");

  // Denom global (bisa override per baris)
  const [denomGlobal, setDenomGlobal] = useState(100_000);

  // Override per ATM: { [id_atm]: { denom, keterangan, statusDone } }
  const [overrides, setOverrides] = useState({});

  // Manual entries (tambahan manual by ID ATM)
  const [manualItems, setManualItems] = useState([]);

  // Sort
  const [sort, setSort] = useState({ key: "skor_urgensi", dir: -1 });

  // Pagination
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 15;

  // Modal tambah manual
  const [showAddModal, setShowAddModal] = useState(false);
  const [addIdInput,   setAddIdInput]   = useState("");
  const [addLoading,   setAddLoading]   = useState(false);
  const [addError,     setAddError]     = useState("");

  // ── Fetch predictions ────────────────────────────────
  const fetchData = () => {
    setLoading(true);
    apiFetch("/api/predictions?limit=500")
      .then(r => {
        // Filter hanya ATM AWAS (≤30%) dan BONGKAR (≤20%)
        const filtered = (r.data || []).filter(d =>
          d.status === "BONGKAR" || d.status === "AWAS"
        );
        setRawData(filtered);
        setGenAt(r.generated_at || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  // Merge external items dari History ke manualItems
  useEffect(() => {
    if (!externalItems || externalItems.length === 0) return;
    setManualItems(prev => {
      const existing = new Set(prev.map(x => x.id_atm));
      const news = externalItems.filter(x => !existing.has(x.id_atm));
      return [...prev, ...news];
    });
  }, [externalItems]);

  // ── Filter + sort ─────────────────────────────────────
  // Gabungkan rawData + manualItems (hindari duplikasi by id_atm)
  const allData = useMemo(() => {
    const rawIds = new Set(rawData.map(d => d.id_atm));
    const extras = manualItems.filter(m => !rawIds.has(m.id_atm));
    return [...rawData, ...extras];
  }, [rawData, manualItems]);

  const filtered = useMemo(() => {
    let d = allData;
    if (filterWilayah !== "Semua") d = d.filter(r => r.wilayah === filterWilayah);
    if (filterStatus  !== "Semua") d = d.filter(r => r.status  === filterStatus);
    if (filterTipe    !== "Semua") d = d.filter(r => r.tipe    === filterTipe);
    if (search) {
      const q = search.toLowerCase();
      d = d.filter(r =>
        r.id_atm?.toLowerCase().includes(q) ||
        r.lokasi?.toLowerCase().includes(q) ||
        r.wilayah?.toLowerCase().includes(q)
      );
    }
    return [...d].sort((a, b) => {
      const va = a[sort.key] ?? 0, vb = b[sort.key] ?? 0;
      return sort.dir * (va > vb ? 1 : va < vb ? -1 : 0);
    });
  }, [allData, filterWilayah, filterStatus, filterTipe, search, sort]);

  const paged   = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const maxPage = Math.ceil(filtered.length / PAGE_SIZE);

  const toggleSort = (key) => {
    setSort(s => ({ key, dir: s.key === key ? -s.dir : -1 }));
    setPage(0);
  };

  // ── Override helpers ──────────────────────────────────
  const setOverride = (id, field, val) => {
    setOverrides(prev => {
      const next = { ...prev, [id]: { ...prev[id], [field]: val } };
      // Notify parent for rekap page
      if (field === "statusDone" && onDoneChange) {
        const doneItems = allData
          .filter(d => (next[d.id_atm]?.statusDone))
          .map(d => ({ ...d, ...next[d.id_atm] }));
        onDoneChange(doneItems);
      }
      return next;
    });
  };

  const getDenom = (id) => overrides[id]?.denom ?? denomGlobal;
  const getKet   = (id) => overrides[id]?.keterangan ?? "";
  const isDone   = (id) => overrides[id]?.statusDone ?? false;

  // ── Remove helper ─────────────────────────────────────
  const removeItem = (id_atm) => {
    // Hapus dari manual items
    setManualItems(prev => prev.filter(m => m.id_atm !== id_atm));
    // Hapus dari rawData (untuk ATM yang muncul dari API)
    setRawData(prev => prev.filter(d => d.id_atm !== id_atm));
    // Hapus override
    setOverrides(prev => {
      const next = { ...prev };
      delete next[id_atm];
      return next;
    });
  };

  // ── Summary counts ────────────────────────────────────
  const totalBongkar = allData.filter(d => d.status === "BONGKAR").length;
  const totalAwas    = allData.filter(d => d.status === "AWAS").length;
  const totalDone    = Object.values(overrides).filter(o => o.statusDone).length;
  const totalNominal = filtered.reduce((sum, d) => sum + jumlahIsi(d.saldo, d.limit), 0);

  // ── Add manual by ID ATM ──────────────────────────────
  const handleAddManual = async () => {
    const id = addIdInput.trim().toUpperCase();
    if (!id) return;
    // Cek duplikasi
    if (allData.some(d => d.id_atm === id)) {
      setAddError("ATM ini sudah ada dalam daftar Cash Plan.");
      return;
    }
    setAddLoading(true);
    setAddError("");
    try {
      const res = await apiFetch(`/api/predictions/${id}`);
      if (!res || !res.id_atm) throw new Error("ATM tidak ditemukan");
      setManualItems(prev => [...prev, { ...res, _manual: true }]);
      setAddIdInput("");
      setShowAddModal(false);
    } catch (e) {
      setAddError(e.message || "ATM tidak ditemukan di sistem.");
    } finally {
      setAddLoading(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      {/* ── Header ─────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ color: "#e2e8f0", fontSize: 24, fontWeight: 700, margin: "0 0 4px", letterSpacing: "-0.02em" }}>
            Cash Plan — Penambahan Saldo ATM
          </h1>
          <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>
            {filterBulan} {nowTahun()} · ATM dengan saldo ≤30% limit (AWAS &amp; BONGKAR) ·{" "}
            {genAt ? `Prediksi: ${new Date(genAt).toLocaleString("id-ID")}` : "—"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select
            value={filterBulan}
            onChange={e => setFilterBulan(e.target.value)}
            style={selectStyle}
          >
            {BULAN_ID.map(b => <option key={b} value={b}>{b} {nowTahun()}</option>)}
          </select>
          <button
            onClick={() => { setAddError(""); setShowAddModal(true); }}
            style={btnStyle("#00e5a0")}
          >
            + Tambah Manual
          </button>
          <button onClick={fetchData} style={btnStyle("#3b82f6")}>↺ Refresh</button>
        </div>
      </div>

      {/* ── Summary Cards ──────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total ATM Perlu Isi", value: allData.length,     color: "#60a5fa", icon: "◈" },
          { label: "BONGKAR",            value: totalBongkar,         color: "#ff3b5c", icon: "⚠" },
          { label: "AWAS",               value: totalAwas,            color: "#f59e0b", icon: "⊕" },
          { label: "Sudah Selesai",       value: totalDone,           color: "#00e5a0", icon: "✓" },
          { label: "Est. Total Nominal",  value: fmtRp(totalNominal), color: "#a78bfa", icon: "◎", small: true },
        ].map(c => (
          <div key={c.label} style={{
            background: "rgba(255,255,255,0.02)",
            border: `1px solid ${c.color}28`,
            borderRadius: 10, padding: "14px 16px", textAlign: "center",
          }}>
            <div style={{ fontSize: 18, color: c.color, marginBottom: 6 }}>{c.icon}</div>
            <div style={{ color: c.color, fontSize: c.small ? 14 : 26, fontWeight: 700, lineHeight: 1 }}>{c.value}</div>
            <div style={{ color: "#64748b", fontSize: 10, marginTop: 6, textTransform: "uppercase", letterSpacing: "0.07em" }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* ── Filter Bar ─────────────────────────────────── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input
          placeholder="Cari ID ATM / lokasi / wilayah..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(99,179,237,0.15)",
            borderRadius: 8, color: "#e2e8f0",
            padding: "8px 14px", fontSize: 13, width: 220, outline: "none",
          }}
        />
        {[
          { label: "Wilayah", val: filterWilayah, set: setFilterWilayah, opts: WILAYAH_LIST },
          { label: "Status",  val: filterStatus,  set: setFilterStatus,  opts: STATUS_FILTER },
          { label: "Tipe",    val: filterTipe,    set: setFilterTipe,    opts: ["Semua","EMV","CRM"] },
        ].map(f => (
          <select key={f.label} value={f.val} onChange={e => { f.set(e.target.value); setPage(0); }} style={selectStyle}>
            {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}

        {/* Denom global */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#64748b", fontSize: 12 }}>Denom default:</span>
          <select
            value={denomGlobal}
            onChange={e => setDenomGlobal(Number(e.target.value))}
            style={{ ...selectStyle, border: "1px solid rgba(167,139,250,0.3)", color: "#a78bfa" }}
          >
            {DENOM_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={{
          background: "rgba(255,255,255,0.015)",
          border: "1px solid rgba(99,179,237,0.08)",
          borderRadius: 12, overflow: "hidden",
        }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(99,179,237,0.12)", background: "rgba(255,255,255,0.02)" }}>
                  {[
                    { label: "No",             key: null },
                    { label: "Tanggal",        key: "last_update" },
                    { label: "Bulan",          key: null },
                    { label: "ID ATM",         key: "id_atm" },
                    { label: "Lokasi ATM",     key: "lokasi" },
                    { label: "Wilayah",        key: "wilayah" },
                    { label: "EMV/CRM",        key: "tipe" },
                    { label: "Denom",          key: null },
                    { label: "Total Isi",      key: "saldo" },
                    { label: "Lembar",         key: null },
                    { label: "Jam Cash Out",   key: null },
                    { label: "Jam Cash In",    key: "tgl_isi" },
                    { label: "Saldo Terakhir", key: "saldo" },
                    { label: "Status",         key: "status" },
                    { label: "Keterangan",     key: null },
                    { label: "Aksi",           key: null },
                  ].map((col, ci) => (
                    <th
                      key={ci}
                      onClick={col.key ? () => toggleSort(col.key) : undefined}
                      style={{
                        padding: "11px 12px",
                        textAlign: "left",
                        color: col.key && sort.key === col.key ? "#60a5fa" : "#64748b",
                        fontWeight: 600, fontSize: 10,
                        letterSpacing: "0.07em",
                        textTransform: "uppercase",
                        cursor: col.key ? "pointer" : "default",
                        whiteSpace: "nowrap",
                        userSelect: "none",
                      }}
                    >
                      {col.label}
                      {col.key && sort.key === col.key && (
                        <span style={{ marginLeft: 3, color: "#60a5fa" }}>{sort.dir > 0 ? "↑" : "↓"}</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((atm, i) => {
                  const rowNo    = page * PAGE_SIZE + i + 1;
                  const denom    = getDenom(atm.id_atm);
                  const totalIsi = jumlahIsi(atm.saldo, atm.limit);
                  const done     = isDone(atm.id_atm);
                  const ket      = getKet(atm.id_atm);
                  const isManual = !!atm._manual;

                  // Tanggal dari last_update
                  const lastUpDt  = atm.last_update ? new Date(atm.last_update) : null;
                  const tglStr    = lastUpDt ? lastUpDt.toLocaleDateString("id-ID", { day:"2-digit", month:"2-digit", year:"numeric" }) : "—";
                  const jamCashOut = lastUpDt ? lastUpDt.toLocaleTimeString("id-ID", { hour:"2-digit", minute:"2-digit" }) : "—";

                  // Jam Cash In dari prediksi (tgl_isi + jam_isi)
                  const jamCashIn = atm.tgl_isi && atm.jam_isi
                    ? `${atm.tgl_isi} ${atm.jam_isi}`
                    : atm.tgl_isi || "—";

                  const ss  = done ? DONE_STYLE : (STATUS_STYLE[atm.status] || PRED_STYLE);
                  const rowBg = done
                    ? "rgba(0,229,160,0.03)"
                    : atm.status === "BONGKAR"
                    ? "rgba(255,59,92,0.025)"
                    : "transparent";

                  return (
                    <tr
                      key={atm.id_atm}
                      style={{
                        background: rowBg,
                        borderBottom: "1px solid rgba(99,179,237,0.05)",
                        opacity: done ? 0.65 : 1,
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={e => !done && (e.currentTarget.style.background = "rgba(59,130,246,0.05)")}
                      onMouseLeave={e => (e.currentTarget.style.background = rowBg)}
                    >
                      {/* No */}
                      <td style={tdStyle("#64748b")}>{rowNo}</td>

                      {/* Tanggal */}
                      <td style={tdStyle("#94a3b8")}>{tglStr}</td>

                      {/* Bulan */}
                      <td style={tdStyle("#94a3b8")}>{filterBulan}</td>

                      {/* ID ATM */}
                      <td style={{ ...tdStyle("#e2e8f0"), fontFamily: "monospace", fontWeight: 700 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span
                            style={{ cursor: "pointer", textDecoration: "underline dotted" }}
                            onClick={() => navigateTo && navigateTo("history", atm.id_atm)}
                          >
                            {atm.id_atm}
                          </span>
                          {isManual && (
                            <span style={{
                              fontSize: 8, padding: "1px 5px", borderRadius: 3,
                              background: "rgba(0,229,160,0.1)", color: "#00e5a0",
                              border: "1px solid rgba(0,229,160,0.2)", fontFamily: "sans-serif",
                            }}>MANUAL</span>
                          )}
                        </div>
                      </td>

                      {/* Lokasi */}
                      <td style={{ ...tdStyle("#94a3b8"), maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        title={atm.lokasi}>
                        {atm.lokasi || "—"}
                      </td>

                      {/* Wilayah */}
                      <td style={tdStyle("#94a3b8")}>{atm.wilayah || "—"}</td>

                      {/* EMV/CRM */}
                      <td style={{ padding: "8px 12px" }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                          background: atm.tipe === "CRM" ? "rgba(167,139,250,0.15)" : "rgba(96,165,250,0.12)",
                          color: atm.tipe === "CRM" ? "#a78bfa" : "#60a5fa",
                          border: atm.tipe === "CRM" ? "1px solid rgba(167,139,250,0.3)" : "1px solid rgba(96,165,250,0.25)",
                        }}>
                          {atm.tipe || "—"}
                        </span>
                      </td>

                      {/* Denom (override per baris) */}
                      <td style={{ padding: "8px 10px" }}>
                        <select
                          value={denom}
                          onChange={e => setOverride(atm.id_atm, "denom", Number(e.target.value))}
                          style={{
                            background: "#0d1228",
                            border: "1px solid rgba(167,139,250,0.25)",
                            borderRadius: 6, color: "#a78bfa",
                            padding: "4px 6px", fontSize: 11,
                            cursor: "pointer", outline: "none",
                          }}
                        >
                          {DENOM_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                        </select>
                      </td>

                      {/* Total Isi */}
                      <td style={{ ...tdStyle("#e2e8f0"), fontWeight: 600 }}>
                        <span style={{ color: "#f59e0b" }}>{fmtRp(totalIsi)}</span>
                        <div style={{ color: "#64748b", fontSize: 10, marginTop: 1 }}>
                          target 100%: {fmtRp(targetSaldo(atm.limit))}
                        </div>
                      </td>

                      {/* Lembar */}
                      <td style={tdStyle("#94a3b8")}>
                        {totalIsi > 0 ? fmtLembar(totalIsi, denom) : <span style={{ color: "#374151" }}>—</span>}
                      </td>

                      {/* Jam Cash Out Terakhir */}
                      <td style={tdStyle("#94a3b8")}>{jamCashOut}</td>

                      {/* Jam Cash In (prediksi jadwal isi) */}
                      <td style={{ padding: "8px 12px" }}>
                        <span style={{ color: "#60a5fa", fontSize: 11, fontWeight: 600 }}>{jamCashIn}</span>
                        {atm.tgl_awas && (
                          <div style={{ color: "#f59e0b", fontSize: 10, marginTop: 1 }}>
                            AWAS: {atm.tgl_awas} {atm.jam_awas}
                          </div>
                        )}
                      </td>

                      {/* Saldo Terakhir */}
                      <td style={{ padding: "8px 12px" }}>
                        <div style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 12 }}>{fmtRp(atm.saldo)}</div>
                        <div style={{ marginTop: 3 }}>
                          <SaldoBar pct={atm.pct_saldo} />
                        </div>
                      </td>

                      {/* Status (Done / Prediksi toggle) */}
                      <td style={{ padding: "8px 12px" }}>
                        <button
                          onClick={() => setOverride(atm.id_atm, "statusDone", !done)}
                          style={{
                            fontSize: 10, fontWeight: 700,
                            padding: "3px 10px", borderRadius: 5,
                            background: ss.bg, color: ss.color,
                            border: `1px solid ${ss.border}`,
                            cursor: "pointer", whiteSpace: "nowrap",
                            transition: "all 0.15s",
                          }}
                        >
                          {done ? "✓ Done" : `◎ ${atm.status}`}
                        </button>
                        <div style={{ color: "#374151", fontSize: 9, marginTop: 3, textAlign: "center" }}>
                          {done ? "klik = batalkan" : "klik = selesai"}
                        </div>
                      </td>

                      {/* Keterangan (editable) */}
                      <td style={{ padding: "8px 10px" }}>
                        <input
                          value={ket}
                          onChange={e => setOverride(atm.id_atm, "keterangan", e.target.value)}
                          placeholder="catatan..."
                          style={{
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(99,179,237,0.12)",
                            borderRadius: 6, color: "#e2e8f0",
                            padding: "4px 8px", fontSize: 11,
                            width: 130, outline: "none",
                          }}
                        />
                      </td>

                      {/* ── Aksi: Remove ── */}
                      <td style={{ padding: "8px 10px" }}>
                        <button
                          onClick={() => {
                            if (window.confirm(`Hapus ATM ${atm.id_atm} dari Cash Plan?`)) {
                              removeItem(atm.id_atm);
                            }
                          }}
                          title="Hapus dari Cash Plan"
                          style={{
                            background: "rgba(255,59,92,0.08)",
                            border: "1px solid rgba(255,59,92,0.25)",
                            borderRadius: 6, color: "#ff3b5c",
                            padding: "4px 10px", fontSize: 11,
                            cursor: "pointer", fontWeight: 600,
                            transition: "all 0.15s",
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,59,92,0.18)"}
                          onMouseLeave={e => e.currentTarget.style.background = "rgba(255,59,92,0.08)"}
                        >
                          ✕ Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {maxPage > 1 && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 20px", borderTop: "1px solid rgba(99,179,237,0.08)",
            }}>
              <span style={{ color: "#64748b", fontSize: 12 }}>
                Halaman {page + 1} dari {maxPage} · {filtered.length} ATM
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                <PageBtn disabled={page === 0}          onClick={() => setPage(p => p - 1)}>← Prev</PageBtn>
                <PageBtn disabled={page >= maxPage - 1} onClick={() => setPage(p => p + 1)}>Next →</PageBtn>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Legend ─────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 20, marginTop: 16, flexWrap: "wrap" }}>
        {[
          { label: "BONGKAR — saldo ≤ 20% limit",    color: "#ff3b5c" },
          { label: "AWAS — saldo 20–30% limit",       color: "#f59e0b" },
          { label: "Done — sudah diisi",               color: "#00e5a0" },
          { label: "Target isi = 100% dari limit ATM",  color: "#a78bfa" },
          { label: "MANUAL — ditambahkan secara manual", color: "#00e5a0" },
        ].map(l => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />
            <span style={{ color: "#64748b", fontSize: 11 }}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* ── Modal Tambah Manual ─────────────────────────── */}
      {showAddModal && (
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000,
        }}>
          <div style={{
            background: "#0d1228",
            border: "1px solid rgba(99,179,237,0.2)",
            borderRadius: 16, padding: "28px 32px",
            width: 420, boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ color: "#e2e8f0", fontSize: 18, fontWeight: 700, margin: 0 }}>
                Tambah ATM Manual
              </h2>
              <button
                onClick={() => { setShowAddModal(false); setAddError(""); setAddIdInput(""); }}
                style={{ background: "none", border: "none", color: "#64748b", fontSize: 20, cursor: "pointer" }}
              >×</button>
            </div>

            <div style={{ color: "#64748b", fontSize: 13, marginBottom: 16 }}>
              Tambahkan ATM ke Cash Plan berdasarkan ID ATM. Data akan diambil dari sistem prediksi.
            </div>

            <label style={{ color: "#94a3b8", fontSize: 12, display: "block", marginBottom: 6 }}>
              ID ATM
            </label>
            <input
              value={addIdInput}
              onChange={e => { setAddIdInput(e.target.value.toUpperCase()); setAddError(""); }}
              onKeyDown={e => e.key === "Enter" && handleAddManual()}
              placeholder="Contoh: CRM10101 atau EMV82901"
              autoFocus
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(99,179,237,0.2)",
                borderRadius: 8, color: "#e2e8f0",
                padding: "10px 14px", fontSize: 14,
                width: "100%", outline: "none",
                boxSizing: "border-box",
                fontFamily: "monospace",
              }}
            />

            {addError && (
              <div style={{
                marginTop: 10, padding: "8px 12px",
                background: "rgba(255,59,92,0.08)",
                border: "1px solid rgba(255,59,92,0.25)",
                borderRadius: 8, color: "#ff3b5c", fontSize: 12,
              }}>
                ⚠ {addError}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button
                onClick={handleAddManual}
                disabled={addLoading || !addIdInput.trim()}
                style={{
                  flex: 1,
                  background: addLoading || !addIdInput.trim() ? "rgba(0,229,160,0.05)" : "rgba(0,229,160,0.15)",
                  border: "1px solid rgba(0,229,160,0.3)",
                  borderRadius: 8, color: "#00e5a0",
                  padding: "10px 0", fontSize: 13, fontWeight: 700,
                  cursor: addLoading || !addIdInput.trim() ? "not-allowed" : "pointer",
                }}
              >
                {addLoading ? "Mencari..." : "+ Tambahkan ke Cash Plan"}
              </button>
              <button
                onClick={() => { setShowAddModal(false); setAddError(""); setAddIdInput(""); }}
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(99,179,237,0.12)",
                  borderRadius: 8, color: "#64748b",
                  padding: "10px 18px", fontSize: 13,
                  cursor: "pointer",
                }}
              >Batal</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────

function SaldoBar({ pct }) {
  const color = pct <= 20 ? "#ff3b5c" : pct <= 30 ? "#f59e0b" : "#22c55e";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <div style={{ width: 50, height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2 }}>
        <div style={{ height: "100%", width: `${Math.min(pct || 0, 100)}%`, background: color, borderRadius: 2 }} />
      </div>
      <span style={{ color, fontSize: 10, fontWeight: 700 }}>{pct?.toFixed(0)}%</span>
    </div>
  );
}

function PageBtn({ children, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: disabled ? "transparent" : "rgba(59,130,246,0.1)",
      border: "1px solid rgba(59,130,246,0.2)",
      borderRadius: 6, color: disabled ? "#374151" : "#60a5fa",
      padding: "5px 12px", fontSize: 12,
      cursor: disabled ? "default" : "pointer",
    }}>{children}</button>
  );
}

function EmptyState() {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: 280, gap: 12,
      background: "rgba(0,229,160,0.03)",
      border: "1px solid rgba(0,229,160,0.1)", borderRadius: 12,
    }}>
      <span style={{ fontSize: 36 }}>✓</span>
      <span style={{ color: "#00e5a0", fontWeight: 600, fontSize: 16 }}>Semua ATM Dalam Kondisi Aman</span>
      <span style={{ color: "#64748b", fontSize: 13 }}>Tidak ada ATM dengan status AWAS atau BONGKAR</span>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 12, color: "#64748b" }}>
      <div style={{ width: 32, height: 32, border: "2px solid rgba(59,130,246,0.2)", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <span>Memuat data Cash Plan...</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────
const selectStyle = {
  background: "#0d1228",
  border: "1px solid rgba(99,179,237,0.15)",
  borderRadius: 8, color: "#94a3b8",
  padding: "8px 12px", fontSize: 13,
  cursor: "pointer", outline: "none",
};

const tdStyle = (color) => ({
  padding: "8px 12px",
  color,
  whiteSpace: "nowrap",
});

const btnStyle = (accent) => ({
  background: accent === "#00e5a0"
    ? "rgba(0,229,160,0.1)"
    : "rgba(59,130,246,0.1)",
  border: `1px solid ${accent}44`,
  borderRadius: 8,
  color: accent === "#00e5a0" ? "#00e5a0" : "#60a5fa",
  padding: "8px 16px", fontSize: 13,
  cursor: "pointer", fontWeight: 600,
});