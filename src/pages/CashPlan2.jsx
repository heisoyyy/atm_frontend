// src/pages/CashPlan.jsx
// Halaman List Penambahan Saldo ATM
// Data masuk dari tab "Data Prediksi 24 Jam" di History — baris pct ≤ 25%
import { useState, useMemo } from "react";

// ── Konstanta ────────────────────────────────────────────
const DENOM_OPTIONS = [
  { label: "Rp 50.000",  value: 50_000  },
  { label: "Rp 100.000", value: 100_000 },
];

const WILAYAH_LIST  = ["Semua", "Pekanbaru", "Batam", "Dumai", "Tanjung Pinang"];
const STATUS_FILTER = ["Semua", "BONGKAR", "AWAS"];

const BULAN_ID = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember",
];
const nowBulan = () => BULAN_ID[new Date().getMonth()];
const nowTahun = () => new Date().getFullYear();

// ── Helpers ──────────────────────────────────────────────
const fmtRp = (v) => {
  if (v == null || isNaN(v)) return "—";
  return "Rp " + Number(v).toLocaleString("id-ID");
};
const fmtLembar = (total, denom) => {
  if (!total || !denom) return "—";
  return Math.ceil(total / denom).toLocaleString("id-ID") + " lembar";
};

const targetSaldo80 = (limit) => Math.round(limit * 1);
const jumlahIsi     = (saldo, limit) => Math.max(0, targetSaldo80(limit) - saldo);

const STATUS_STYLE = {
  BONGKAR: { color: "#ff3b5c", bg: "rgba(255,59,92,0.12)",   border: "rgba(255,59,92,0.3)"   },
  AWAS:    { color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.3)"  },
};
const DONE_STYLE = { color: "#00e5a0", bg: "rgba(0,229,160,0.12)", border: "rgba(0,229,160,0.3)" };

// ════════════════════════════════════════════════════════
export default function CashPlan({ items = [], onRemove, navigateTo }) {
  const [filterWilayah, setFilterWilayah] = useState("Semua");
  const [filterStatus,  setFilterStatus]  = useState("Semua");
  const [filterBulan,   setFilterBulan]   = useState(nowBulan());
  const [filterTipe,    setFilterTipe]    = useState("Semua");
  const [search,        setSearch]        = useState("");
  const [denomGlobal,   setDenomGlobal]   = useState(100_000);
  const [overrides,     setOverrides]     = useState({});
  const [sort,          setSort]          = useState({ key: "status", dir: -1 });
  const [page,          setPage]          = useState(0);
  const PAGE_SIZE = 15;

  const filtered = useMemo(() => {
    let d = items;
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
      const order = { BONGKAR: 2, AWAS: 1 };
      if (sort.key === "status") return sort.dir * ((order[b.status]||0) - (order[a.status]||0));
      const va = a[sort.key] ?? 0, vb = b[sort.key] ?? 0;
      return sort.dir * (va > vb ? 1 : va < vb ? -1 : 0);
    });
  }, [items, filterWilayah, filterStatus, filterTipe, search, sort]);

  const paged   = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const maxPage = Math.ceil(filtered.length / PAGE_SIZE);
  const toggleSort = (key) => { setSort(s => ({ key, dir: s.key === key ? -s.dir : -1 })); setPage(0); };

  const setOv    = (key, field, val) => setOverrides(p => ({ ...p, [key]: { ...p[key], [field]: val } }));
  const getDenom = (key) => overrides[key]?.denom      ?? denomGlobal;
  const getKet   = (key) => overrides[key]?.keterangan ?? "";
  const isDone   = (key) => overrides[key]?.statusDone ?? false;

  const totalBongkar = items.filter(d => d.status === "BONGKAR").length;
  const totalAwas    = items.filter(d => d.status === "AWAS").length;
  const totalDone    = Object.values(overrides).filter(o => o.statusDone).length;
  const totalNominal = filtered.reduce((sum, d) => sum + jumlahIsi(d.saldo, d.limit), 0);

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ color: "#e2e8f0", fontSize: 24, fontWeight: 700, margin: "0 0 4px", letterSpacing: "-0.02em" }}>
            Cash Plan — Penambahan Saldo ATM
          </h1>
          <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>
            {filterBulan} {nowTahun()} · Proyeksi saldo menyentuh ≤25% dalam 24 jam ke depan
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <select value={filterBulan} onChange={e => setFilterBulan(e.target.value)} style={selectSt}>
            {BULAN_ID.map(b => <option key={b} value={b}>{b} {nowTahun()}</option>)}
          </select>
          <button onClick={() => navigateTo && navigateTo("history")} style={{
            background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)",
            borderRadius: 8, color: "#60a5fa", padding: "8px 16px",
            fontSize: 13, cursor: "pointer", fontWeight: 600,
          }}>+ Tambah dari History</button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total ATM",         value: items.length,       color: "#60a5fa", icon: "◈" },
          { label: "BONGKAR",           value: totalBongkar,       color: "#ff3b5c", icon: "⚠" },
          { label: "AWAS",              value: totalAwas,          color: "#f59e0b", icon: "⊕" },
          { label: "Selesai",           value: totalDone,          color: "#00e5a0", icon: "✓" },
          { label: "Est. Total Nominal",value: fmtRp(totalNominal),color: "#a78bfa", icon: "◎", sm: true },
        ].map(c => (
          <div key={c.label} style={{
            background: "rgba(255,255,255,0.02)", border: `1px solid ${c.color}28`,
            borderRadius: 10, padding: "14px 16px", textAlign: "center",
          }}>
            <div style={{ fontSize: 18, color: c.color, marginBottom: 6 }}>{c.icon}</div>
            <div style={{ color: c.color, fontSize: c.sm ? 13 : 26, fontWeight: 700, lineHeight: 1 }}>{c.value}</div>
            <div style={{ color: "#64748b", fontSize: 10, marginTop: 6, textTransform: "uppercase", letterSpacing: "0.07em" }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input placeholder="Cari ID ATM / lokasi..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(99,179,237,0.15)", borderRadius: 8, color: "#e2e8f0", padding: "8px 14px", fontSize: 13, width: 200, outline: "none" }}
        />
        {[
          { val: filterWilayah, set: setFilterWilayah, opts: WILAYAH_LIST },
          { val: filterStatus,  set: setFilterStatus,  opts: STATUS_FILTER },
          { val: filterTipe,    set: setFilterTipe,    opts: ["Semua","EMV","CRM"] },
        ].map((f, fi) => (
          <select key={fi} value={f.val} onChange={e => { f.set(e.target.value); setPage(0); }} style={selectSt}>
            {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#64748b", fontSize: 12 }}>Denom default:</span>
          <select value={denomGlobal} onChange={e => setDenomGlobal(Number(e.target.value))}
            style={{ ...selectSt, border: "1px solid rgba(167,139,250,0.3)", color: "#a78bfa" }}>
            {DENOM_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
      </div>

      {/* Empty State */}
      {items.length === 0 ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", height: 320, gap: 16,
          background: "rgba(255,255,255,0.015)",
          border: "1px dashed rgba(99,179,237,0.15)", borderRadius: 12,
        }}>
          <div style={{ fontSize: 42, opacity: 0.2 }}>◳</div>
          <div style={{ color: "#94a3b8", fontWeight: 600, fontSize: 16 }}>Cash Plan Masih Kosong</div>
          <div style={{ color: "#64748b", fontSize: 13, textAlign: "center", maxWidth: 380, lineHeight: 1.7 }}>
            Buka <strong style={{ color: "#60a5fa" }}>Historis</strong>, pilih ATM,
            buka tab <strong style={{ color: "#60a5fa" }}>Data Prediksi 24 Jam</strong>,
            lalu klik <strong style={{ color: "#f59e0b" }}>+ Cash Plan</strong> pada baris
            yang proyeksi saldo-nya ≤25%.
          </div>
          <button onClick={() => navigateTo && navigateTo("history")} style={{
            background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.4)",
            borderRadius: 8, color: "#60a5fa", padding: "10px 24px",
            fontSize: 13, cursor: "pointer", fontWeight: 600,
          }}>Pergi ke Historis →</button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", color: "#64748b", padding: "60px 20px", fontSize: 13 }}>
          Tidak ada data sesuai filter.
        </div>
      ) : (
        <div style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(99,179,237,0.08)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(99,179,237,0.12)", background: "rgba(255,255,255,0.02)" }}>
                  {[
                    { label: "No",             key: null        },
                    { label: "Tanggal",        key: null        },
                    { label: "Bulan",          key: null        },
                    { label: "ID ATM",         key: "id_atm"   },
                    { label: "Lokasi ATM",     key: "lokasi"   },
                    { label: "Wilayah",        key: "wilayah"  },
                    { label: "EMV/CRM",        key: "tipe"     },
                    { label: "Denom",          key: null        },
                    { label: "Total Isi",      key: null        },
                    { label: "Lembar",         key: null        },
                    { label: "Jam Cash Out",   key: null        },
                    { label: "Jam Cash In",    key: null        },
                    { label: "Saldo Terakhir", key: "saldo"    },
                    { label: "Status",         key: "status"   },
                    { label: "Keterangan",     key: null        },
                    { label: "",               key: null        },
                  ].map((col, ci) => (
                    <th key={ci} onClick={col.key ? () => toggleSort(col.key) : undefined}
                      style={{
                        padding: "11px 12px", textAlign: "left",
                        color: col.key && sort.key === col.key ? "#60a5fa" : "#64748b",
                        fontWeight: 600, fontSize: 10, letterSpacing: "0.07em",
                        textTransform: "uppercase", cursor: col.key ? "pointer" : "default",
                        whiteSpace: "nowrap", userSelect: "none",
                      }}
                    >
                      {col.label}
                      {col.key && sort.key === col.key && (
                        <span style={{ marginLeft: 3 }}>{sort.dir > 0 ? "↑" : "↓"}</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((item, i) => {
                  const rowNo    = page * PAGE_SIZE + i + 1;
                  const denom    = getDenom(item.key);
                  const total    = jumlahIsi(item.saldo, item.limit);
                  const lembar   = total > 0 ? Math.ceil(total / denom) : 0;
                  const done     = isDone(item.key);
                  const ket      = getKet(item.key);
                  const ss       = done ? DONE_STYLE : (STATUS_STYLE[item.status] || STATUS_STYLE.AWAS);

                  const addedDt    = item.added_at ? new Date(item.added_at) : new Date();
                  const tglStr     = addedDt.toLocaleDateString("id-ID", { day:"2-digit", month:"2-digit", year:"numeric" });
                  const lastUpDt   = item.last_update ? new Date(item.last_update) : null;
                  const jamCashOut = lastUpDt ? lastUpDt.toLocaleTimeString("id-ID", { hour:"2-digit", minute:"2-digit" }) : "—";
                  const jamCashIn  = item.tgl_isi && item.jam_isi
                    ? `${item.tgl_isi} ${item.jam_isi}`
                    : item.est_waktu ? `${item.est_tanggal} ${item.est_waktu}` : "—";

                  const rowBg = done ? "rgba(0,229,160,0.025)"
                    : item.status === "BONGKAR" ? "rgba(255,59,92,0.02)" : "transparent";

                  return (
                    <tr key={item.key} style={{ background: rowBg, borderBottom: "1px solid rgba(99,179,237,0.05)", opacity: done ? 0.6 : 1, transition: "background 0.1s" }}
                      onMouseEnter={e => !done && (e.currentTarget.style.background = "rgba(59,130,246,0.04)")}
                      onMouseLeave={e => (e.currentTarget.style.background = rowBg)}
                    >
                      <td style={td("#64748b")}>{rowNo}</td>
                      <td style={td("#94a3b8")}>{tglStr}</td>
                      <td style={td("#94a3b8")}>{filterBulan}</td>

                      {/* ID ATM */}
                      <td style={{ ...td("#e2e8f0"), fontFamily: "monospace", fontWeight: 700 }}>
                        <span style={{ cursor: "pointer", textDecoration: "underline dotted" }}
                          onClick={() => navigateTo && navigateTo("history", item.id_atm)}>
                          {item.id_atm}
                        </span>
                        <div style={{ color: "#64748b", fontSize: 9, marginTop: 1 }}>+{item.jam_ke}j proyeksi</div>
                      </td>

                      <td style={{ ...td("#94a3b8"), maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.lokasi}>{item.lokasi || "—"}</td>
                      <td style={td("#94a3b8")}>{item.wilayah || "—"}</td>

                      {/* EMV/CRM */}
                      <td style={{ padding: "8px 12px" }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                          background: item.tipe === "CRM" ? "rgba(167,139,250,0.15)" : "rgba(96,165,250,0.12)",
                          color:      item.tipe === "CRM" ? "#a78bfa" : "#60a5fa",
                          border:     item.tipe === "CRM" ? "1px solid rgba(167,139,250,0.3)" : "1px solid rgba(96,165,250,0.25)",
                        }}>{item.tipe || "—"}</span>
                      </td>

                      {/* Denom per baris */}
                      <td style={{ padding: "8px 10px" }}>
                        <select value={denom} onChange={e => setOv(item.key, "denom", Number(e.target.value))}
                          style={{ background: "#0d1228", border: "1px solid rgba(167,139,250,0.25)", borderRadius: 6, color: "#a78bfa", padding: "4px 6px", fontSize: 11, cursor: "pointer", outline: "none" }}>
                          {DENOM_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                        </select>
                      </td>

                      {/* Total Isi */}
                      <td style={{ padding: "8px 12px" }}>
                        <span style={{ color: "#f59e0b", fontWeight: 600, fontSize: 12 }}>{fmtRp(total)}</span>
                        <div style={{ color: "#64748b", fontSize: 10, marginTop: 1 }}>target: {fmtRp(targetSaldo80(item.limit))}</div>
                      </td>

                      <td style={td("#94a3b8")}>{lembar > 0 ? fmtLembar(total, denom) : "—"}</td>
                      <td style={td("#94a3b8")}>{jamCashOut}</td>

                      {/* Jam Cash In */}
                      <td style={{ padding: "8px 12px" }}>
                        <span style={{ color: "#60a5fa", fontSize: 11, fontWeight: 600 }}>{jamCashIn}</span>
                        {item.tgl_awas && (
                          <div style={{ color: "#f59e0b", fontSize: 10, marginTop: 1 }}>AWAS: {item.tgl_awas} {item.jam_awas}</div>
                        )}
                      </td>

                      {/* Saldo Terakhir */}
                      <td style={{ padding: "8px 12px" }}>
                        <div style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 12 }}>{fmtRp(item.saldo)}</div>
                        <SaldoBar pct={item.pct_saldo} />
                      </td>

                      {/* Status toggle */}
                      <td style={{ padding: "8px 12px" }}>
                        <button onClick={() => setOv(item.key, "statusDone", !done)}
                          style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 5, background: ss.bg, color: ss.color, border: `1px solid ${ss.border}`, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s" }}>
                          {done ? "✓ Done" : `◎ ${item.status}`}
                        </button>
                        <div style={{ color: "#374151", fontSize: 9, marginTop: 3, textAlign: "center" }}>{done ? "klik = batalkan" : "klik = selesai"}</div>
                      </td>

                      {/* Keterangan */}
                      <td style={{ padding: "8px 10px" }}>
                        <input value={ket} onChange={e => setOv(item.key, "keterangan", e.target.value)}
                          placeholder="catatan..."
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(99,179,237,0.12)", borderRadius: 6, color: "#e2e8f0", padding: "4px 8px", fontSize: 11, width: 130, outline: "none" }}
                        />
                      </td>

                      {/* Hapus */}
                      <td style={{ padding: "8px 10px" }}>
                        <button onClick={() => onRemove && onRemove(item.key)} title="Hapus"
                          style={{ background: "transparent", border: "1px solid rgba(255,59,92,0.2)", borderRadius: 5, color: "#64748b", padding: "3px 8px", fontSize: 11, cursor: "pointer", transition: "all 0.15s" }}
                          onMouseEnter={e => { e.currentTarget.style.color="#ff3b5c"; e.currentTarget.style.borderColor="rgba(255,59,92,0.5)"; }}
                          onMouseLeave={e => { e.currentTarget.style.color="#64748b"; e.currentTarget.style.borderColor="rgba(255,59,92,0.2)"; }}>
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {maxPage > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderTop: "1px solid rgba(99,179,237,0.08)" }}>
              <span style={{ color: "#64748b", fontSize: 12 }}>Halaman {page+1} dari {maxPage} · {filtered.length} entri</span>
              <div style={{ display: "flex", gap: 6 }}>
                <PageBtn disabled={page===0}          onClick={() => setPage(p => p-1)}>← Prev</PageBtn>
                <PageBtn disabled={page>=maxPage-1}   onClick={() => setPage(p => p+1)}>Next →</PageBtn>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div style={{ display: "flex", gap: 20, marginTop: 16, flexWrap: "wrap" }}>
        {[
          { label: "BONGKAR — proyeksi ≤ 20%",              color: "#ff3b5c" },
          { label: "AWAS — proyeksi 20–25%",                color: "#f59e0b" },
          { label: "Trigger masuk: pct ≤ 25% dalam 24 jam", color: "#60a5fa" },
          { label: "Target isi = 100% dari limit ATM",        color: "#a78bfa" },
        ].map(l => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />
            <span style={{ color: "#64748b", fontSize: 11 }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SaldoBar({ pct }) {
  const color = pct <= 20 ? "#ff3b5c" : pct <= 30 ? "#f59e0b" : "#22c55e";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
      <div style={{ width: 50, height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2 }}>
        <div style={{ height: "100%", width: `${Math.min(pct||0, 100)}%`, background: color, borderRadius: 2 }} />
      </div>
      <span style={{ color, fontSize: 10, fontWeight: 700 }}>{pct?.toFixed(0)}%</span>
    </div>
  );
}

function PageBtn({ children, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: disabled ? "transparent" : "rgba(59,130,246,0.1)",
      border: "1px solid rgba(59,130,246,0.2)", borderRadius: 6,
      color: disabled ? "#374151" : "#60a5fa", padding: "5px 12px",
      fontSize: 12, cursor: disabled ? "default" : "pointer",
    }}>{children}</button>
  );
}

const selectSt = {
  background: "#0d1228", border: "1px solid rgba(99,179,237,0.15)",
  borderRadius: 8, color: "#94a3b8", padding: "8px 12px",
  fontSize: 13, cursor: "pointer", outline: "none",
};

const td = (color) => ({ padding: "8px 12px", color, whiteSpace: "nowrap" });